// ============================================================
// clientes.js — CRUD completo de Clientes
// ============================================================
// Fluxo geral:
//   - Ao carregar a página: busca e lista todos os clientes
//   - Salvar: verifica se é INSERT (novo) ou UPDATE (edição)
//   - Editar: preenche o formulário com os dados do registro
//   - Excluir: abre modal de confirmação, depois remove
//   - Buscar: filtra o array em memória (sem nova chamada ao banco)
// ============================================================


// Variável que guarda o ID do cliente sendo editado.
// null = nenhum cliente em edição (modo inserção)
// número = ID do cliente que está sendo editado
let clienteEditandoId  = null;

// Guarda o ID do cliente que será excluído (definido ao clicar em Excluir)
let clienteExcluindoId = null;

// Cache dos dados carregados do banco.
// Guardamos aqui para poder filtrar sem precisar buscar no banco a cada digitação.
let clientesCache      = [];

let sortColuna = null; // coluna atualmente ordenada (null = sem ordenação ativa)
let sortAsc    = true; // true = crescente, false = decrescente


// -------------------------------------------------------
// Inicialização
// -------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  renderizarSidebar('clientes'); // marca "Clientes" como ativo na sidebar
  carregarClientes();            // busca e exibe a lista
});


// -------------------------------------------------------
// LISTAR — busca todos os clientes no Supabase
// -------------------------------------------------------
async function carregarClientes() {
  const tbody = document.getElementById('tabela-clientes');
  tbody.innerHTML = '<tr><td colspan="5" class="tabela-vazia">Carregando...</td></tr>';

  const { data, error } = await dbClient
    .from('cliente')
    .select('*')
    .order('nome_cliente', { ascending: true }); // ordena A-Z pelo nome

  if (error) {
    tbody.innerHTML = '<tr><td colspan="5" class="tabela-vazia">Erro ao carregar clientes.</td></tr>';
    console.error('Erro:', error.message);
    return;
  }

  // Salva os dados no cache e aplica o filtro atual.
  // Se o campo de busca estiver vazio, exibe tudo.
  // Se já houver um termo digitado, o filtro é mantido após salvar/excluir.
  clientesCache = data || [];
  filtrarClientes();
}


// -------------------------------------------------------
// BUSCAR — filtra o cache pelo termo digitado
// -------------------------------------------------------
// Esta função é chamada pelo oninput do campo de busca.
// Ela não vai ao banco — filtra apenas o array já carregado em memória.
function filtrarClientes() {
  const termo = document.getElementById('busca-clientes').value.toLowerCase().trim();

  // Mostra o botão × apenas quando há texto digitado
  document.getElementById('busca-clientes-limpar').classList.toggle('visivel', termo.length > 0);

  // Se não há termo, mostra todos; senão, filtra por nome ou CPF/CNPJ
  let lista = termo
    ? clientesCache.filter(c =>
        c.nome_cliente.toLowerCase().includes(termo) ||
        (c.cpf_cnpj_cliente || '').toLowerCase().includes(termo)
      )
    : clientesCache;

  // Atualiza o contador de resultados abaixo do campo
  const resultado = document.getElementById('busca-clientes-resultado');
  resultado.textContent = termo
    ? `${lista.length} de ${clientesCache.length} resultado${lista.length !== 1 ? 's' : ''}`
    : '';

  // Ordena a lista filtrada sem modificar o cache original
  if (sortColuna) {
    lista = [...lista].sort((a, b) => {
      const va = typeof a[sortColuna] === 'string' ? a[sortColuna].toLowerCase() : a[sortColuna];
      const vb = typeof b[sortColuna] === 'string' ? b[sortColuna].toLowerCase() : b[sortColuna];
      if (va < vb) return sortAsc ? -1 : 1;
      if (va > vb) return sortAsc ? 1 : -1;
      return 0;
    });
  }

  renderizarClientes(lista, termo);
}

// Limpa o campo de busca e restaura a lista completa.
// O parâmetro "pagina" é passado pelo onclick no HTML — mesma função reutilizada em todas as páginas.
function limparBusca(pagina) {
  document.getElementById(`busca-${pagina}`).value = '';
  filtrarClientes();
}


// -------------------------------------------------------
// ORDENAR — clique no cabeçalho ordena; segundo clique inverte
// -------------------------------------------------------
function ordenarPor(coluna) {
  if (sortColuna === coluna) {
    sortAsc = !sortAsc;
  } else {
    sortColuna = coluna;
    sortAsc = true;
  }

  // Atualiza os ícones visuais nos cabeçalhos
  document.querySelectorAll('.th-ordenavel').forEach(th => {
    th.classList.remove('ativo');
    th.querySelector('.sort-icon').textContent = '↕';
  });
  const thAtivo = document.querySelector(`[data-coluna="${coluna}"]`);
  if (thAtivo) {
    thAtivo.classList.add('ativo');
    thAtivo.querySelector('.sort-icon').textContent = sortAsc ? '↑' : '↓';
  }

  filtrarClientes();
}


// Renderiza a tabela a partir de uma lista (pode ser o cache completo ou filtrado)
function renderizarClientes(lista, termo = '') {
  const tbody = document.getElementById('tabela-clientes');

  if (!lista || lista.length === 0) {
    // Mensagem diferente dependendo se há filtro ativo ou a tabela está vazia
    const msg = termo
      ? `Nenhum cliente encontrado para "${termo}".`
      : 'Nenhum cliente cadastrado.';
    tbody.innerHTML = `<tr><td colspan="5" class="tabela-vazia">${msg}</td></tr>`;
    return;
  }

  // Monta uma linha da tabela para cada cliente
  tbody.innerHTML = lista.map(cliente => `
    <tr>
      <td><span style="font-family: var(--fonte-mono); font-size:12px">${cliente.clienteid}</span></td>
      <td>${cliente.nome_cliente}</td>
      <td>${cliente.cpf_cnpj_cliente || '—'}</td>
      <td>${formatarTipo(cliente.tipo_cliente)}</td>
      <td class="td-acoes">
        <button class="btn btn-tabela-editar btn-sm" onclick="editarCliente(${cliente.clienteid})">
          Editar
        </button>
        <button class="btn btn-tabela-excluir btn-sm" onclick="abrirModalExclusao(${cliente.clienteid})">
          Excluir
        </button>
      </td>
    </tr>
  `).join('');
}


// -------------------------------------------------------
// SALVAR — decide entre INSERT e UPDATE
// -------------------------------------------------------
async function salvarCliente() {
  // Coleta os valores dos campos
  const tipo    = document.getElementById('tipo_cliente').value;
  const cpfCnpj = document.getElementById('cpf_cnpj_cliente').value.trim();
  const nome    = document.getElementById('nome_cliente').value.trim();

  // Validação — campos obrigatórios
  if (!tipo)    { mostrarToast('Selecione o tipo de cliente.', 'aviso'); return; }
  if (!cpfCnpj) { mostrarToast('Informe o CPF ou CNPJ.', 'aviso'); return; }
  if (!nome)    { mostrarToast('Informe o nome do cliente.', 'aviso'); return; }

  // Objeto com os dados a serem salvos.
  // Os nomes das propriedades devem ser IGUAIS aos nomes das colunas no banco.
  const dados = {
    tipo_cliente:     tipo,
    cpf_cnpj_cliente: cpfCnpj,
    nome_cliente:     nome
  };

  if (clienteEditandoId === null) {
    // ---- MODO INSERÇÃO ----
    // Não incluímos o clienteid — o banco gera automaticamente (auto-increment)
    await inserirCliente(dados);
  } else {
    // ---- MODO EDIÇÃO ----
    await atualizarCliente(clienteEditandoId, dados);
  }
}


// INSERT — adiciona novo cliente
async function inserirCliente(dados) {
  const { error } = await dbClient
    .from('cliente')
    .insert(dados); // .insert() adiciona um novo registro

  if (error) {
    mostrarToast('Erro ao salvar cliente.', 'erro');
    console.error('Erro:', error.message);
    return;
  }

  mostrarToast('Cliente salvo com sucesso!', 'sucesso');
  limparFormulario();
  carregarClientes(); // recarrega a tabela para mostrar o novo registro
}


// UPDATE — atualiza cliente existente
async function atualizarCliente(id, dados) {
  const { error } = await dbClient
    .from('cliente')
    .update(dados)        // .update() altera os campos informados
    .eq('clienteid', id); // WHERE clienteid = id

  if (error) {
    mostrarToast('Erro ao atualizar cliente.', 'erro');
    console.error('Erro:', error.message);
    return;
  }

  mostrarToast('Cliente atualizado com sucesso!', 'sucesso');
  limparFormulario();
  carregarClientes();
}


// -------------------------------------------------------
// EDITAR — carrega os dados no formulário
// -------------------------------------------------------
async function editarCliente(id) {
  // Busca os dados deste cliente específico no banco
  const { data, error } = await dbClient
    .from('cliente')
    .select('*')
    .eq('clienteid', id)
    .single(); // espera exatamente 1 resultado

  if (error || !data) {
    mostrarToast('Erro ao carregar cliente.', 'erro');
    return;
  }

  // Preenche os campos do formulário com os dados do cliente
  document.getElementById('clienteid').value        = data.clienteid;
  document.getElementById('tipo_cliente').value     = data.tipo_cliente;
  document.getElementById('cpf_cnpj_cliente').value = data.cpf_cnpj_cliente;
  document.getElementById('nome_cliente').value     = data.nome_cliente;

  // Marca que estamos em modo edição com este ID
  clienteEditandoId = id;

  // Atualiza o título do card para indicar edição
  document.getElementById('form-titulo').textContent = 'Editar Cliente';

  // Rola a página para o topo para o usuário ver o formulário
  window.scrollTo({ top: 0, behavior: 'smooth' });
}


// -------------------------------------------------------
// EXCLUIR — abre modal e confirma antes de remover
// -------------------------------------------------------
function abrirModalExclusao(id) {
  clienteExcluindoId = id; // guarda o ID para usar na confirmação
  document.getElementById('modal-exclusao').classList.add('visivel');
}

function fecharModal() {
  clienteExcluindoId = null;
  document.getElementById('modal-exclusao').classList.remove('visivel');
}

async function confirmarExclusao() {
  if (!clienteExcluindoId) return;

  const { error } = await dbClient
    .from('cliente')
    .delete()                             // .delete() remove o registro
    .eq('clienteid', clienteExcluindoId); // WHERE clienteid = id

  fecharModal();

  if (error) {
    mostrarToast('Erro ao excluir cliente.', 'erro');
    console.error('Erro:', error.message);
    return;
  }

  mostrarToast('Cliente excluído.', 'sucesso');
  carregarClientes(); // atualiza a tabela
}


// -------------------------------------------------------
// LIMPAR — reseta o formulário
// -------------------------------------------------------
function limparFormulario() {
  // Limpa cada campo individualmente
  document.getElementById('clienteid').value        = '';
  document.getElementById('tipo_cliente').value     = '';
  document.getElementById('cpf_cnpj_cliente').value = '';
  document.getElementById('nome_cliente').value     = '';

  // Volta para modo inserção
  clienteEditandoId = null;
  document.getElementById('form-titulo').textContent = 'Novo Cliente';
}


// -------------------------------------------------------
// Funções utilitárias
// -------------------------------------------------------

// Converte 'F'/'J' para texto legível na tabela.
// Isso é só para exibição — o banco continua guardando 'F' e 'J'.
function formatarTipo(tipo) {
  if (tipo === 'F') return 'Pessoa Física';
  if (tipo === 'J') return 'Pessoa Jurídica';
  return tipo; // retorna o valor original se for outro
}


// -------------------------------------------------------
// MÁSCARA CPF / CNPJ
// -------------------------------------------------------
// Formata o campo enquanto o usuário digita, de acordo com o tipo selecionado.
// Remove tudo que não é dígito e aplica a máscara correspondente.
function mascaraCpfCnpj() {
  const tipo  = document.getElementById('tipo_cliente').value;
  const campo = document.getElementById('cpf_cnpj_cliente');
  let v = campo.value.replace(/\D/g, ''); // mantém só números

  if (tipo === 'F') {
    // CPF: 000.000.000-00
    v = v.slice(0, 11);
    v = v.replace(/(\d{3})(\d)/, '$1.$2');
    v = v.replace(/(\d{3})(\d)/, '$1.$2');
    v = v.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  } else if (tipo === 'J') {
    // CNPJ: 00.000.000/0000-00
    v = v.slice(0, 14);
    v = v.replace(/(\d{2})(\d)/, '$1.$2');
    v = v.replace(/(\d{3})(\d)/, '$1.$2');
    v = v.replace(/(\d{3})(\d)/, '$1/$2');
    v = v.replace(/(\d{4})(\d{1,2})$/, '$1-$2');
  }

  campo.value = v;
}

// Chamada ao trocar o tipo — limpa o campo e atualiza o placeholder
function trocarTipoCliente() {
  const campo = document.getElementById('cpf_cnpj_cliente');
  const tipo  = document.getElementById('tipo_cliente').value;
  campo.value       = '';
  campo.placeholder = tipo === 'J' ? '00.000.000/0000-00' : '000.000.000-00';
}


// Exibe uma mensagem temporária no canto da tela.
// tipo: 'sucesso' | 'erro' | 'aviso'
function mostrarToast(mensagem, tipo = 'sucesso') {
  const toast = document.getElementById('toast');
  toast.textContent = mensagem;
  toast.className = `visivel ${tipo}`; // aplica as classes de estilo e visibilidade

  // Remove o toast após 3 segundos
  setTimeout(() => {
    toast.className = ''; // remove as classes, tornando invisível
  }, 3000);
}
