// ============================================================
// utils.js — Funções utilitárias compartilhadas
// ============================================================
// Antes, funções como mostrarToast e formatarMoeda estavam
// copiadas em cada arquivo JS. Centralizar aqui evita duplicação:
// qualquer ajuste vale para todas as páginas de uma vez.
// ============================================================


// -------------------------------------------------------
// ORDENAÇÃO DE TABELAS
// -------------------------------------------------------

// Estado da ordenação — compartilhado porque cada página tem uma tabela só
let sortColuna = null; // coluna atualmente ordenada (null = sem ordenação)
let sortAsc    = true; // true = crescente, false = decrescente

// Cada página registra aqui sua função de filtro (filtrarClientes,
// filtrarProdutos...). Assim ordenarPor e limparBusca sabem qual
// função chamar sem precisar conhecer a página atual.
let aoFiltrar = null;

function registrarFiltro(fn) {
  aoFiltrar = fn;
}

// Clique no cabeçalho ordena; segundo clique na mesma coluna inverte
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

  if (aoFiltrar) aoFiltrar();
}

// Aplica a ordenação atual a uma lista, SEM modificar a original.
// extrairValor: função opcional (item, coluna) => valor, usada quando
// a coluna não é um campo direto do objeto (ex: cliente.nome_cliente
// dentro de orçamento). Se não for passada, lê o campo diretamente.
function ordenarLista(lista, extrairValor) {
  if (!sortColuna) return lista;

  const pegar = extrairValor || ((item, coluna) => item[coluna]);

  return [...lista].sort((a, b) => {
    let va = pegar(a, sortColuna);
    let vb = pegar(b, sortColuna);
    // Strings são comparadas sem diferenciar maiúsculas/minúsculas
    if (typeof va === 'string') va = va.toLowerCase();
    if (typeof vb === 'string') vb = vb.toLowerCase();
    if (va < vb) return sortAsc ? -1 : 1;
    if (va > vb) return sortAsc ? 1 : -1;
    return 0;
  });
}


// -------------------------------------------------------
// BUSCA
// -------------------------------------------------------

// Limpa o campo de busca da página e reaplica o filtro.
// O parâmetro "pagina" é passado pelo onclick no HTML (ex: 'clientes').
function limparBusca(pagina) {
  document.getElementById(`busca-${pagina}`).value = '';
  if (aoFiltrar) aoFiltrar();
}


// -------------------------------------------------------
// FORMATAÇÃO
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


// -------------------------------------------------------
// TOAST DE NOTIFICAÇÃO
// -------------------------------------------------------

// Exibe uma mensagem temporária no canto da tela.
// tipo: 'sucesso' | 'erro' | 'aviso'
function mostrarToast(mensagem, tipo = 'sucesso') {
  const toast = document.getElementById('toast');
  toast.textContent = mensagem;
  toast.className = `visivel ${tipo}`; // aplica as classes de estilo e visibilidade

  // Remove o toast após 3 segundos
  setTimeout(() => { toast.className = ''; }, 3000);
}
