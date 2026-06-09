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
 
## Uso de Inteligência Artificial
 
Este projeto foi desenvolvido com auxílio do **Claude (Anthropic)**, como parte do aprendizado sobre o uso responsável de IA no desenvolvimento de software — tema abordado no curso.
 
A IA foi utilizada como ferramenta de apoio nas seguintes etapas:
 
- **Geração de código** — estrutura inicial das telas, funções de CRUD e integração com o Supabase
- **Correção de erros** — identificação e resolução de bugs
- **Explicação de conceitos** — cada trecho de código foi comentado e explicado para garantir o entendimento
- **Análise de design** — sugestões de melhorias visuais e de usabilidade

Todo o código foi revisado, compreendido e adaptado. Conforme orientação do curso, o uso de IA não substitui o entendimento.
 
---

## Autor

Desenvolvido por **Gustavo Fumagalli**
