// ============================================================
// categorias.js — CRUD de Categorias de Produto
// ============================================================
// Estrutura igual ao clientes.js — a lógica é a mesma,
// só muda a tabela e os campos.
// ============================================================

let categoriaEditandoId  = null;
let categoriaExcluindoId = null;

// Cache dos dados carregados do banco.
// Guardamos aqui para poder filtrar sem precisar buscar no banco a cada digitação.
let categoriasCache      = [];


document.addEventListener('DOMContentLoaded', () => {
  renderizarSidebar('categorias');
  carregarCategorias();
});


// -------------------------------------------------------
// LISTAR
// -------------------------------------------------------
async function carregarCategorias() {
  const tbody = document.getElementById('tabela-categorias');
  tbody.innerHTML = '<tr><td colspan="3" class="tabela-vazia">Carregando...</td></tr>';

  const { data, error } = await dbClient
    .from('categoria_produto')
    .select('*')
    .order('ds_categoria_produto', { ascending: true });

  if (error) {
    tbody.innerHTML = '<tr><td colspan="3" class="tabela-vazia">Erro ao carregar categorias.</td></tr>';
    console.error('Erro:', error.message);
    return;
  }

  // Salva no cache e aplica o filtro atual (mantém busca ativa após salvar/excluir)
  categoriasCache = data || [];
  filtrarCategorias();
}


// -------------------------------------------------------
// BUSCAR — filtra o cache pelo termo digitado
// -------------------------------------------------------
function filtrarCategorias() {
  const termo = document.getElementById('busca-categorias').value.toLowerCase().trim();

  // Mostra o botão × apenas quando há texto digitado
  document.getElementById('busca-categorias-limpar').classList.toggle('visivel', termo.length > 0);

  // Categorias têm apenas um campo de texto — filtra só pela descrição
  const lista = termo
    ? categoriasCache.filter(c =>
        c.ds_categoria_produto.toLowerCase().includes(termo)
      )
    : categoriasCache;

  // Atualiza o contador de resultados abaixo do campo
  const resultado = document.getElementById('busca-categorias-resultado');
  resultado.textContent = termo
    ? `${lista.length} de ${categoriasCache.length} resultado${lista.length !== 1 ? 's' : ''}`
    : '';

  renderizarCategorias(lista, termo);
}

// Limpa o campo de busca e restaura a lista completa
function limparBusca(pagina) {
  document.getElementById(`busca-${pagina}`).value = '';
  filtrarCategorias();
}


function renderizarCategorias(lista, termo = '') {
  const tbody = document.getElementById('tabela-categorias');

  if (!lista || lista.length === 0) {
    const msg = termo
      ? `Nenhuma categoria encontrada para "${termo}".`
      : 'Nenhuma categoria cadastrada.';
    tbody.innerHTML = `<tr><td colspan="3" class="tabela-vazia">${msg}</td></tr>`;
    return;
  }

  tbody.innerHTML = lista.map(cat => `
    <tr>
      <td><span style="font-family: var(--fonte-mono); font-size:12px">${cat.categoriaprodutoid}</span></td>
      <td>${cat.ds_categoria_produto}</td>
      <td class="td-acoes">
        <button class="btn btn-tabela-editar btn-sm" onclick="editarCategoria(${cat.categoriaprodutoid})">Editar</button>
        <button class="btn btn-tabela-excluir btn-sm" onclick="abrirModalExclusao(${cat.categoriaprodutoid})">Excluir</button>
      </td>
    </tr>
  `).join('');
}


// -------------------------------------------------------
// SALVAR — INSERT ou UPDATE
// -------------------------------------------------------
async function salvarCategoria() {
  const descricao = document.getElementById('ds_categoria_produto').value.trim();

  if (!descricao) {
    mostrarToast('Informe a descrição da categoria.', 'aviso');
    return;
  }

  const dados = { ds_categoria_produto: descricao };

  if (categoriaEditandoId === null) {
    await inserirCategoria(dados);
  } else {
    await atualizarCategoria(categoriaEditandoId, dados);
  }
}

async function inserirCategoria(dados) {
  const { error } = await dbClient
    .from('categoria_produto')
    .insert(dados);

  if (error) {
    mostrarToast('Erro ao salvar categoria.', 'erro');
    console.error('Erro:', error.message);
    return;
  }

  mostrarToast('Categoria salva com sucesso!', 'sucesso');
  limparFormulario();
  carregarCategorias();
}

async function atualizarCategoria(id, dados) {
  const { error } = await dbClient
    .from('categoria_produto')
    .update(dados)
    .eq('categoriaprodutoid', id);

  if (error) {
    mostrarToast('Erro ao atualizar categoria.', 'erro');
    console.error('Erro:', error.message);
    return;
  }

  mostrarToast('Categoria atualizada com sucesso!', 'sucesso');
  limparFormulario();
  carregarCategorias();
}


// -------------------------------------------------------
// EDITAR
// -------------------------------------------------------
async function editarCategoria(id) {
  const { data, error } = await dbClient
    .from('categoria_produto')
    .select('*')
    .eq('categoriaprodutoid', id)
    .single();

  if (error || !data) {
    mostrarToast('Erro ao carregar categoria.', 'erro');
    return;
  }

  document.getElementById('categoriaprodutoid').value   = data.categoriaprodutoid;
  document.getElementById('ds_categoria_produto').value = data.ds_categoria_produto;

  categoriaEditandoId = id;
  document.getElementById('form-titulo').textContent = 'Editar Categoria';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}


// -------------------------------------------------------
// EXCLUIR
// -------------------------------------------------------
function abrirModalExclusao(id) {
  categoriaExcluindoId = id;
  document.getElementById('modal-exclusao').classList.add('visivel');
}

function fecharModal() {
  categoriaExcluindoId = null;
  document.getElementById('modal-exclusao').classList.remove('visivel');
}

async function confirmarExclusao() {
  if (!categoriaExcluindoId) return;

  const { error } = await dbClient
    .from('categoria_produto')
    .delete()
    .eq('categoriaprodutoid', categoriaExcluindoId);

  fecharModal();

  if (error) {
    mostrarToast('Erro ao excluir categoria.', 'erro');
    console.error('Erro:', error.message);
    return;
  }

  mostrarToast('Categoria excluída.', 'sucesso');
  carregarCategorias();
}


// -------------------------------------------------------
// LIMPAR
// -------------------------------------------------------
function limparFormulario() {
  document.getElementById('categoriaprodutoid').value   = '';
  document.getElementById('ds_categoria_produto').value = '';
  categoriaEditandoId = null;
  document.getElementById('form-titulo').textContent = 'Nova Categoria';
}


// -------------------------------------------------------
// UTILITÁRIOS
// -------------------------------------------------------

// Exibe uma mensagem temporária no canto da tela.
// tipo: 'sucesso' | 'erro' | 'aviso'
function mostrarToast(mensagem, tipo = 'sucesso') {
  const toast = document.getElementById('toast');
  toast.textContent = mensagem;
  toast.className = `visivel ${tipo}`;
  setTimeout(() => { toast.className = ''; }, 3000);
}
