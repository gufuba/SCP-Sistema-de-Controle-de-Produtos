// ============================================================
// orcamentos.js — Orçamentos com cabeçalho + itens
// ============================================================
// Esta é a tela mais complexa do sistema. Tem dois níveis:
//
//   ORCAMENTO (cabeçalho)
//     └── ORCAMENTO_ITEM (itens do orçamento)
//
// Fluxo de criação:
//   1. Usuário preenche cliente e datas
//   2. Adiciona itens (produto, qtd, valor)
//   3. Total é calculado automaticamente
//   4. Clica em "Salvar Orçamento"
//   5. JS salva primeiro o cabeçalho, pega o ID gerado,
//      depois salva cada item com esse ID
// ============================================================

let orcamentoEditandoId  = null;
let orcamentoExcluindoId = null;

// Array local que guarda os itens adicionados antes de salvar.
// Só vai para o banco quando o usuário clicar em "Salvar Orçamento".
let itensOrcamento  = [];

// Cache de produtos para o select de itens — evita buscar no banco a cada adição
let produtosCache   = [];

// Cache da listagem de orçamentos — usado pelo filtro de busca
let orcamentosCache = [];

let sortColuna = null;
let sortAsc    = true;
let tsCliente  = null; // Tom Select do campo de cliente
let tsProduto  = null; // Tom Select do campo de produto (itens)


document.addEventListener('DOMContentLoaded', () => {
  renderizarSidebar('orcamentos');
  carregarClientes();
  carregarProdutos();
  preencherDatas();
  carregarOrcamentos();
});


// -------------------------------------------------------
// MODAL DE FORMULÁRIO — abre e fecha o painel sobreposto
// -------------------------------------------------------
function abrirFormulario() {
  document.getElementById('modal-formulario').classList.add('visivel');
}

function fecharFormulario() {
  document.getElementById('modal-formulario').classList.remove('visivel');
}

// Fecha o modal ao clicar no fundo escurecido (fora do painel branco)
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('modal-formulario').addEventListener('click', function (e) {
    if (e.target === this) limparFormulario();
  });
});


// -------------------------------------------------------
// Preenche os selects e datas iniciais
// -------------------------------------------------------
async function carregarClientes() {
  const select = document.getElementById('clienteid');

  const { data, error } = await dbClient
    .from('cliente')
    .select('clienteid, nome_cliente')
    .order('nome_cliente', { ascending: true });

  if (error || !data) {
    select.innerHTML = '<option value="">Erro ao carregar clientes</option>';
    return;
  }

  select.innerHTML = data.map(c =>
    `<option value="${c.clienteid}">${c.nome_cliente}</option>`
  ).join('');

  if (tsCliente) tsCliente.destroy();
  tsCliente = new TomSelect('#clienteid', {
    placeholder: 'Selecione um cliente...',
    maxOptions: 200,
    items: [],   // impede seleção automática do primeiro item na inicialização
  });
}

async function carregarProdutos() {
  const select = document.getElementById('item-produto');

  const { data, error } = await dbClient
    .from('produto')
    .select('produtoid, ds_produto, vl_venda_produto')
    .eq('status_produto', 'Ativo') // só produtos ativos aparecem no orçamento
    .order('ds_produto', { ascending: true });

  if (error || !data) {
    select.innerHTML = '<option value="">Erro ao carregar produtos</option>';
    return;
  }

  // Guarda os produtos em cache para usar nos cálculos de valor
  produtosCache = data;

  // data-valor: atributo HTML personalizado que guarda o valor no próprio elemento
  select.innerHTML = data.map(p =>
    `<option value="${p.produtoid}" data-valor="${p.vl_venda_produto}">${p.ds_produto}</option>`
  ).join('');

  if (tsProduto) tsProduto.destroy();
  tsProduto = new TomSelect('#item-produto', {
    placeholder: 'Selecione um produto...',
    maxOptions: 200,
    items: [],   // impede seleção automática do primeiro item na inicialização
    onChange: () => preencherValorUnitario(),
  });
}

function preencherDatas() {
  const hoje = new Date().toISOString().split('T')[0];

  // Data do orçamento = hoje
  document.getElementById('dt_orcamento').value = hoje;

  // Data de validade = 30 dias a partir de hoje
  const validade = new Date();
  validade.setDate(validade.getDate() + 30);
  document.getElementById('dt_validade_orcamento').value = validade.toISOString().split('T')[0];
}


// -------------------------------------------------------
// Ao selecionar produto, preenche valor unitário e descrição
// -------------------------------------------------------
function preencherValorUnitario() {
  const select = document.getElementById('item-produto');
  const option = select.options[select.selectedIndex]; // opção selecionada

  if (!option.value) {
    document.getElementById('item-vl-unitario').value = '';
    document.getElementById('item-descricao').value   = '';
    document.getElementById('item-vl-total').value    = 'R$ 0,00';
    return;
  }

  // Lê o valor do atributo data-valor que colocamos na option
  document.getElementById('item-vl-unitario').value = option.getAttribute('data-valor');
  document.getElementById('item-descricao').value   = option.textContent;

  calcularTotalItem(); // atualiza o total do item
}


// -------------------------------------------------------
// Calcula total do item (qtd × valor unitário) em tempo real
// -------------------------------------------------------
function calcularTotalItem() {
  const qtd   = parseFloat(document.getElementById('item-quantidade').value)  || 0;
  const valor = parseFloat(document.getElementById('item-vl-unitario').value) || 0;

  document.getElementById('item-vl-total').value = formatarMoeda(qtd * valor);
}


// -------------------------------------------------------
// Adiciona item ao array local e atualiza a tabela
// -------------------------------------------------------
function adicionarItem() {
  const produtoSelect = document.getElementById('item-produto');
  const produtoid     = produtoSelect.value;
  const descricao     = document.getElementById('item-descricao').value.trim();
  const qtd           = parseFloat(document.getElementById('item-quantidade').value);
  const vlUnitario    = parseFloat(document.getElementById('item-vl-unitario').value);

  // Validações
  if (!produtoid)                     { mostrarToast('Selecione um produto.', 'aviso'); return; }
  if (!descricao)                     { mostrarToast('Informe a descrição do item.', 'aviso'); return; }
  if (!qtd || qtd <= 0)               { mostrarToast('Informe uma quantidade válida.', 'aviso'); return; }
  if (!vlUnitario || vlUnitario <= 0) { mostrarToast('Informe o valor unitário.', 'aviso'); return; }

  // Adiciona o item ao array local.
  // Ainda não vai para o banco — só quando salvar o orçamento.
  itensOrcamento.push({
    produtoid:   Number(produtoid),
    produtodesc: descricao,
    qt_produto:  qtd,
    vl_unitario: vlUnitario,
    vl_total:    qtd * vlUnitario
  });

  renderizarTabelaItens(); // atualiza a tabela na tela
  limparCamposItem();      // limpa os campos de adição
  atualizarTotalGeral();   // recalcula o total do orçamento
}


// Renderiza a tabela de itens a partir do array local
function renderizarTabelaItens() {
  const tbody = document.getElementById('tabela-itens');

  if (itensOrcamento.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="tabela-vazia">Nenhum item adicionado.</td></tr>';
    return;
  }

  tbody.innerHTML = itensOrcamento.map((item, index) => `
    <tr>
      <td><span style="font-family:var(--fonte-mono);font-size:12px">${item.produtoid}</span></td>
      <td>${item.produtodesc}</td>
      <td>${item.qt_produto}</td>
      <td>${formatarMoeda(item.vl_unitario)}</td>
      <td><strong>${formatarMoeda(item.vl_total)}</strong></td>
      <td class="td-acoes">
        <!--
          Passamos o índice (index) do array para saber qual item remover.
          Em vez de um ID do banco, usamos a posição no array local.
        -->
        <button class="btn btn-tabela-excluir btn-sm" onclick="removerItem(${index})">Remover</button>
      </td>
    </tr>
  `).join('');
}


// Remove um item do array pelo índice e re-renderiza
function removerItem(index) {
  itensOrcamento.splice(index, 1); // splice remove 1 elemento na posição "index"
  renderizarTabelaItens();
  atualizarTotalGeral();
}


// Soma todos os vl_total dos itens e atualiza os campos de total
function atualizarTotalGeral() {
  // reduce: percorre o array acumulando a soma de vl_total
  const total = itensOrcamento.reduce((soma, item) => soma + item.vl_total, 0);

  document.getElementById('vl_total_orcamento').value        = formatarMoeda(total);
  document.getElementById('total-geral-display').textContent = formatarMoeda(total);
}

function limparCamposItem() {
  tsProduto.setValue('');
  document.getElementById('item-descricao').value   = '';
  document.getElementById('item-quantidade').value  = '1';
  document.getElementById('item-vl-unitario').value = '';
  document.getElementById('item-vl-total').value    = 'R$ 0,00';
}


// -------------------------------------------------------
// SALVAR ORÇAMENTO — cabeçalho + itens
// -------------------------------------------------------
async function salvarOrcamento() {
  const clienteid  = document.getElementById('clienteid').value;
  const dtOrc      = document.getElementById('dt_orcamento').value;
  const dtValidade = document.getElementById('dt_validade_orcamento').value;

  // Validações do cabeçalho
  if (!clienteid)  { mostrarToast('Selecione um cliente.', 'aviso'); return; }
  if (!dtOrc)      { mostrarToast('Informe a data do orçamento.', 'aviso'); return; }
  if (!dtValidade) { mostrarToast('Informe a data de validade.', 'aviso'); return; }

  // Validação dos itens
  if (itensOrcamento.length === 0) {
    mostrarToast('Adicione pelo menos um item ao orçamento.', 'aviso');
    return;
  }

  const totalGeral = itensOrcamento.reduce((soma, item) => soma + item.vl_total, 0);

  const cabecalho = {
    clienteid:             Number(clienteid),
    dt_orcamento:          dtOrc,
    dt_validade_orcamento: dtValidade,
    vl_total_orcamento:    totalGeral
  };

  if (orcamentoEditandoId === null) {
    await inserirOrcamento(cabecalho);
  } else {
    await atualizarOrcamento(orcamentoEditandoId, cabecalho);
  }
}

async function inserirOrcamento(cabecalho) {
  const btnSalvar = document.querySelector('[onclick="salvarOrcamento()"]');

  // Desabilita o botão durante o salvamento para evitar cliques duplos,
  // que causariam múltiplos inserts concorrentes e conflito de chave primária.
  if (btnSalvar) { btnSalvar.disabled = true; btnSalvar.textContent = 'Salvando...'; }

  const reabilitar = () => {
    if (btnSalvar) { btnSalvar.disabled = false; btnSalvar.textContent = 'Salvar Orçamento'; }
  };

  // PASSO 1: salva o cabeçalho e obtém o ID gerado pelo banco
  const { data: orcSalvo, error: errOrc } = await dbClient
    .from('orcamento')
    .insert(cabecalho)
    .select()  // .select() após insert retorna o registro inserido com o ID
    .single();

  if (errOrc || !orcSalvo) {
    mostrarToast('Erro ao salvar orçamento.', 'erro');
    console.error('Erro:', errOrc?.message);
    reabilitar();
    return;
  }

  // PASSO 2: adiciona o orcamentoid em cada item e salva todos de uma vez
  const itensBanco = itensOrcamento.map(item => ({
    ...item,              // spread: copia todas as propriedades do item
    orcamentoid: orcSalvo.orcamentoid // adiciona o ID do orçamento recém-criado
  }));

  const { error: errItens } = await dbClient
    .from('orcamento_item')
    .insert(itensBanco); // insert aceita array — salva todos de uma vez

  if (errItens) {
    mostrarToast('Orçamento salvo, mas erro nos itens.', 'aviso');
    console.error('Erro itens:', errItens.message);
    reabilitar();
    return;
  }

  mostrarToast('Orçamento salvo com sucesso!', 'sucesso');
  limparFormulario();
  carregarOrcamentos();
  reabilitar();
}

async function atualizarOrcamento(id, cabecalho) {
  // PASSO 1: atualiza o cabeçalho
  const { error: errOrc } = await dbClient
    .from('orcamento')
    .update(cabecalho)
    .eq('orcamentoid', id);

  if (errOrc) {
    mostrarToast('Erro ao atualizar orçamento.', 'erro');
    console.error('Erro:', errOrc.message);
    return;
  }

  // PASSO 2: remove os itens antigos e insere os novos.
  // Estratégia "delete + insert" é mais simples que comparar item a item.
  await dbClient.from('orcamento_item').delete().eq('orcamentoid', id);

  const itensBanco = itensOrcamento.map(item => ({ ...item, orcamentoid: id }));
  const { error: errItens } = await dbClient.from('orcamento_item').insert(itensBanco);

  if (errItens) {
    mostrarToast('Cabeçalho atualizado, mas erro nos itens.', 'aviso');
    console.error('Erro itens:', errItens.message);
    return;
  }

  mostrarToast('Orçamento atualizado com sucesso!', 'sucesso');
  limparFormulario();
  carregarOrcamentos();
}


// -------------------------------------------------------
// LISTAR orçamentos salvos
// -------------------------------------------------------
async function carregarOrcamentos() {
  const tbody = document.getElementById('tabela-orcamentos');
  tbody.innerHTML = '<tr><td colspan="6" class="tabela-vazia">Carregando...</td></tr>';

  const { data, error } = await dbClient
    .from('orcamento')
    .select(`
      orcamentoid,
      dt_orcamento,
      dt_validade_orcamento,
      vl_total_orcamento,
      cliente ( nome_cliente )
    `)
    // O select acima usa JOIN automático do Supabase:
    // como "orcamento" tem uma FK para "cliente",
    // podemos buscar dados da tabela relacionada escrevendo o nome dela.
    .order('orcamentoid', { ascending: false }); // mais recentes primeiro

  if (error) {
    tbody.innerHTML = '<tr><td colspan="6" class="tabela-vazia">Erro ao carregar orçamentos.</td></tr>';
    console.error('Erro:', error.message);
    return;
  }

  // Salva no cache e aplica o filtro de texto atual
  orcamentosCache = data || [];
  filtrarOrcamentos();
}


// -------------------------------------------------------
// BUSCAR — filtra o cache pelo termo digitado
// -------------------------------------------------------
function filtrarOrcamentos() {
  const termo = document.getElementById('busca-orcamentos').value.toLowerCase().trim();

  // Mostra o botão × apenas quando há texto digitado
  document.getElementById('busca-orcamentos-limpar').classList.toggle('visivel', termo.length > 0);

  // Busca pelo nome do cliente OU pelo número do orçamento (sem o "#")
  let lista = termo
    ? orcamentosCache.filter(orc =>
        (orc.cliente?.nome_cliente || '').toLowerCase().includes(termo) ||
        String(orc.orcamentoid).includes(termo)
      )
    : orcamentosCache;

  // Atualiza o contador de resultados abaixo do campo
  const resultado = document.getElementById('busca-orcamentos-resultado');
  resultado.textContent = termo
    ? `${lista.length} de ${orcamentosCache.length} resultado${lista.length !== 1 ? 's' : ''}`
    : '';

  if (sortColuna) {
    lista = [...lista].sort((a, b) => {
      // "cliente" é um objeto aninhado — extrai o nome para comparar
      let va = sortColuna === 'cliente' ? (a.cliente?.nome_cliente || '') : a[sortColuna];
      let vb = sortColuna === 'cliente' ? (b.cliente?.nome_cliente || '') : b[sortColuna];
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      if (va < vb) return sortAsc ? -1 : 1;
      if (va > vb) return sortAsc ? 1 : -1;
      return 0;
    });
  }

  renderizarOrcamentos(lista, termo);
}

// Limpa o campo de busca e restaura a lista completa
function limparBusca(pagina) {
  document.getElementById(`busca-${pagina}`).value = '';
  filtrarOrcamentos();
}


// -------------------------------------------------------
// ORDENAR
// -------------------------------------------------------
function ordenarPor(coluna) {
  if (sortColuna === coluna) {
    sortAsc = !sortAsc;
  } else {
    sortColuna = coluna;
    sortAsc = true;
  }

  document.querySelectorAll('.th-ordenavel').forEach(th => {
    th.classList.remove('ativo');
    th.querySelector('.sort-icon').textContent = '↕';
  });
  const thAtivo = document.querySelector(`[data-coluna="${coluna}"]`);
  if (thAtivo) {
    thAtivo.classList.add('ativo');
    thAtivo.querySelector('.sort-icon').textContent = sortAsc ? '↑' : '↓';
  }

  filtrarOrcamentos();
}


function renderizarOrcamentos(lista, termo = '') {
  const tbody = document.getElementById('tabela-orcamentos');

  if (!lista || lista.length === 0) {
    const msg = termo
      ? `Nenhum orçamento encontrado para "${termo}".`
      : 'Nenhum orçamento encontrado.';
    tbody.innerHTML = `<tr><td colspan="6" class="tabela-vazia">${msg}</td></tr>`;
    return;
  }

  tbody.innerHTML = lista.map(orc => `
    <tr>
      <td><span style="font-family:var(--fonte-mono);font-size:12px">#${orc.orcamentoid}</span></td>
      <td>${orc.cliente?.nome_cliente || '—'}</td>
      <td>${formatarData(orc.dt_orcamento)}</td>
      <td>${formatarData(orc.dt_validade_orcamento)}</td>
      <td><strong>${formatarMoeda(orc.vl_total_orcamento)}</strong></td>
      <td class="td-acoes">
        <button class="btn btn-tabela-editar btn-sm" onclick="editarOrcamento(${orc.orcamentoid})">Editar</button>
        <button class="btn btn-tabela-excluir btn-sm" onclick="abrirModalExclusao(${orc.orcamentoid})">Excluir</button>
      </td>
    </tr>
  `).join('');
}


// -------------------------------------------------------
// EDITAR — carrega cabeçalho e itens no formulário
// -------------------------------------------------------
async function editarOrcamento(id) {
  // Busca cabeçalho e itens ao mesmo tempo para não fazer duas chamadas sequenciais
  const [resOrc, resItens] = await Promise.all([
    dbClient.from('orcamento').select('*').eq('orcamentoid', id).single(),
    dbClient.from('orcamento_item').select('*').eq('orcamentoid', id)
  ]);

  if (resOrc.error || !resOrc.data) {
    mostrarToast('Erro ao carregar orçamento.', 'erro');
    return;
  }

  const orc = resOrc.data;

  // Preenche o cabeçalho
  document.getElementById('orcamentoid').value           = orc.orcamentoid;
  tsCliente.setValue(String(orc.clienteid));
  document.getElementById('dt_orcamento').value          = orc.dt_orcamento?.split('T')[0] || '';
  document.getElementById('dt_validade_orcamento').value = orc.dt_validade_orcamento?.split('T')[0] || '';

  // Carrega os itens do banco para o array local
  itensOrcamento = (resItens.data || []).map(item => ({
    produtoid:   item.produtoid,
    produtodesc: item.produtodesc,
    qt_produto:  Number(item.qt_produto),
    vl_unitario: Number(item.vl_unitario),
    vl_total:    Number(item.vl_total)
  }));

  renderizarTabelaItens();
  atualizarTotalGeral();

  orcamentoEditandoId = id;
  document.getElementById('form-titulo').textContent = 'Editar Orçamento';
  abrirFormulario();
}


// -------------------------------------------------------
// EXCLUIR
// -------------------------------------------------------
function abrirModalExclusao(id) {
  orcamentoExcluindoId = id;
  document.getElementById('modal-exclusao').classList.add('visivel');
}

function fecharModal() {
  orcamentoExcluindoId = null;
  document.getElementById('modal-exclusao').classList.remove('visivel');
}

async function confirmarExclusao() {
  if (!orcamentoExcluindoId) return;

  // Exclui os itens primeiro (FK), depois o cabeçalho
  const { error: errItens } = await dbClient
    .from('orcamento_item')
    .delete()
    .eq('orcamentoid', orcamentoExcluindoId);

  if (errItens) {
    fecharModal();
    mostrarToast('Erro ao excluir itens do orçamento.', 'erro');
    console.error('Erro itens:', errItens.message);
    return;
  }

  const { error } = await dbClient
    .from('orcamento')
    .delete()
    .eq('orcamentoid', orcamentoExcluindoId);

  fecharModal();

  if (error) {
    mostrarToast('Erro ao excluir orçamento.', 'erro');
    console.error('Erro:', error.message);
    return;
  }

  mostrarToast('Orçamento excluído.', 'sucesso');
  carregarOrcamentos();
}


// -------------------------------------------------------
// LIMPAR
// -------------------------------------------------------
function limparFormulario() {
  document.getElementById('orcamentoid').value         = '';
  tsCliente.setValue('');
  document.getElementById('vl_total_orcamento').value  = 'R$ 0,00';
  document.getElementById('total-geral-display').textContent = 'R$ 0,00';

  itensOrcamento = []; // limpa o array de itens
  renderizarTabelaItens();
  limparCamposItem();
  preencherDatas(); // restaura as datas padrão

  orcamentoEditandoId = null;
  document.getElementById('form-titulo').textContent = 'Novo Orçamento';
  fecharFormulario();
}


// -------------------------------------------------------
// UTILITÁRIOS
// -------------------------------------------------------

// Formata um número para moeda brasileira: 1500 → R$ 1.500,00
function formatarMoeda(valor) {
  if (valor === null || valor === undefined) return '—';
  return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Formata uma data ISO (2024-03-15T...) para DD/MM/AAAA
function formatarData(dataISO) {
  if (!dataISO) return '—';
  return new Date(dataISO).toLocaleDateString('pt-BR');
}

// Exibe uma mensagem temporária no canto da tela.
// tipo: 'sucesso' | 'erro' | 'aviso'
function mostrarToast(mensagem, tipo = 'sucesso') {
  const toast = document.getElementById('toast');
  toast.textContent = mensagem;
  toast.className = `visivel ${tipo}`;
  setTimeout(() => { toast.className = ''; }, 3000);
}
