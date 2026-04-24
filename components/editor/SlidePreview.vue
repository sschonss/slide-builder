<script setup lang="ts">
import type { Slide, ThemeConfig, CoverData, SectionData, ContentData, DiagramData, CodeData, ComparisonData } from '~/types'

const props = defineProps<{ slide: Slide; theme?: ThemeConfig }>()

const bg = computed(() => props.theme?.colors?.background || '#1a1a2e')
const primary = computed(() => props.theme?.colors?.primary || '#e94560')
const textColor = computed(() => props.theme?.colors?.text || '#ffffff')
</script>

<template>
  <div class="preview-wrapper">
    <div class="slide" :style="{ background: bg, color: textColor }">
      <!-- Cover -->
      <template v-if="slide.template === 'cover'">
        <div class="cover">
          <h1>{{ (slide.data as CoverData).title }}</h1>
          <h2 v-if="(slide.data as CoverData).subtitle">{{ (slide.data as CoverData).subtitle }}</h2>
          <p class="author" v-if="(slide.data as CoverData).author">{{ (slide.data as CoverData).author }}</p>
          <div class="accent-bar" :style="{ background: primary }" />
        </div>
      </template>

      <!-- Section -->
      <template v-else-if="slide.template === 'section'">
        <div class="section-slide">
          <span class="section-num" v-if="(slide.data as SectionData).section_number">{{ (slide.data as SectionData).section_number }}</span>
          <h1>{{ (slide.data as SectionData).title }}</h1>
          <div class="accent-bar" :style="{ background: primary }" />
        </div>
      </template>

      <!-- Content -->
      <template v-else-if="slide.template === 'content'">
        <div class="content-slide">
          <h1 :style="{ color: primary }">{{ (slide.data as ContentData).title }}</h1>
          <ul>
            <li v-for="(b, i) in ((slide.data as ContentData).bullets || [])" :key="i">{{ b }}</li>
          </ul>
          <blockquote v-if="(slide.data as ContentData).quote">{{ (slide.data as ContentData).quote }}</blockquote>
        </div>
      </template>

      <!-- Diagram -->
      <template v-else-if="slide.template === 'diagram'">
        <div class="diagram-slide">
          <h1>{{ (slide.data as DiagramData).title }}</h1>
          <div class="diagram-placeholder">
            <template v-if="(slide.data as DiagramData).diagram_type === 'mermaid'">
              <pre class="mermaid-preview">{{ (slide.data as DiagramData).mermaid_code }}</pre>
            </template>
            <template v-else>
              <span class="placeholder-text">{{ (slide.data as DiagramData).diagram_type === 'image' ? '🖼 Imagem' : '🔗 Embed' }}</span>
            </template>
          </div>
        </div>
      </template>

      <!-- Code -->
      <template v-else-if="slide.template === 'code'">
        <div class="code-slide">
          <h1>{{ (slide.data as CodeData).title }}</h1>
          <pre class="code-block"><code>{{ (slide.data as CodeData).code }}</code></pre>
          <p class="note" v-if="(slide.data as CodeData).note">{{ (slide.data as CodeData).note }}</p>
        </div>
      </template>

      <!-- Comparison -->
      <template v-else-if="slide.template === 'comparison'">
        <div class="comparison-slide">
          <h1>{{ (slide.data as ComparisonData).title }}</h1>
          <div class="columns">
            <div class="col">
              <h3>{{ (slide.data as ComparisonData).left_title }}</h3>
              <ul><li v-for="(item, i) in ((slide.data as ComparisonData).left_items || [])" :key="i">{{ item }}</li></ul>
            </div>
            <div class="col">
              <h3>{{ (slide.data as ComparisonData).right_title }}</h3>
              <ul><li v-for="(item, i) in ((slide.data as ComparisonData).right_items || [])" :key="i">{{ item }}</li></ul>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.preview-wrapper { width: 100%; max-width: 720px; aspect-ratio: 16/9; }
.slide { width: 100%; height: 100%; border-radius: 8px; padding: 40px; display: flex; align-items: center; justify-content: center; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.4); }
h1 { font-size: 28px; margin-bottom: 8px; }
h2 { font-size: 18px; opacity: 0.7; }
.accent-bar { width: 40px; height: 3px; margin-top: 12px; border-radius: 2px; }

.cover { text-align: center; }
.author { font-size: 13px; opacity: 0.5; margin-top: 8px; }

.section-slide { text-align: left; }
.section-num { font-size: 11px; opacity: 0.4; letter-spacing: 2px; text-transform: uppercase; }

.content-slide { text-align: left; width: 100%; }
.content-slide ul { list-style: disc; padding-left: 20px; font-size: 16px; line-height: 1.8; }
.content-slide blockquote { border-left: 3px solid currentColor; padding-left: 12px; font-style: italic; opacity: 0.8; margin-top: 12px; font-size: 14px; }

.diagram-slide { text-align: center; width: 100%; }
.diagram-placeholder { margin-top: 16px; }
.mermaid-preview { text-align: left; font-size: 10px; background: rgba(0,0,0,0.3); padding: 12px; border-radius: 6px; max-height: 200px; overflow: auto; }
.placeholder-text { font-size: 40px; }

.code-slide { text-align: left; width: 100%; }
.code-block { background: #0d1117; padding: 16px; border-radius: 6px; font-family: 'JetBrains Mono', monospace; font-size: 12px; overflow: auto; max-height: 250px; margin-top: 12px; }
.note { font-size: 11px; opacity: 0.6; margin-top: 8px; }

.comparison-slide { width: 100%; }
.columns { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 16px; }
.col { background: rgba(255,255,255,0.05); padding: 16px; border-radius: 8px; }
.col h3 { font-size: 16px; margin-bottom: 8px; }
.col ul { list-style: disc; padding-left: 16px; font-size: 13px; line-height: 1.6; }
</style>
