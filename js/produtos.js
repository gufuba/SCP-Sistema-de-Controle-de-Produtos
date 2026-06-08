// ============================================================
// produtos.js — CRUD de Produtos
// ============================================================
// Novidade em relação às outras telas:
//   - O select de categorias é preenchido dinamicamente do banco
//   - Tem filtro por status na listagem
//   - A data de cadastro é preenchida automaticamente com hoje
// ============================================================

let produtoEditandoId  = null;
let produtoExcluindoId = null;

document.addEventListener('DOMContentLoaded', () => {
  renderizarSidebar('produtos');
  carregarCategorias();  // preenche o select de categorias
  preencherDataHoje();   // coloca a data atual no campo de data
  carregarProdutos();    // lista os produtos
});

// -------------------------------------------------------
// Preenche o select de categorias com dados do banco
// -------------------------------------------------------
async function carregarCategorias() {
  const select = document.getElementById('categoriaprodutoid');

  const { data, error } = await dbClient
    .from('categoria_produto')
    .select('categoriaprodutoid, ds_categoria_produto')
    .order('ds_categoria_produto', { ascending: true });

  if (error || !data) {
    select.innerHTML = '<option value="">Erro ao carregar categorias</option>';
    return;
  }

  // Monta as options dinamicamente a partir dos dados do banco
  // Assim se uma nova categoria for criada, ela aparece aqui automaticamente
  select.innerHTML = '<option value="">Selecione uma categoria...</option>' +
    data.map(cat =>
      `<option value="${cat.categoriaprodutoid}">${cat.ds_categoria_produto}</option>`
    ).join('');
}

// Preenche o campo data com a data de hoje no formato YYYY-MM-DD
// que é o formato que o input type="date" espera
function preencherDataHoje() {
  const hoje = new Date().toISOString().split('T')[0]; // "2024-03-15"
  document.getElementById('dt_cadastro_produto').value = hoje;
}

// -------------------------------------------------------
// LISTAR — com filtro opcional por status
// -------------------------------------------------------
async function carregarProdutos() {
  const tbody       = document.getElementById('tabela-produtos');
  const filtroStatus = document.getElementById('filtro-status').value;

  tbody.innerHTML = '<tr><td colspan="6" class="tabela-vazia">Carregando...</td></tr>';

  // Monta a query base com JOIN na categoria
  // O select abaixo busca todos os campos do produto +
  // a descrição da categoria relacionada
  let query = dbClient
    .from('produto')
    .select(`
      produtoid,
      ds_produto,
      vl_venda_produto,
      dt_cadastro_produto,
      status_produto,
      obs_produto,
      categoriaprodutoid,
      categoria_produto ( ds_categoria_produto )
    `)
    .order('ds_produto', { ascending: true });

  // Aplica o filtro de status somente se um valor foi selecionado
  if (filtroStatus) {
    query = query.eq('status_produto', filtroStatus);
  }

  const { data, error } = await query;

  if (error) {
    tbody.innerHTML = '<tr><td colspan="6" class="tabela-vazia">Erro ao carregar produtos.</td></tr>';
    console.error('Erro:', error.message);
    return;
  }

  if (!data || data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="tabela-vazia">Nenhum produto encontrado.</td></tr>';
    return;
  }

  tbody.innerHTML = data.map(prod => `
    <tr>
      <td><span style="font-family: var(--fonte-mono); font-size:12px">${prod.produtoid}</span></td>
      <td>${prod.categoria_produto?.ds_categoria_produto || '—'}</td>
      <td>${prod.ds_produto}</td>
      <td>${formatarMoeda(prod.vl_venda_produto)}</td>
      <td>
        <span class="badge ${prod.status_produto === 'Ativo' ? 'badge-ativo' : 'badge-inativo'}">
          ${prod.status_produto}
        </span>
      </td>
      <td class="td-acoes">
        <button class="btn btn-aviso btn-sm" onclick="editarProduto(${prod.produtoid})">Editar</button>
        <button class="btn btn-perigo btn-sm" onclick="abrirModalExclusao(${prod.produtoid})">Excluir</button>
      </td>
    </tr>
  `).join('');
}

// -------------------------------------------------------
// SALVAR
// -------------------------------------------------------
async function salvarProduto() {
  const categoriaId = document.getElementById('categoriaprodutoid').value;
  const descricao   = document.getElementById('ds_produto').value.trim();
  const valor       = document.getElementById('vl_venda_produto').value;
  const data        = document.getElementById('dt_cadastro_produto').value;
  const status      = document.getElementById('status_produto').value;
  const obs         = document.getElementById('obs_produto').value.trim();

  // Validações — todos os campos obrigatórios
  if (!categoriaId) { mostrarToast('Selecione a categoria.', 'aviso'); return; }
  if (!descricao)   { mostrarToast('Informe a descrição do produto.', 'aviso'); return; }
  if (!valor || Number(valor) <= 0) { mostrarToast('Informe um valor de venda válido.', 'aviso'); return; }
  if (!data)        { mostrarToast('Informe a data de cadastro.', 'aviso'); return; }
  if (!status)      { mostrarToast('Selecione o status.', 'aviso'); return; }

  const dados = {
    categoriaprodutoid:  Number(categoriaId), // converte para número (FK)
    ds_produto:          descricao,
    vl_venda_produto:    Number(valor),
    dt_cadastro_produto: data,
    status_produto:      status,
    obs_produto:         obs || null         // campo opcional — null se vazio
  };

  if (produtoEditandoId === null) {
    await inserirProduto(dados);
  } else {
    await atualizarProduto(produtoEditandoId, dados);
  }
}

async function inserirProduto(dados) {
  const { error } = await dbClient.from('produto').insert(dados);

  if (error) {
    mostrarToast('Erro ao salvar produto.', 'erro');
    console.error('Erro:', error.message);
    return;
  }

  mostrarToast('Produto salvo com sucesso!', 'sucesso');
  limparFormulario();
  carregarProdutos();
}

async function atualizarProduto(id, dados) {
  const { error } = await dbClient
    .from('produto')
    .update(dados)
    .eq('produtoid', id);

  if (error) {
    mostrarToast('Erro ao atualizar produto.', 'erro');
    console.error('Erro:', error.message);
    return;
  }

  mostrarToast('Produto atualizado com sucesso!', 'sucesso');
  limparFormulario();
  carregarProdutos();
}

// -------------------------------------------------------
// EDITAR
// -------------------------------------------------------
async function editarProduto(id) {
  const { data, error } = await dbClient
    .from('produto')
    .select('*')
    .eq('produtoid', id)
    .single();

  if (error || !data) {
    mostrarToast('Erro ao carregar produto.', 'erro');
    return;
  }

  document.getElementById('produtoid').value            = data.produtoid;
  document.getElementById('categoriaprodutoid').value   = data.categoriaprodutoid;
  document.getElementById('ds_produto').value           = data.ds_produto;
  document.getElementById('vl_venda_produto').value     = data.vl_venda_produto;
  // Formata a data para YYYY-MM-DD que o input type="date" aceita
  document.getElementById('dt_cadastro_produto').value  = data.dt_cadastro_produto?.split('T')[0] || '';
  document.getElementById('status_produto').value       = data.status_produto;
  document.getElementById('obs_produto').value          = data.obs_produto || '';

  produtoEditandoId = id;
  document.getElementById('form-titulo').textContent = 'Editar Produto';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// -------------------------------------------------------
// EXCLUIR
// -------------------------------------------------------
function abrirModalExclusao(id) {
  produtoExcluindoId = id;
  document.getElementById('modal-exclusao').classList.add('visivel');
}

function fecharModal() {
  produtoExcluindoId = null;
  document.getElementById('modal-exclusao').classList.remove('visivel');
}

async function confirmarExclusao() {
  if (!produtoExcluindoId) return;

  const { error } = await dbClient
    .from('produto')
    .delete()
    .eq('produtoid', produtoExcluindoId);

  fecharModal();

  if (error) {
    mostrarToast('Erro ao excluir produto.', 'erro');
    console.error('Erro:', error.message);
    return;
  }

  mostrarToast('Produto excluído.', 'sucesso');
  carregarProdutos();
}

// -------------------------------------------------------
// LIMPAR
// -------------------------------------------------------
function limparFormulario() {
  document.getElementById('produtoid').value           = '';
  document.getElementById('categoriaprodutoid').value  = '';
  document.getElementById('ds_produto').value          = '';
  document.getElementById('vl_venda_produto').value    = '';
  document.getElementById('status_produto').value      = '';
  document.getElementById('obs_produto').value         = '';
  preencherDataHoje(); // volta a data para hoje
  produtoEditandoId = null;
  document.getElementById('form-titulo').textContent = 'Novo Produto';
}

// -------------------------------------------------------
// UTILITÁRIOS
// -------------------------------------------------------
function formatarMoeda(valor) {
  if (valor === null || valor === undefined) return '—';
  return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function mostrarToast(mensagem, tipo = 'sucesso') {
  const toast = document.getElementById('toast');
  toast.textContent = mensagem;
  toast.className = `visivel ${tipo}`;
  setTimeout(() => { toast.className = ''; }, 3000);
}