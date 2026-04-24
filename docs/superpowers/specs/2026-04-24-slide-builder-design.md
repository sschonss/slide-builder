# Slide Builder — Design Spec

> App pessoal para criar apresentações padronizadas com branding consistente.

## Visão Geral

Web app local (Nuxt 3) com editor visual baseado em templates que gera apresentações no formato Slidev. O usuário seleciona um template de slide, preenche os campos (texto, imagens, código, diagramas), e o app gera automaticamente um `slides.md` compatível com Slidev para preview, apresentação e exportação PDF.

**Público:** Uso pessoal (Luiz Schons) — sem auth, sem multi-tenancy.

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | Nuxt 3 + Vue 3 (SPA) |
| Storage | SQLite via `better-sqlite3` |
| Assets | Sistema de arquivos local (`./assets/`) |
| Rendering | Slidev CLI (dev server + export) |
| Code Editor | Monaco Editor ou CodeMirror |

## Arquitetura

```
┌─────────────────────────────────────┐
│         Nuxt 3 App (SPA)            │
│                                     │
│  ┌──────────┐    ┌───────────────┐  │
│  │  Editor   │───▶│ Gerador .md   │  │
│  │  (Vue UI) │    │ (Slidev fmt)  │  │
│  └──────────┘    └──────┬────────┘  │
│       │                 │           │
│       ▼                 ▼           │
│  ┌──────────┐    ┌───────────────┐  │
│  │  SQLite   │    │ Slidev Preview│  │
│  │(metadata) │    │  (iframe)     │  │
│  └──────────┘    └───────────────┘  │
│       │                 │           │
│       ▼                 ▼           │
│  ┌──────────┐    ┌───────────────┐  │
│  │  Assets   │    │  PDF Export   │  │
│  │ (local fs)│    │ (Slidev CLI)  │  │
│  └──────────┘    └───────────────┘  │
└─────────────────────────────────────┘
```

**Fluxo principal:**
1. Usuário cria/edita slides no editor visual
2. Editor salva metadata no SQLite e regenera `slides.md` (formato Slidev)
3. Slidev dev server roda em background, hot-reloads no iframe de preview
4. Para apresentar: abre Slidev em fullscreen (nova aba)
5. Para exportar: roda `slidev export` → PDF

**Vantagem:** O `.md` gerado é Slidev padrão — funciona standalone sem o app.

## Templates de Slide

6 templates fixos que cobrem ~90% das necessidades de uma talk técnica:

### 1. Cover
Slide de abertura com título, subtítulo, autor, data e logo.

**Campos:**
- `title` (string) — título principal
- `subtitle` (string) — subtítulo
- `author` (string) — autor e data
- `logo` (file upload, opcional)
- `background_image` (file upload, opcional)

### 2. Section Divider
Separador de blocos/seções com número e título.

**Campos:**
- `section_number` (string, opcional) — ex: "BLOCO 3"
- `title` (string) — nome da seção
- `accent_color` (color picker, usa primary do tema por padrão)

### 3. Content
O slide "workhorse" — título + bullets + quote opcional.

**Campos:**
- `title` (string)
- `bullets` (array de strings) — lista de pontos
- `quote` (string, opcional) — citação em destaque
- `image` (file upload, opcional) — imagem lateral ou de fundo

### 4. Diagram
Título + diagrama centralizado (Mermaid, imagem ou embed).

**Campos:**
- `title` (string)
- `diagram_type` ("mermaid" | "image" | "embed")
- `mermaid_code` (string) — código Mermaid (se type=mermaid)
- `image` (file upload) — imagem do diagrama (se type=image)
- `embed_url` (string) — URL do embed (se type=embed)
- `caption` (string, opcional)

### 5. Code
Bloco de código com syntax highlighting + nota opcional.

**Campos:**
- `title` (string)
- `code` (string) — código fonte
- `language` (string) — linguagem para syntax highlight
- `note` (string, opcional) — nota explicativa abaixo do código
- `highlight_lines` (string, opcional) — linhas a destacar, ex: "1,3-5"

### 6. Comparison
Dois lados — vs, prós/contras, antes/depois.

**Campos:**
- `title` (string)
- `left_title` (string)
- `left_items` (array de strings)
- `right_title` (string)
- `right_items` (array de strings)
- `style` ("columns" | "table") — como renderizar

### Campos comuns a todos os templates
- `notes` (string, opcional) — speaker notes
- `transition` (string, opcional) — override da transição padrão

## Editor UI

Layout de 3 painéis:

### Sidebar Esquerda — Lista de Slides
- Thumbnails dos slides com tipo de template e título
- Drag-and-drop para reordenar
- Botão "+" para adicionar novo slide (abre seletor de template)
- Click para selecionar e editar
- Indicador visual do template (cor/ícone)

### Painel Central — Preview
- Preview live do slide atual renderizado
- Toolbar superior:
  - **▶ Apresentar** — abre Slidev fullscreen em nova aba
  - **📄 Exportar PDF** — gera PDF via Slidev CLI
  - **🎨 Tema** — abre configuração de tema
  - **⚙️ Settings** — configurações da apresentação
- Navegação entre slides (← / →)
- Indicador "Slide N / Total"

### Painel Direito — Propriedades
- Seletor de template (dropdown)
- Campos dinâmicos conforme o template selecionado
- Upload drag-and-drop para imagens/assets
- Editor de código (Monaco/CodeMirror) para blocos de código e Mermaid
- Campo de speaker notes

## Sistema de Tema (Branding)

Arquivo `theme.json` local que define o visual padrão de todas as apresentações.

### Configurações do tema:
- **Cores:** background, primary, secondary, text
- **Fontes:** título (ex: Inter Bold), corpo (ex: Inter Regular), código (ex: JetBrains Mono)
- **Logo:** arquivo padrão que aparece nos slides cover
- **Code theme:** tema de syntax highlight (ex: GitHub Dark, Dracula)

### Variações:
- Possibilidade de criar múltiplos temas (ex: "dark", "light", "conference")
- Trocar tema da apresentação inteira com um clique
- Override por slide individual quando necessário

### Armazenamento:
```json
{
  "name": "dark",
  "colors": {
    "background": "#1a1a2e",
    "primary": "#e94560",
    "secondary": "#533483",
    "text": "#ffffff"
  },
  "fonts": {
    "heading": "Inter",
    "body": "Inter",
    "code": "JetBrains Mono"
  },
  "logo": "./assets/branding/logo.svg",
  "codeTheme": "github-dark"
}
```

## Modelo de Dados (SQLite)

### Tabela `presentations`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | TEXT (UUID) PK | Identificador único |
| title | TEXT NOT NULL | Título da apresentação |
| theme_id | TEXT FK | Referência ao tema |
| created_at | DATETIME | Data de criação |
| updated_at | DATETIME | Última atualização |

### Tabela `slides`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | TEXT (UUID) PK | Identificador único |
| presentation_id | TEXT FK | Referência à apresentação |
| order | INTEGER | Posição do slide na sequência |
| template | TEXT | Tipo: cover, section, content, diagram, code, comparison |
| data | TEXT (JSON) | Campos do template em JSON |
| notes | TEXT | Speaker notes |

### Tabela `themes`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | TEXT (UUID) PK | Identificador único |
| name | TEXT NOT NULL | Nome do tema |
| config | TEXT (JSON) | Configuração completa em JSON |

### Tabela `assets`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | TEXT (UUID) PK | Identificador único |
| presentation_id | TEXT FK | Referência à apresentação |
| filename | TEXT | Nome original do arquivo |
| path | TEXT | Caminho local no filesystem |
| type | TEXT | Tipo: image, video, logo |

## Handling de Conteúdo Especial

| Conteúdo | No Editor | No Slidev (.md) |
|----------|-----------|-----------------|
| Texto/Bullets | Campos de texto simples | Markdown bullets (`- item`) |
| Imagens | Upload drag-and-drop → `./assets/` | `![](./assets/img.png)` |
| Código | Editor Monaco/CodeMirror com preview | Fenced code block (` ```lang ... ``` `) |
| Mermaid | Editor de texto + preview live do diagrama | ` ```mermaid ... ``` ` |
| Embeds | Input de URL (YouTube, iframe) | `<iframe src="...">` |
| Speaker Notes | Campo de texto separado no painel | Slidev comment format |

## Geração do Markdown

O gerador transforma os dados do SQLite em Slidev markdown:

1. **Frontmatter:** Gera YAML com theme, title, transitions baseado no tema ativo
2. **Por slide:** Mapeia template → layout Slidev + conteúdo markdown
3. **Assets:** Copia referências de imagens com caminhos relativos
4. **Hot reload:** Slidev dev server detecta mudanças no .md automaticamente

### Mapeamento Template → Slidev Layout

| Template | Slidev Layout | Observação |
|----------|--------------|------------|
| cover | `layout: cover` | Usa frontmatter do primeiro slide |
| section | `layout: section` | Título grande centralizado |
| content | `layout: default` | Bullets com `<v-click>` opcional |
| diagram | `layout: center` | Mermaid ou imagem centralizada |
| code | `layout: default` | Code block com highlight |
| comparison | `layout: two-cols` | Usa `::left::` e `::right::` |

## Estrutura de Diretórios do Projeto

```
slide-builder/
├── nuxt.config.ts
├── package.json
├── app.vue
├── pages/
│   ├── index.vue              # Lista de apresentações
│   └── editor/[id].vue        # Editor da apresentação
├── components/
│   ├── editor/
│   │   ├── SlideList.vue       # Sidebar esquerda
│   │   ├── SlidePreview.vue    # Preview central
│   │   ├── SlideProperties.vue # Painel direito
│   │   └── TemplateSelector.vue
│   ├── templates/
│   │   ├── CoverFields.vue     # Campos do template Cover
│   │   ├── SectionFields.vue
│   │   ├── ContentFields.vue
│   │   ├── DiagramFields.vue
│   │   ├── CodeFields.vue
│   │   └── ComparisonFields.vue
│   └── theme/
│       └── ThemeEditor.vue     # Editor de tema
├── composables/
│   ├── usePresentation.ts      # CRUD de apresentações
│   ├── useSlides.ts            # CRUD de slides
│   ├── useTheme.ts             # Gerenciamento de temas
│   └── useMarkdownGenerator.ts # Gerador de .md
├── server/
│   ├── api/
│   │   ├── presentations/      # REST API
│   │   ├── slides/
│   │   ├── themes/
│   │   ├── assets/
│   │   └── export.post.ts      # Trigger export PDF
│   ├── utils/
│   │   ├── db.ts               # SQLite connection
│   │   └── slidev.ts           # Slidev process manager
│   └── plugins/
│       └── migrations.ts       # Auto-run DB migrations
├── data/
│   ├── database.sqlite         # SQLite database
│   └── assets/                 # Uploaded files
└── output/                     # Generated .md + PDFs
    └── [presentation-id]/
        ├── slides.md
        ├── assets/             # Copied assets
        └── export.pdf
```

## Funcionalidades Fora de Escopo (v1)

- Autenticação / multi-user
- Colaboração em tempo real
- Histórico de versões / undo-redo avançado
- Animações custom além do que Slidev oferece
- Deploy em cloud / hosting
- Import de apresentações existentes (.pptx, .key)
- AI-powered content generation
