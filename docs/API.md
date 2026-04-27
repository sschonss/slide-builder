# 📖 Referência da API — Slide Builder

Documentação completa da API REST do Slide Builder com exemplos `curl` prontos para uso.

**URL de Produção:** `https://slide-builder-dev.vercel.app`
**URL Local (dev):** `http://localhost:3000`

> Todos os exemplos abaixo usam `http://localhost:3000` como base. Substitua pela URL de produção conforme necessário.

---

## 🚀 Quick Start — Criando uma apresentação completa via curl

```bash
# 1. Login (modo dev — sem GitHub OAuth)
curl -s -c cookies.txt -X POST http://localhost:3000/api/auth/dev-login | jq
# → { "ok": true }

# 2. Criar uma apresentação
curl -s -b cookies.txt -X POST http://localhost:3000/api/presentations \
  -H "Content-Type: application/json" \
  -d '{"title": "Minha Palestra", "theme_id": "default"}' | jq
# → { "id": "abc123", "title": "Minha Palestra", ... }

# 3. Adicionar slide de capa (use o id retornado acima)
curl -s -b cookies.txt -X POST http://localhost:3000/api/slides \
  -H "Content-Type: application/json" \
  -d '{
    "presentation_id": "abc123",
    "template": "cover",
    "data": {"title": "Minha Palestra", "subtitle": "Uma introdução", "author": "dev-user"}
  }' | jq

# 4. Adicionar slide de conteúdo
curl -s -b cookies.txt -X POST http://localhost:3000/api/slides \
  -H "Content-Type: application/json" \
  -d '{
    "presentation_id": "abc123",
    "template": "content",
    "data": {"title": "Agenda", "bullets": ["Introdução", "Demonstração", "Perguntas"]}
  }' | jq

# 5. Adicionar slide de código
curl -s -b cookies.txt -X POST http://localhost:3000/api/slides \
  -H "Content-Type: application/json" \
  -d '{
    "presentation_id": "abc123",
    "template": "code",
    "data": {"title": "Exemplo", "code": "console.log(\"Hello World\")", "language": "javascript"}
  }' | jq

# 6. Visualizar a apresentação completa
curl -s -b cookies.txt http://localhost:3000/api/presentations/abc123 | jq

# 7. Gerar markdown da apresentação
curl -s -b cookies.txt -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -d '{"presentation_id": "abc123"}' | jq

# 8. Limpar cookies ao finalizar
rm cookies.txt
```

---

## 🔐 Autenticação

O Slide Builder usa cookies de sessão para autenticação. No modo dev, use o endpoint `dev-login` para obter um cookie automaticamente. Em produção, use o fluxo GitHub OAuth.

### `POST /api/auth/dev-login`

Login automático no modo desenvolvimento. Não requer credenciais — cria/usa um usuário `dev-user`.

**Auth:** Não requer.
**Disponível apenas em:** modo dev (`npm run dev`)

```bash
curl -s -c cookies.txt -X POST http://localhost:3000/api/auth/dev-login | jq
```

**Resposta:**
```json
{ "ok": true }
```

> O cookie de sessão é salvo em `cookies.txt`. Use `-b cookies.txt` nos requests seguintes.

---

### `POST /api/auth/logout`

Encerra a sessão do usuário.

**Auth:** Requer sessão ativa.

```bash
curl -s -b cookies.txt -X POST http://localhost:3000/api/auth/logout | jq
```

**Resposta:**
```json
{ "success": true }
```

---

### `GET /auth/github`

Redireciona para o fluxo de autenticação GitHub OAuth. Disponível apenas em produção.

```bash
# Abra no navegador (produção):
# https://slide-builder-dev.vercel.app/auth/github
```

> Este endpoint redireciona para o GitHub e depois de volta para a aplicação. Não é utilizável diretamente via curl.

---

## 📑 Presentations (Apresentações)

### `GET /api/presentations`

Lista todas as apresentações do usuário autenticado.

**Auth:** Requer sessão ativa.

```bash
curl -s -b cookies.txt http://localhost:3000/api/presentations | jq
```

**Resposta:**
```json
[
  {
    "id": "abc123",
    "title": "Minha Palestra",
    "theme_id": "default",
    "created_at": "2024-01-15T10:30:00.000Z",
    "updated_at": "2024-01-15T12:00:00.000Z",
    "slide_count": 5
  }
]
```

---

### `POST /api/presentations`

Cria uma nova apresentação.

**Auth:** Requer sessão ativa.

| Campo      | Tipo     | Obrigatório | Descrição                    |
|------------|----------|-------------|------------------------------|
| `title`    | `string` | Não         | Título da apresentação       |
| `theme_id` | `string` | Não         | ID do tema a ser utilizado   |

```bash
curl -s -b cookies.txt -X POST http://localhost:3000/api/presentations \
  -H "Content-Type: application/json" \
  -d '{"title": "Nova Apresentação", "theme_id": "default"}' | jq
```

**Resposta:**
```json
{
  "id": "abc123",
  "title": "Nova Apresentação",
  "theme_id": "default",
  "created_at": "2024-01-15T10:30:00.000Z",
  "updated_at": "2024-01-15T10:30:00.000Z"
}
```

---

### `GET /api/presentations/:id`

Retorna uma apresentação com seus slides e tema. Apresentações públicas não precisam de autenticação.

**Auth:** Opcional (obrigatório para apresentações privadas).

```bash
curl -s -b cookies.txt http://localhost:3000/api/presentations/abc123 | jq
```

**Resposta:**
```json
{
  "id": "abc123",
  "title": "Minha Palestra",
  "slides": [
    {
      "id": "slide1",
      "template": "cover",
      "data": { "title": "Minha Palestra", "subtitle": "Introdução" },
      "order": 0
    }
  ],
  "theme": {
    "id": "default",
    "name": "Default",
    "config": { "colors": {}, "fonts": {} }
  },
  "isOwner": true
}
```

---

### `PUT /api/presentations/:id`

Atualiza uma apresentação existente.

**Auth:** Requer sessão ativa + ser dono da apresentação.

| Campo        | Tipo     | Obrigatório | Descrição                               |
|--------------|----------|-------------|-----------------------------------------|
| `title`      | `string` | Não         | Novo título                             |
| `theme_id`   | `string` | Não         | Novo ID do tema                         |
| `visibility` | `string` | Não         | Visibilidade (`public` ou `private`)    |

```bash
curl -s -b cookies.txt -X PUT http://localhost:3000/api/presentations/abc123 \
  -H "Content-Type: application/json" \
  -d '{"title": "Título Atualizado", "visibility": "public"}' | jq
```

**Resposta:**
```json
{ "success": true }
```

---

### `DELETE /api/presentations/:id`

Deleta uma apresentação e todos os seus slides.

**Auth:** Requer sessão ativa + ser dono da apresentação.

```bash
curl -s -b cookies.txt -X DELETE http://localhost:3000/api/presentations/abc123 | jq
```

**Resposta:**
```json
{ "success": true }
```

---

### `POST /api/presentations/import`

Importa uma apresentação a partir de um arquivo `.slidebuilder` (formato JSON).

**Auth:** Requer sessão ativa.

```bash
curl -s -b cookies.txt -X POST http://localhost:3000/api/presentations/import \
  -H "Content-Type: application/json" \
  -d @minha-apresentacao.slidebuilder | jq
```

**Resposta:**
```json
{
  "success": true,
  "id": "xyz789",
  "title": "Apresentação Importada",
  "slide_count": 8
}
```

---

## 🎞️ Slides

### `GET /api/slides?presentation_id=X`

Lista todos os slides de uma apresentação.

**Auth:** Não requer (para apresentações públicas).

```bash
curl -s -b cookies.txt "http://localhost:3000/api/slides?presentation_id=abc123" | jq
```

**Resposta:**
```json
[
  {
    "id": "slide1",
    "presentation_id": "abc123",
    "template": "cover",
    "data": { "title": "Minha Palestra" },
    "notes": null,
    "order": 0
  }
]
```

---

### `POST /api/slides`

Cria um novo slide em uma apresentação.

**Auth:** Requer sessão ativa + ser dono da apresentação.

| Campo             | Tipo     | Obrigatório | Descrição                                                                 |
|-------------------|----------|-------------|---------------------------------------------------------------------------|
| `presentation_id` | `string` | Sim         | ID da apresentação                                                        |
| `template`        | `string` | Não         | Tipo do slide: `cover`, `section`, `content`, `diagram`, `code`, `comparison`, `bio`, `credits` |
| `data`            | `object` | Não         | Dados do slide (varia por template — veja [Estrutura dos Dados](#-estrutura-dos-dados-por-template)) |
| `notes`           | `string` | Não         | Notas do apresentador                                                     |

```bash
curl -s -b cookies.txt -X POST http://localhost:3000/api/slides \
  -H "Content-Type: application/json" \
  -d '{
    "presentation_id": "abc123",
    "template": "content",
    "data": {
      "title": "Tópicos Importantes",
      "bullets": ["Ponto 1", "Ponto 2", "Ponto 3"],
      "quote": "A simplicidade é a sofisticação suprema."
    },
    "notes": "Lembrar de dar exemplos práticos"
  }' | jq
```

**Resposta:** Retorna o slide criado com `id`, `template`, `data`, `order`, etc.

---

### `PUT /api/slides/:id`

Atualiza um slide existente.

**Auth:** Requer sessão ativa + ser dono da apresentação.

| Campo      | Tipo     | Obrigatório | Descrição              |
|------------|----------|-------------|------------------------|
| `template` | `string` | Não         | Novo tipo do slide     |
| `data`     | `object` | Não         | Novos dados do slide   |
| `notes`    | `string` | Não         | Notas do apresentador  |

```bash
curl -s -b cookies.txt -X PUT http://localhost:3000/api/slides/slide1 \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "title": "Título Atualizado",
      "bullets": ["Novo ponto 1", "Novo ponto 2"]
    }
  }' | jq
```

**Resposta:**
```json
{ "success": true }
```

---

### `DELETE /api/slides/:id`

Deleta um slide.

**Auth:** Requer sessão ativa + ser dono da apresentação.

```bash
curl -s -b cookies.txt -X DELETE http://localhost:3000/api/slides/slide1 | jq
```

**Resposta:**
```json
{ "success": true }
```

---

### `PUT /api/slides/reorder`

Reordena os slides de uma apresentação.

**Auth:** Requer sessão ativa + ser dono da apresentação.

| Campo    | Tipo    | Obrigatório | Descrição                                     |
|----------|---------|-------------|-----------------------------------------------|
| `slides` | `array` | Sim         | Array de `{ id, order }` com a nova ordenação |

```bash
curl -s -b cookies.txt -X PUT http://localhost:3000/api/slides/reorder \
  -H "Content-Type: application/json" \
  -d '{
    "slides": [
      {"id": "slide3", "order": 0},
      {"id": "slide1", "order": 1},
      {"id": "slide2", "order": 2}
    ]
  }' | jq
```

**Resposta:**
```json
{ "success": true }
```

---

## 🎨 Themes (Temas)

### `GET /api/themes`

Lista todos os temas disponíveis.

**Auth:** Não requer.

```bash
curl -s http://localhost:3000/api/themes | jq
```

**Resposta:**
```json
[
  {
    "id": "default",
    "name": "Default",
    "config": {
      "colors": {
        "background": "#1a1a2e",
        "primary": "#e94560",
        "secondary": "#0f3460",
        "text": "#ffffff"
      },
      "fonts": {
        "heading": "Inter",
        "body": "Inter",
        "code": "Fira Code"
      },
      "codeTheme": "dracula"
    }
  }
]
```

---

### `POST /api/themes`

Cria um novo tema.

**Auth:** Não requer.

| Campo    | Tipo     | Obrigatório | Descrição                    |
|----------|----------|-------------|------------------------------|
| `name`   | `string` | Sim         | Nome do tema                 |
| `config` | `object` | Sim         | Configuração do tema (veja abaixo) |

**Estrutura do `config`:**

| Campo              | Tipo     | Descrição                          |
|--------------------|----------|------------------------------------|
| `colors.background`| `string` | Cor de fundo (hex)                 |
| `colors.primary`   | `string` | Cor primária (hex)                 |
| `colors.secondary` | `string` | Cor secundária (hex)               |
| `colors.text`      | `string` | Cor do texto (hex)                 |
| `fonts.heading`    | `string` | Fonte dos títulos                  |
| `fonts.body`       | `string` | Fonte do corpo                     |
| `fonts.code`       | `string` | Fonte de código                    |
| `logo`             | `string` | URL do logo (opcional)             |
| `codeTheme`        | `string` | Tema de syntax highlighting        |

```bash
curl -s -X POST http://localhost:3000/api/themes \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Meu Tema Escuro",
    "config": {
      "colors": {
        "background": "#0d1117",
        "primary": "#58a6ff",
        "secondary": "#1f6feb",
        "text": "#c9d1d9"
      },
      "fonts": {
        "heading": "Poppins",
        "body": "Roboto",
        "code": "JetBrains Mono"
      },
      "codeTheme": "github-dark"
    }
  }' | jq
```

**Resposta:** Retorna o tema criado com `id`, `name`, `config`.

---

### `GET /api/themes/:id`

Retorna um tema específico.

**Auth:** Não requer.

```bash
curl -s http://localhost:3000/api/themes/default | jq
```

**Resposta:**
```json
{
  "id": "default",
  "name": "Default",
  "config": {
    "colors": { "background": "#1a1a2e", "primary": "#e94560", "secondary": "#0f3460", "text": "#ffffff" },
    "fonts": { "heading": "Inter", "body": "Inter", "code": "Fira Code" },
    "codeTheme": "dracula"
  }
}
```

---

### `PUT /api/themes/:id`

Atualiza um tema existente.

**Auth:** Não requer.

```bash
curl -s -X PUT http://localhost:3000/api/themes/meu-tema \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Meu Tema Atualizado",
    "config": {
      "colors": {
        "background": "#000000",
        "primary": "#00ff00",
        "secondary": "#008000",
        "text": "#ffffff"
      },
      "fonts": {
        "heading": "Fira Sans",
        "body": "Fira Sans",
        "code": "Fira Code"
      },
      "codeTheme": "monokai"
    }
  }' | jq
```

**Resposta:** Retorna o tema atualizado.

---

## 📦 Export & Generate

### `GET /api/export-bundle?id=X`

Exporta uma apresentação completa no formato `.slidebuilder` (JSON). Útil para backup e transferência entre instâncias.

**Auth:** Requer sessão ativa + ser dono da apresentação.

```bash
curl -s -b cookies.txt "http://localhost:3000/api/export-bundle?id=abc123" | jq > minha-apresentacao.slidebuilder
```

**Resposta:** Um JSON completo com a apresentação, slides e tema — pronto para reimportar com `POST /api/presentations/import`.

---

### `POST /api/generate`

Gera o conteúdo markdown da apresentação.

**Auth:** Requer sessão ativa + ser dono da apresentação.

| Campo             | Tipo     | Obrigatório | Descrição           |
|-------------------|----------|-------------|---------------------|
| `presentation_id` | `string` | Sim         | ID da apresentação  |

```bash
curl -s -b cookies.txt -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -d '{"presentation_id": "abc123"}' | jq
```

**Resposta:**
```json
{
  "success": true,
  "markdown": "# Minha Palestra\n\n---\n\n## Slide 1\n..."
}
```

---

## 👤 Users (Usuários)

### `GET /api/users/:username`

Retorna o perfil público de um usuário.

**Auth:** Não requer.

```bash
curl -s http://localhost:3000/api/users/sschonss | jq
```

**Resposta:**
```json
{
  "id": "user123",
  "username": "sschonss",
  "name": "Luiz Schons",
  "avatar_url": "https://avatars.githubusercontent.com/u/...",
  "created_at": "2024-01-01T00:00:00.000Z"
}
```

---

### `GET /api/users/:username/presentations`

Lista as apresentações públicas de um usuário.

**Auth:** Não requer.

```bash
curl -s http://localhost:3000/api/users/sschonss/presentations | jq
```

**Resposta:**
```json
[
  {
    "id": "abc123",
    "title": "Minha Palestra",
    "theme_id": "default",
    "created_at": "2024-01-15T10:30:00.000Z",
    "slide_count": 5
  }
]
```

---

### `GET /api/users/search?q=X`

Busca usuários por username ou nome. Mínimo de 2 caracteres.

**Auth:** Não requer.

```bash
curl -s "http://localhost:3000/api/users/search?q=luiz" | jq
```

**Resposta:**
```json
[
  {
    "id": "user123",
    "username": "sschonss",
    "name": "Luiz Schons",
    "avatar_url": "https://avatars.githubusercontent.com/u/..."
  }
]
```

---

## 💚 Health

### `GET /api/health`

Verifica se a API está funcionando.

**Auth:** Não requer.

```bash
curl -s http://localhost:3000/api/health | jq
```

**Resposta:**
```json
{ "status": "ok" }
```

---

## 🔄 Sync (Presenter)

Endpoints para sincronizar o estado entre o presenter view e a visualização da audiência.

### `GET /api/sync/:id`

Retorna o estado de sincronização de uma apresentação.

**Auth:** Não requer.

```bash
curl -s http://localhost:3000/api/sync/abc123 | jq
```

**Resposta:**
```json
{
  "slideIndex": 2,
  "zoomLevel": 100,
  "updatedAt": "2024-01-15T12:30:00.000Z"
}
```

---

### `POST /api/sync/:id`

Atualiza o estado de sincronização (usado pelo presenter para controlar a visualização da audiência).

**Auth:** Requer sessão ativa + ser dono da apresentação.

| Campo        | Tipo     | Obrigatório | Descrição                    |
|--------------|----------|-------------|------------------------------|
| `slideIndex` | `number` | Não         | Índice do slide atual        |
| `zoomLevel`  | `number` | Não         | Nível de zoom                |

```bash
curl -s -b cookies.txt -X POST http://localhost:3000/api/sync/abc123 \
  -H "Content-Type: application/json" \
  -d '{"slideIndex": 3, "zoomLevel": 100}' | jq
```

**Resposta:**
```json
{ "success": true }
```

---

## 📐 Estrutura dos Dados por Template

Cada template de slide possui uma estrutura de dados (`data`) específica:

### `cover` — Slide de capa

```json
{
  "title": "Título da Apresentação",
  "subtitle": "Subtítulo opcional",
  "author": "Nome do autor"
}
```

```bash
curl -s -b cookies.txt -X POST http://localhost:3000/api/slides \
  -H "Content-Type: application/json" \
  -d '{
    "presentation_id": "abc123",
    "template": "cover",
    "data": {"title": "Arquitetura de Microsserviços", "subtitle": "Do monolito à nuvem", "author": "Luiz Schons"}
  }' | jq
```

---

### `section` — Divisor de seção

```json
{
  "title": "Nome da Seção",
  "section_number": 1
}
```

```bash
curl -s -b cookies.txt -X POST http://localhost:3000/api/slides \
  -H "Content-Type: application/json" \
  -d '{
    "presentation_id": "abc123",
    "template": "section",
    "data": {"title": "Parte 1: Fundamentos", "section_number": 1}
  }' | jq
```

---

### `content` — Slide de conteúdo com bullets

```json
{
  "title": "Título do Slide",
  "bullets": ["Ponto 1", "Ponto 2", "Ponto 3"],
  "quote": "Citação opcional"
}
```

```bash
curl -s -b cookies.txt -X POST http://localhost:3000/api/slides \
  -H "Content-Type: application/json" \
  -d '{
    "presentation_id": "abc123",
    "template": "content",
    "data": {
      "title": "Por que Microsserviços?",
      "bullets": ["Escalabilidade independente", "Deploy isolado", "Resiliência"],
      "quote": "Dividir para conquistar"
    }
  }' | jq
```

---

### `diagram` — Diagrama (Mermaid, Excalidraw, imagem ou embed)

```json
{
  "title": "Título do Diagrama",
  "diagram_type": "mermaid",
  "mermaid_code": "graph TD\n  A[Cliente] --> B[API Gateway]\n  B --> C[Serviço A]\n  B --> D[Serviço B]",
  "excalidraw_svg": null,
  "caption": "Legenda opcional"
}
```

Tipos suportados: `mermaid`, `excalidraw`, `image`, `embed`.

```bash
curl -s -b cookies.txt -X POST http://localhost:3000/api/slides \
  -H "Content-Type: application/json" \
  -d '{
    "presentation_id": "abc123",
    "template": "diagram",
    "data": {
      "title": "Arquitetura do Sistema",
      "diagram_type": "mermaid",
      "mermaid_code": "graph TD\n  A[Cliente] --> B[API Gateway]\n  B --> C[Auth Service]\n  B --> D[User Service]",
      "caption": "Visão geral da arquitetura"
    }
  }' | jq
```

---

### `code` — Slide de código

```json
{
  "title": "Título do Código",
  "code": "const hello = () => console.log('Hello!');",
  "language": "javascript",
  "note": "Nota explicativa opcional"
}
```

```bash
curl -s -b cookies.txt -X POST http://localhost:3000/api/slides \
  -H "Content-Type: application/json" \
  -d '{
    "presentation_id": "abc123",
    "template": "code",
    "data": {
      "title": "Exemplo de API",
      "code": "app.get(\"/api/users\", async (req, res) => {\n  const users = await db.query(\"SELECT * FROM users\");\n  res.json(users);\n});",
      "language": "typescript",
      "note": "Express.js com async/await"
    }
  }' | jq
```

---

### `comparison` — Slide comparativo

```json
{
  "title": "Título da Comparação",
  "left_title": "Lado Esquerdo",
  "left_items": ["Item 1", "Item 2"],
  "right_title": "Lado Direito",
  "right_items": ["Item A", "Item B"]
}
```

```bash
curl -s -b cookies.txt -X POST http://localhost:3000/api/slides \
  -H "Content-Type: application/json" \
  -d '{
    "presentation_id": "abc123",
    "template": "comparison",
    "data": {
      "title": "Monolito vs Microsserviços",
      "left_title": "Monolito",
      "left_items": ["Deploy único", "Código acoplado", "Escala vertical"],
      "right_title": "Microsserviços",
      "right_items": ["Deploy independente", "Código desacoplado", "Escala horizontal"]
    }
  }' | jq
```

---

### `bio` — Slide de biografia

```json
{
  "title": "Sobre o Autor",
  "bullets": ["Desenvolvedor Full Stack", "Open Source Enthusiast"],
  "photo_url": "https://example.com/foto.jpg",
  "github_username": "sschonss"
}
```

```bash
curl -s -b cookies.txt -X POST http://localhost:3000/api/slides \
  -H "Content-Type: application/json" \
  -d '{
    "presentation_id": "abc123",
    "template": "bio",
    "data": {
      "title": "Quem sou eu",
      "bullets": ["Desenvolvedor Full Stack", "Contribuidor Open Source", "Entusiasta de DevOps"],
      "photo_url": "https://avatars.githubusercontent.com/u/12345",
      "github_username": "sschonss"
    }
  }' | jq
```

---

### `credits` — Slide de créditos

```json
{
  "message": "Obrigado!",
  "repo_url": "https://github.com/sschonss/slide-builder"
}
```

```bash
curl -s -b cookies.txt -X POST http://localhost:3000/api/slides \
  -H "Content-Type: application/json" \
  -d '{
    "presentation_id": "abc123",
    "template": "credits",
    "data": {
      "message": "Obrigado! Perguntas?",
      "repo_url": "https://github.com/sschonss/slide-builder"
    }
  }' | jq
```

---

## 💡 Dicas

- **Cookies:** Sempre use `-c cookies.txt` no login e `-b cookies.txt` nos requests seguintes.
- **jq:** Use `| jq` para formatar a saída JSON. Instale com `brew install jq` (macOS) ou `apt install jq` (Linux).
- **IDs:** Os IDs retornados pela API são strings geradas automaticamente. Guarde-os para usar nos endpoints seguintes.
- **Ordem dos slides:** Novos slides são adicionados ao final. Use `PUT /api/slides/reorder` para reorganizar.
- **Produção vs Dev:** Em produção, substitua `http://localhost:3000` por `https://slide-builder-dev.vercel.app` e use GitHub OAuth ao invés de `dev-login`.
