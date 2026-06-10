// ============================================================
// home.js — Lógica do Dashboard
// ============================================================
// Busca contagens de cada tabela no Supabase e preenche os cards.
// Também busca os últimos 5 orçamentos para exibir na tabela.
// ============================================================


// DOMContentLoaded: espera o HTML ser carregado antes de executar
document.addEventListener('DOMContentLoaded', () => {

  // Renderiza a sidebar marcando "home" como página ativa
  renderizarSidebar('home');

  // Carrega todos os dados do dashboard
  carregarDashboard();
});


async function carregarDashboard() {
  // Rodamos todas as consultas ao mesmo tempo com Promise.all
  // Em vez de esperar uma terminar para começar a próxima (lento),
  // todas rodam em paralelo (rápido).
  const [clientes, produtos, categorias, orcamentos] = await Promise.all([
    contarRegistros('cliente'),
    contarRegistrosFiltrados('produto', 'status_produto', 'Ativo'),
    contarRegistros('categoria_produto'),
    contarRegistros('orcamento')
  ]);

  // Atualiza os cards com os valores recebidos
  document.getElementById('total-clientes').textContent    = clientes;
  document.getElementById('total-produtos').textContent    = produtos;
  document.getElementById('total-categorias').textContent  = categorias;
  document.getElementById('total-orcamentos').textContent  = orcamentos;

  // Carrega os últimos orçamentos
  carregarUltimosOrcamentos();
}


// Conta todos os registros de uma tabela
// count: 'exact' pede ao Supabase o total real de registros
async function contarRegistros(tabela) {
  const { count, error } = await dbClient
    .from(tabela)
    .select('*', { count: 'exact', head: true });
  // head: true → não retorna os dados, só a contagem (mais eficiente)

  if (error) {
    console.error(`Erro ao contar ${tabela}:`, error.message);
    return '!';
  }
  return count ?? 0;
}


// Conta registros com um filtro (ex: apenas produtos Ativos)
async function contarRegistrosFiltrados(tabela, coluna, valor) {
  const { count, error } = await dbClient
    .from(tabela)
    .select('*', { count: 'exact', head: true })
    .eq(coluna, valor); // filtra pela coluna/valor informados

  if (error) {
    console.error(`Erro ao contar ${tabela}:`, error.message);
    return '!';
  }
  return count ?? 0;
}


// Busca os últimos 5 orçamentos com o nome do cliente
async function carregarUltimosOrcamentos() {
  const tbody = document.getElementById('tabela-orcamentos-recentes');

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
    .order('orcamentoid', { ascending: false }) // mais recentes primeiro
    .limit(5); // apenas os 5 últimos

  if (error || !data || data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="tabela-vazia">Nenhum orçamento encontrado.</td></tr>';
    return;
  }

  // Monta as linhas da tabela
  tbody.innerHTML = data.map(orc => `
    <tr>
      <td><span style="font-family: var(--fonte-mono); font-size:12px">#${orc.orcamentoid}</span></td>
      <td>${orc.cliente?.nome_cliente || '—'}</td>
      <td>${formatarData(orc.dt_orcamento)}</td>
      <td>${formatarData(orc.dt_validade_orcamento)}</td>
      <td><strong>${formatarMoeda(orc.vl_total_orcamento)}</strong></td>
    </tr>
  `).join('');
}
