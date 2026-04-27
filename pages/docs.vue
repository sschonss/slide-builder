<script setup lang="ts">
import { onMounted, ref } from 'vue'

const swaggerContainer = ref<HTMLDivElement | null>(null)

onMounted(async () => {
  const { SwaggerUIBundle } = await import('swagger-ui-dist')
  await import('swagger-ui-dist/swagger-ui.css')

  if (swaggerContainer.value) {
    SwaggerUIBundle({
      domNode: swaggerContainer.value,
      url: '/openapi.json',
      deepLinking: true,
      defaultModelsExpandDepth: 1,
      defaultModelExpandDepth: 2,
      docExpansion: 'list',
      filter: true,
      tryItOutEnabled: true,
    })
  }
})
</script>

<template>
  <div class="docs">
    <div class="docs-header">
      <h1>📖 API Documentation</h1>
      <p class="subtitle">Explore e teste a API do Slide Builder</p>
    </div>
    <div ref="swaggerContainer" class="swagger-wrapper" />
  </div>
</template>

<style scoped>
.docs {
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 20px 80px;
}
.docs-header {
  text-align: center;
  margin-bottom: 24px;
}
.docs-header h1 {
  font-size: 28px;
}
.subtitle {
  color: #8b949e;
  margin-top: 8px;
  font-size: 15px;
}
.swagger-wrapper {
  background: #161b22;
  border: 1px solid #30363d;
  border-radius: 8px;
  padding: 16px;
  overflow: hidden;
}
</style>

<style>
/* Swagger UI dark theme overrides */
.swagger-ui {
  font-family: 'Inter', sans-serif !important;
}
.swagger-ui .topbar { display: none !important; }
.swagger-ui .scheme-container { background: transparent !important; border-bottom: 1px solid #30363d !important; padding: 12px 0 !important; }
.swagger-ui .info .title { color: #e6edf3 !important; }
.swagger-ui .info p, .swagger-ui .info li { color: #c9d1d9 !important; }
.swagger-ui .info a { color: #58a6ff !important; }
.swagger-ui .opblock-tag { color: #e6edf3 !important; border-bottom: 1px solid #21262d !important; }
.swagger-ui .opblock-tag:hover { background: rgba(88, 166, 255, 0.05) !important; }
.swagger-ui .opblock { border-color: #30363d !important; background: #0d1117 !important; }
.swagger-ui .opblock .opblock-summary { border-color: #30363d !important; }
.swagger-ui .opblock .opblock-summary-description { color: #8b949e !important; }
.swagger-ui .opblock.opblock-get { border-color: #388bfd40 !important; background: rgba(56, 139, 253, 0.05) !important; }
.swagger-ui .opblock.opblock-get .opblock-summary { background: rgba(56, 139, 253, 0.08) !important; }
.swagger-ui .opblock.opblock-post { border-color: #3fb95040 !important; background: rgba(63, 185, 80, 0.05) !important; }
.swagger-ui .opblock.opblock-post .opblock-summary { background: rgba(63, 185, 80, 0.08) !important; }
.swagger-ui .opblock.opblock-put { border-color: #d2992240 !important; background: rgba(210, 153, 34, 0.05) !important; }
.swagger-ui .opblock.opblock-put .opblock-summary { background: rgba(210, 153, 34, 0.08) !important; }
.swagger-ui .opblock.opblock-delete { border-color: #f8514940 !important; background: rgba(248, 81, 73, 0.05) !important; }
.swagger-ui .opblock.opblock-delete .opblock-summary { background: rgba(248, 81, 73, 0.08) !important; }
.swagger-ui .opblock-body { background: #161b22 !important; }
.swagger-ui .opblock-body pre { background: #0d1117 !important; color: #c9d1d9 !important; }
.swagger-ui table thead tr td, .swagger-ui table thead tr th { color: #e6edf3 !important; border-bottom: 1px solid #30363d !important; }
.swagger-ui .parameter__name { color: #e6edf3 !important; }
.swagger-ui .parameter__type { color: #8b949e !important; }
.swagger-ui .parameter__in { color: #8b949e !important; }
.swagger-ui .model-title { color: #e6edf3 !important; }
.swagger-ui .model { color: #c9d1d9 !important; }
.swagger-ui .prop-type { color: #79c0ff !important; }
.swagger-ui .response-col_status { color: #e6edf3 !important; }
.swagger-ui .response-col_description { color: #c9d1d9 !important; }
.swagger-ui .responses-inner { background: transparent !important; }
.swagger-ui .btn { border-color: #30363d !important; color: #c9d1d9 !important; background: #21262d !important; }
.swagger-ui .btn:hover { background: #30363d !important; }
.swagger-ui select { background: #0d1117 !important; color: #c9d1d9 !important; border-color: #30363d !important; }
.swagger-ui input[type=text] { background: #0d1117 !important; color: #c9d1d9 !important; border-color: #30363d !important; }
.swagger-ui textarea { background: #0d1117 !important; color: #c9d1d9 !important; border-color: #30363d !important; }
.swagger-ui .filter .operation-filter-input { background: #0d1117 !important; color: #c9d1d9 !important; border: 1px solid #30363d !important; }
.swagger-ui .model-box { background: #0d1117 !important; }
.swagger-ui section.models { border: 1px solid #30363d !important; }
.swagger-ui section.models h4 { color: #e6edf3 !important; border-bottom: 1px solid #30363d !important; }
.swagger-ui .model-container { background: #161b22 !important; border: 1px solid #30363d !important; }
.swagger-ui .loading-container .loading::after { color: #8b949e !important; }
.swagger-ui .scheme-container .schemes > label { color: #c9d1d9 !important; }
.swagger-ui .servers > label { color: #c9d1d9 !important; }
.swagger-ui .servers select { background: #0d1117 !important; color: #c9d1d9 !important; border: 1px solid #30363d !important; }
</style>
