// ============================================================
// login.js — Lógica da tela de login
// ============================================================
// Este arquivo depende de supabase.js (carregado antes no HTML).
// A variável "supabase" já está disponível quando este código roda.
// ============================================================


// Permitir login ao pressionar Enter no campo de senha
// "DOMContentLoaded" garante que o HTML foi carregado antes de
// tentarmos buscar o elemento pelo id.
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('senha').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') fazerLogin();
  });
  document.getElementById('usuario').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') fazerLogin();
  });
});


// Função principal de login
// "async" indica que essa função tem operações assíncronas (como
// consultas ao banco), que usam "await" para esperar a resposta.
async function fazerLogin() {
  // Pegamos os valores digitados nos campos, removendo espaços extras
  const usuario = document.getElementById('usuario').value.trim();
  const senha   = document.getElementById('senha').value.trim();

  // Validação básica — campos vazios
  if (!usuario || !senha) {
    mostrarErro('Preencha o usuário e a senha.');
    return; // interrompe a função aqui
  }

  // Desabilita o botão durante a consulta para evitar cliques duplos
  const btn = document.querySelector('.btn-primario');
  btn.textContent = 'Entrando...';
  btn.disabled = true;

  // -------------------------------------------------------
  // Consulta ao Supabase
  // -------------------------------------------------------
  // .from('usuarios')     → tabela que vamos consultar
  // .select('*')          → queremos todas as colunas
  // .eq('usuario', ...)   → WHERE usuario = '...'
  // .eq('senha', ...)     → AND senha = '...'
  // .single()             → esperamos no máximo 1 resultado
  // -------------------------------------------------------
  const { data, error } = await dbClient
    .from('usuarios')
    .select('*')
    .eq('usuario', usuario)
    .eq('senha', senha)
    .single();

  // Reabilita o botão independente do resultado
  btn.textContent = 'Entrar';
  btn.disabled = false;

  if (error || !data) {
    // Nenhum usuário encontrado com esses dados
    mostrarErro('Usuário ou senha incorretos.');
    return;
  }

  // Login bem-sucedido!
  // Salvamos o nome do usuário no sessionStorage para exibir na sidebar.
  // sessionStorage dura enquanto o navegador estiver aberto (diferente do
  // localStorage que persiste mesmo após fechar o navegador).
  sessionStorage.setItem('usuario_logado', data.nome_completo || data.usuario);
  sessionStorage.setItem('usuario_id', data.id);

  // Redireciona para o dashboard (home.html)
  window.location.href = 'home.html';
}


// Função auxiliar para exibir a mensagem de erro
function mostrarErro(mensagem) {
  const el = document.getElementById('msgErro');
  el.textContent = mensagem;
  el.style.display = 'block'; // torna visível (estava display:none no CSS)
}