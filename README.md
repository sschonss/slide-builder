# Slide Builder

Crie apresentações profissionais direto no browser com temas customizáveis, export PDF e apresentação em tempo real.

🌐 **Demo:** [slide-builder-dev.vercel.app](https://slide-builder-dev.vercel.app)

## ✨ Features

- 🎨 **Editor visual** com 8 templates de slide (Cover, Section, Content, Code, Diagram, Comparison, Bio, Credits)
- 🖌️ **Temas customizáveis** — cores, fontes e tema de código
- 📊 **Diagramas Mermaid** renderizados em tempo real
- 🎬 **Modo apresentação** com presenter view (timer, notas, próximo slide)
- 📤 **Export PDF** client-side (funciona em qualquer hosting)
- 📦 **Import/Export** formato `.slidebuilder` para backup e compartilhamento
- 🔐 **Autenticação** via GitHub OAuth
- 👤 **Perfis públicos** em `/u/username` com apresentações públicas
- 🔍 **Explorar** — busque usuários e descubra apresentações
- 📖 **API REST** documentada para integrações — [ver referência completa](docs/API.md)
- 🔄 **Changelog** estilo git com rollback por slide

## 🛠️ Tech Stack

- **Frontend:** Nuxt 4, Vue 3, TypeScript
- **Backend:** Nitro (API routes)
- **Database:** Turso (LibSQL over HTTP)
- **Auth:** nuxt-auth-utils + GitHub OAuth
- **Deploy:** Vercel (serverless)
- **PDF:** html2canvas-pro + jsPDF (client-side)
- **Diagramas:** Mermaid.js

## 🚀 Rodando localmente

### Quick Start (modo dev)

No modo dev, **não é necessário configurar Turso ou GitHub OAuth** — tudo funciona automaticamente:

- 🗄️ **Banco de dados:** SQLite local (`dev.db`) é usado automaticamente
- 🔐 **Autenticação:** Auto-login como `dev-user` (sem GitHub OAuth)

```bash
# Clone o repositório
git clone https://github.com/sschonss/slide-builder.git
cd slide-builder

# Instale e rode
npm install
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000) — pronto!

### Configuração para Produção

Para deploy em produção, configure as variáveis de ambiente:

```bash
cp .env.example .env
```

#### `.env`

```bash
# Turso Database
NUXT_TURSO_URL=libsql://seu-db.turso.io
NUXT_TURSO_TOKEN=seu-token-turso

# GitHub OAuth (crie em https://github.com/settings/developers)
NUXT_OAUTH_GITHUB_CLIENT_ID=seu-client-id
NUXT_OAUTH_GITHUB_CLIENT_SECRET=seu-client-secret

# Session (qualquer string com 32+ caracteres)
NUXT_SESSION_PASSWORD=sua-senha-de-sessao-com-32-chars
```

#### Criando o GitHub OAuth App

1. Vá em [github.com/settings/developers](https://github.com/settings/developers)
2. **New OAuth App**
3. **Homepage URL:** `http://localhost:3000`
4. **Callback URL:** `http://localhost:3000/auth/github`
5. Copie o Client ID e gere um Client Secret

#### Criando o banco Turso

```bash
# Instale o CLI do Turso
curl -sSfL https://get.tur.so/install.sh | bash

# Login e crie o banco
turso auth login
turso db create slide-builder
turso db show slide-builder --url    # copie para NUXT_TURSO_URL
turso db tokens create slide-builder # copie para NUXT_TURSO_TOKEN
```

## 📁 Estrutura do Projeto

```
slide-builder/
├── components/
│   ├── AppHeader.vue          # Header global
│   ├── AppFooter.vue          # Footer com link do GitHub
│   ├── SavingIndicator.vue    # Barra de progresso global
│   ├── ThemeEditor.vue        # Editor de temas
│   └── editor/                # Componentes do editor
│       ├── EditorToolbar.vue
│       ├── SlideList.vue
│       ├── SlidePreview.vue
│       └── SlideProperties.vue
├── composables/
│   ├── useAuth.ts             # Autenticação
│   ├── useSaving.ts           # Estado de loading global
│   └── useExportPdf.ts        # Export PDF client-side
├── pages/
│   ├── index.vue              # Landing page
│   ├── dashboard.vue          # Minhas apresentações
│   ├── explore.vue            # Buscar usuários
│   ├── docs.vue               # Documentação + API
│   ├── editor/[id].vue        # Editor de slides
│   ├── present/[id].vue       # Apresentação (audiência)
│   ├── presenter/[id].vue     # Presenter view
│   └── u/[username].vue       # Perfil público
├── server/
│   ├── api/                   # Endpoints REST
│   ├── routes/auth/           # OAuth callback
│   └── utils/                 # DB, auth, ownership
└── types/                     # TypeScript types
```

## 🤝 Contribuindo

1. Fork o repositório
2. Crie sua branch: `git checkout -b feat/minha-feature`
3. Commit suas mudanças: `git commit -m 'feat: minha feature'`
4. Push: `git push origin feat/minha-feature`
5. Abra um Pull Request

## 📄 Licença

MIT © [Luiz Schons](https://github.com/sschonss)
