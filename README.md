# SCP — Sistema de Controle de Produtos e Orçamentos

Sistema web comercial desenvolvido como projeto final do curso **Saber TI**.

---

## Sobre o projeto

O SCP é uma aplicação web para gerenciamento de clientes, produtos e orçamentos. Desenvolvido com HTML, CSS e JavaScript puro, sem frameworks, utilizando o Supabase como banco de dados em nuvem.

---

## Funcionalidades

- **Login** com validação de usuário e senha
- **Dashboard** com totais em tempo real e últimos orçamentos
- **Clientes** — cadastro completo com suporte a Pessoa Física e Jurídica
- **Categorias** — organização dos produtos por categoria
- **Produtos** — cadastro com categoria, valor, status e filtro por situação
- **Orçamentos** — criação com itens, cálculo automático de totais e histórico

Todas as telas possuem CRUD completo (inserir, listar, editar e excluir) com validações e confirmação antes de excluir.

---

## Tecnologias utilizadas

- HTML5
- CSS3 (variáveis CSS, Grid, Flexbox)
- JavaScript ES6+ (async/await, módulos)
- [Supabase](https://supabase.com) — banco de dados PostgreSQL em nuvem
- Fonte: [DM Sans + DM Mono](https://fonts.google.com) via Google Fonts

---

## Estrutura de arquivos

```
scp/
├── index.html          # Tela de login
├── home.html           # Dashboard
├── clientes.html
├── categorias.html
├── produtos.html
├── orcamentos.html
├── css/
│   └── style.css       # Estilos globais
└── js/
    ├── supabase.js     # Configuração da conexão
    ├── sidebar.js      # Componente de navegação reutilizável
    ├── login.js
    ├── home.js
    ├── clientes.js
    ├── categorias.js
    ├── produtos.js
    └── orcamentos.js
```

---

## Como executar localmente

**Pré-requisitos:**
- [VS Code](https://code.visualstudio.com)
- Extensão [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) instalada no VS Code

**Passos:**

1. Clone o repositório:
```bash
git clone https://github.com/gufuba/SCP-Sistema-de-Controle-de-Produtos.git
```

2. Abra a pasta no VS Code

3. Clique com o botão direito no `index.html` → **Open with Live Server**

4. Acesse `http://127.0.0.1:5500/index.html` no navegador

> Não é necessário instalar Node.js, npm ou qualquer dependência. A biblioteca do Supabase é carregada via CDN.

---

## Acesso para demonstração

Para testar o sistema:

| Campo | Valor |
|-------|-------|
| Usuário | ADMIN |
| Senha | A |

> Este usuário tem acesso completo ao ambiente de demonstração. Os dados podem ser alterados por qualquer visitante.

---

## Autor

Desenvolvido por **Gustavo Fumagalli**
