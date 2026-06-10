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

  // Gráficos usam a mesma fonte do resto do sistema
  Chart.defaults.font.family = "'DM Sans', sans-serif";

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

  // Carrega os últimos orçamentos e os gráficos
  carregarUltimosOrcamentos();
  carregarGraficoMeses();
  carregarGraficoProdutos();
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


// -------------------------------------------------------
// GRÁFICOS — Chart.js
// -------------------------------------------------------
// Os dados são buscados no banco e agrupados aqui no JS.
// Como os gráficos consultam o banco a cada carregamento da
// página, eles se atualizam sozinhos conforme novos orçamentos
// são criados.

// Gráfico 1 — Valor total orçado por mês (últimos 6 meses)
async function carregarGraficoMeses() {
  const { data, error } = await dbClient
    .from('orcamento')
    .select('dt_orcamento, vl_total_orcamento');

  if (error || !data) {
    console.error('Erro ao carregar dados do gráfico:', error?.message);
    return;
  }

  // 1. Monta o "esqueleto" dos últimos 6 meses, todos zerados.
  //    Sem isso, meses sem orçamento sumiriam do gráfico e a
  //    linha do tempo ficaria enganosa (pulando meses).
  const meses = [];
  const hoje = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
    meses.push({
      // chave no formato "2026-06" — igual ao início de dt_orcamento
      chave: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      // rótulo exibido no eixo: "jun/26"
      rotulo: d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
      total: 0
    });
  }

  // 2. Soma cada orçamento no mês correspondente.
  //    slice(0,7) pega "2026-06" de "2026-06-10" — comparar como
  //    texto evita problemas de fuso horário do new Date().
  data.forEach(orc => {
    const chave = (orc.dt_orcamento || '').slice(0, 7);
    const mes = meses.find(m => m.chave === chave);
    if (mes) mes.total += Number(orc.vl_total_orcamento) || 0;
  });

  // 3. Desenha o gráfico de barras
  new Chart(document.getElementById('grafico-meses'), {
    type: 'bar',
    data: {
      labels: meses.map(m => m.rotulo),
      datasets: [{
        data: meses.map(m => m.total),
        backgroundColor: 'rgba(58,123,213,0.75)', // --cor-primaria com transparência
        borderRadius: 6,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false, // preenche a altura do .grafico-container
      plugins: {
        legend: { display: false }, // um dataset só — legenda é redundante
        tooltip: {
          callbacks: {
            // mostra o valor formatado em reais ao passar o mouse
            label: ctx => formatarMoeda(ctx.parsed.y)
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            // eixo compacto: 2500 vira "R$ 2,5 mil"
            callback: valor => Intl.NumberFormat('pt-BR', {
              style: 'currency', currency: 'BRL', notation: 'compact'
            }).format(valor)
          }
        }
      }
    }
  });
}


// Gráfico 2 — Top 5 produtos com maior valor total em orçamentos
async function carregarGraficoProdutos() {
  const { data, error } = await dbClient
    .from('orcamento_item')
    .select('produtodesc, vl_total');

  if (error || !data) {
    console.error('Erro ao carregar dados do gráfico:', error?.message);
    return;
  }

  // Agrupa por descrição do produto somando os valores.
  // O objeto "somas" funciona como um mapa: { "Notebook": 5000, ... }
  const somas = {};
  data.forEach(item => {
    somas[item.produtodesc] = (somas[item.produtodesc] || 0) + (Number(item.vl_total) || 0);
  });

  // Object.entries transforma o mapa em pares [nome, total],
  // que ordenamos do maior para o menor e cortamos no top 5
  const top5 = Object.entries(somas)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  new Chart(document.getElementById('grafico-produtos'), {
    type: 'bar',
    data: {
      labels: top5.map(p => p[0]),
      datasets: [{
        data: top5.map(p => p[1]),
        backgroundColor: 'rgba(39,174,96,0.75)', // --cor-sucesso com transparência
        borderRadius: 6,
      }]
    },
    options: {
      indexAxis: 'y', // barras horizontais — nomes de produto leem melhor assim
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => formatarMoeda(ctx.parsed.x)
          }
        }
      },
      scales: {
        x: {
          beginAtZero: true,
          ticks: {
            callback: valor => Intl.NumberFormat('pt-BR', {
              style: 'currency', currency: 'BRL', notation: 'compact'
            }).format(valor)
          }
        }
      }
    }
  });
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
