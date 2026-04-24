<script setup lang="ts">
import { BookOpen, Code2, Presentation, Image, Download, Users, Key } from 'lucide-vue-next'
</script>

<template>
  <div class="docs">
    <div class="docs-header">
      <h1><BookOpen :size="28" /> Documentação</h1>
      <p class="subtitle">Aprenda a usar o Slide Builder e integre via API</p>
    </div>

    <nav class="toc">
      <a href="#como-usar">Como Usar</a>
      <a href="#api">API Reference</a>
    </nav>

    <!-- COMO USAR -->
    <section id="como-usar">
      <h2><Presentation :size="22" /> Como Usar</h2>

      <div class="card">
        <h3>1. Crie sua conta</h3>
        <p>Clique em <strong>"Entrar com GitHub"</strong> no header. Você será redirecionado para o GitHub para autorizar o acesso. Após login, será levado ao seu dashboard.</p>
      </div>

      <div class="card">
        <h3>2. Crie uma apresentação</h3>
        <p>No <strong>Dashboard</strong>, clique em <strong>"Nova"</strong> e dê um nome. Você será redirecionado ao editor.</p>
      </div>

      <div class="card">
        <h3>3. Edite os slides</h3>
        <p>O editor tem 3 painéis:</p>
        <ul>
          <li><strong>Esquerda:</strong> lista de slides — adicione, delete ou reordene</li>
          <li><strong>Centro:</strong> preview do slide atual</li>
          <li><strong>Direita:</strong> propriedades — edite título, conteúdo, código, imagens e notas</li>
        </ul>
        <p>Templates disponíveis: <code>Cover</code>, <code>Section</code>, <code>Content</code>, <code>Code</code>, <code>Diagram</code>, <code>Comparison</code>.</p>
      </div>

      <div class="card">
        <h3>4. Personalize o tema</h3>
        <p>Clique em <strong>"Tema"</strong> na toolbar para customizar cores, fontes e tema de código.</p>
      </div>

      <div class="card">
        <h3>5. Apresente</h3>
        <p>Clique em <strong>"Apresentar"</strong> para abrir duas janelas:</p>
        <ul>
          <li><strong>Presenter view:</strong> slide atual, próximo, timer e notas</li>
          <li><strong>Audience view:</strong> slide em tela cheia para projetar</li>
        </ul>
        <p>As janelas sincronizam automaticamente via BroadcastChannel.</p>
      </div>

      <div class="card">
        <h3>6. Exporte e compartilhe</h3>
        <ul>
          <li><strong>Salvar:</strong> salva as modificações do slide atual</li>
          <li><strong>Baixar → PDF:</strong> exporta para PDF via Slidev</li>
          <li><strong>Baixar → .slidebuilder:</strong> arquivo JSON para importar em outra conta</li>
          <li><strong>Visibilidade:</strong> no Dashboard, alterne entre 🔒 privado e 🌐 público</li>
          <li><strong>Perfil público:</strong> suas apresentações públicas ficam em <code>/u/seu-username</code></li>
        </ul>
      </div>
    </section>

    <!-- API REFERENCE -->
    <section id="api">
      <h2><Code2 :size="22" /> API Reference</h2>
      <p class="api-intro">Todos os endpoints retornam JSON. Endpoints autenticados exigem cookie de sessão (obtido via OAuth).</p>

      <div class="card">
        <h3><Key :size="16" /> Autenticação</h3>
        <p>Login via GitHub OAuth. O fluxo é:</p>
        <pre><code>GET /auth/github          → Redireciona para GitHub OAuth
POST /api/auth/logout     → Encerra a sessão</code></pre>
      </div>

      <div class="card">
        <h3><Users :size="16" /> Usuários (Público)</h3>
        <pre><code># Buscar usuários
GET /api/users/search?q=termo

# Perfil de um usuário
GET /api/users/:username

# Apresentações públicas de um usuário
GET /api/users/:username/presentations</code></pre>

        <h4>Exemplo</h4>
        <pre><code>curl https://slide-builder-dev.vercel.app/api/users/search?q=luiz</code></pre>
        <p>Retorna:</p>
        <pre><code>[
  {
    "id": "12345",
    "username": "sschonss",
    "name": "Luiz Schons",
    "avatar_url": "https://avatars...",
    "created_at": "2026-04-24T..."
  }
]</code></pre>
      </div>

      <div class="card">
        <h3><Presentation :size="16" /> Apresentações</h3>
        <pre><code># Listar minhas apresentações (autenticado)
GET /api/presentations

# Criar apresentação (autenticado)
POST /api/presentations
Body: { "title": "Minha Talk" }

# Detalhes de uma apresentação
GET /api/presentations/:id

# Atualizar apresentação (autenticado, owner)
PUT /api/presentations/:id
Body: { "title": "Novo Título", "visibility": "public" }

# Deletar apresentação (autenticado, owner)
DELETE /api/presentations/:id

# Importar arquivo .slidebuilder (autenticado)
POST /api/presentations/import
Body: { conteúdo do arquivo .slidebuilder }</code></pre>
      </div>

      <div class="card">
        <h3><Image :size="16" /> Slides</h3>
        <pre><code># Criar slide (autenticado, owner)
POST /api/slides
Body: { "presentation_id": "abc", "template": "content" }

# Atualizar slide (autenticado, owner)
PUT /api/slides/:id
Body: { "data": {...}, "notes": "..." }

# Deletar slide (autenticado, owner)
DELETE /api/slides/:id

# Reordenar slides (autenticado, owner)
PUT /api/slides/reorder
Body: { "slides": [{ "id": "s1", "order": 0 }, ...] }</code></pre>
      </div>

      <div class="card">
        <h3><Download :size="16" /> Export</h3>
        <pre><code># Gerar markdown (autenticado, owner)
POST /api/generate
Body: { "presentation_id": "abc" }

# Exportar PDF (autenticado, owner)
POST /api/export
Body: { "presentation_id": "abc" }

# Baixar PDF gerado (autenticado, owner)
GET /api/export-file?id=abc

# Baixar bundle .slidebuilder (autenticado, owner)
GET /api/export-bundle?id=abc</code></pre>
      </div>
    </section>
  </div>
</template>

<style scoped>
.docs { max-width: 800px; margin: 0 auto; padding: 40px 20px 80px; }
.docs-header { text-align: center; margin-bottom: 24px; }
.docs-header h1 { font-size: 28px; display: flex; align-items: center; justify-content: center; gap: 10px; }
.subtitle { color: #8b949e; margin-top: 8px; font-size: 15px; }

.toc { display: flex; gap: 16px; justify-content: center; margin-bottom: 40px; padding: 12px; background: #161b22; border-radius: 8px; border: 1px solid #30363d; }
.toc a { color: #58a6ff; font-size: 14px; font-weight: 500; }
.toc a:hover { text-decoration: underline; }

section { margin-bottom: 48px; }
h2 { font-size: 22px; margin-bottom: 20px; display: flex; align-items: center; gap: 8px; padding-bottom: 8px; border-bottom: 1px solid #21262d; }

.card { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 20px; margin-bottom: 12px; }
.card h3 { font-size: 16px; margin-bottom: 10px; display: flex; align-items: center; gap: 8px; }
.card h4 { font-size: 14px; margin: 12px 0 6px; color: #8b949e; }
.card p { font-size: 14px; color: #c9d1d9; line-height: 1.7; margin-bottom: 8px; }
.card ul { margin: 8px 0; padding-left: 20px; }
.card li { font-size: 14px; color: #c9d1d9; line-height: 1.8; }
.card code { background: #0d1117; padding: 2px 6px; border-radius: 4px; font-size: 13px; font-family: 'JetBrains Mono', monospace; color: #e6edf3; }
.card pre { background: #0d1117; border: 1px solid #21262d; border-radius: 6px; padding: 14px; overflow-x: auto; margin: 8px 0; }
.card pre code { background: none; padding: 0; font-size: 13px; line-height: 1.6; color: #8b949e; }

.api-intro { color: #8b949e; font-size: 14px; margin-bottom: 16px; }
</style>
