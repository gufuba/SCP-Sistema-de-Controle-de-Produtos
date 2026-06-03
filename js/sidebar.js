// ============================================================
// sidebar.js — Componente da sidebar reutilizável
// ============================================================
// Em vez de copiar o HTML da sidebar em cada página (o que seria
// difícil de manter — mudar em 5 lugares), criamos ela via JS
// e injetamos na página. Assim qualquer mudança na sidebar
// afeta todos os arquivos automaticamente.
//
// Como usar em uma página:
//   1. Inclua este script no HTML
//   2. Chame: renderizarSidebar('clientes')  ← nome da página ativa
// ============================================================


function renderizarSidebar(paginaAtiva) {

    // Links da navegação — cada item tem:
    // id: usado para marcar o item como ativo
    // href: página de destino
    // label: texto exibido
    // icon: SVG inline (ícone simples)
    const itens = [
        {
            id: 'home',
            href: 'home.html',
            label: 'Dashboard',
            icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
               <rect x="3" y="3" width="7" height="7" rx="1"/>
               <rect x="14" y="3" width="7" height="7" rx="1"/>
               <rect x="3" y="14" width="7" height="7" rx="1"/>
               <rect x="14" y="14" width="7" height="7" rx="1"/>
             </svg>`
        },
        {
            id: 'clientes',
            href: 'clientes.html',
            label: 'Clientes',
            icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
               <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
               <circle cx="9" cy="7" r="4"/>
               <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
               <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
             </svg>`
        },
        {
            id: 'categorias',
            href: 'categorias.html',
            label: 'Categorias',
            icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
               <path d="M4 6h16M4 10h16M4 14h8M4 18h8"/>
             </svg>`
        },
        {
            id: 'produtos',
            href: 'produtos.html',
            label: 'Produtos',
            icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
               <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
               <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
               <line x1="12" y1="22.08" x2="12" y2="12"/>
             </svg>`
        },
        {
            id: 'orcamentos',
            href: 'orcamentos.html',
            label: 'Orçamentos',
            icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
               <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
               <polyline points="14 2 14 8 20 8"/>
               <line x1="16" y1="13" x2="8" y2="13"/>
               <line x1="16" y1="17" x2="8" y2="17"/>
               <polyline points="10 9 9 9 8 9"/>
             </svg>`
        }
    ];

    // Pegamos o nome do usuário logado do sessionStorage
    // Se não existir (acessou direto sem login), redireciona
    const nomeUsuario = sessionStorage.getItem('usuario_logado');
    if (!nomeUsuario) {
        window.location.href = 'index.html';
        return;
    }

    // Montamos o HTML da sidebar como string
    // Template literals (crase ``) permitem HTML multilinha e interpolação com ${}
    const html = `
    <aside class="sidebar">

      <div class="sidebar-logo">
        <span>SCP</span>
        <small>Controle de Produtos</small>
      </div>

      <nav class="sidebar-nav">
        <div class="sidebar-section-label">Menu</div>

        ${itens.map(item => `
          <a href="${item.href}" class="${paginaAtiva === item.id ? 'ativo' : ''}">
            ${item.icon}
            ${item.label}
          </a>
        `).join('')}
        <!-- .map() percorre o array e cria um link para cada item -->
        <!-- .join('') une os itens sem vírgulas entre eles -->
      </nav>

      <div class="sidebar-footer">
        <!-- Exibe o nome do usuário logado -->
        <div style="padding: 0 4px 10px; font-size:12px; color: var(--cor-sidebar-text);">
          Olá, <strong style="color:#CBD8E1">${nomeUsuario}</strong>
        </div>

        <button class="btn-sair" onclick="sair()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Sair
        </button>
      </div>

    </aside>
  `;

    // Inserimos a sidebar no elemento com id="sidebar-container"
    // que existe em cada página HTML
    document.getElementById('sidebar-container').innerHTML = html;
}


// Função de logout — limpa a sessão e volta para o login
function sair() {
    sessionStorage.clear(); // remove todos os dados da sessão
    window.location.href = 'index.html';
}