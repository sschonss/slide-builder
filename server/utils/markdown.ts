import type { Slide, ThemeConfig, CoverData, SectionData, ContentData, DiagramData, CodeData, ComparisonData, BioData, CreditsData } from '../../types'

export function generateMarkdown(title: string, slides: Slide[], theme: ThemeConfig): string {
  const parts: string[] = []

  slides.forEach((slide, index) => {
    if (index === 0 && slide.template === 'cover') {
      parts.push(generateCoverWithFrontmatter(slide, title, theme))
    } else {
      parts.push(generateSlide(slide))
    }
  })

  // In Slidev, `---` is both the slide separator AND frontmatter delimiter.
  // Each slide already starts with `---`, so join without adding another.
  return parts.join('\n\n')
}

function generateCoverWithFrontmatter(slide: Slide, title: string, theme: ThemeConfig): string {
  const data = slide.data as CoverData
  const lines = [
    '---',
    'theme: default',
    `title: "${title}"`,
    'class: text-center',
    'transition: slide-left',
    'mdc: true',
    '---',
    '',
    `# ${data.title || title}`,
  ]

  if (data.subtitle) lines.push(`## ${data.subtitle}`)
  if (data.author) lines.push('', data.author)
  if (slide.notes) lines.push('', '<!--', slide.notes, '-->')

  return lines.join('\n')
}

function generateSlide(slide: Slide): string {
  switch (slide.template) {
    case 'cover': return generateCover(slide)
    case 'section': return generateSection(slide)
    case 'content': return generateContent(slide)
    case 'diagram': return generateDiagram(slide)
    case 'code': return generateCode(slide)
    case 'comparison': return generateComparison(slide)
    case 'bio': return generateBio(slide)
    case 'credits': return generateCredits(slide)
    default: return ''
  }
}

function generateCover(slide: Slide): string {
  const data = slide.data as CoverData
  const lines = ['---', 'layout: cover', '---', '', `# ${data.title}`]
  if (data.subtitle) lines.push(`## ${data.subtitle}`)
  if (data.author) lines.push('', data.author)
  appendNotes(lines, slide.notes)
  return lines.join('\n')
}

function generateSection(slide: Slide): string {
  const data = slide.data as SectionData
  const lines = ['---', 'layout: section', '---', '']
  if (data.section_number) lines.push(`<p class="opacity-50 text-sm tracking-widest">${data.section_number}</p>`, '')
  lines.push(`# ${data.title}`)
  appendNotes(lines, slide.notes)
  return lines.join('\n')
}

function generateContent(slide: Slide): string {
  const data = slide.data as ContentData
  const lines = ['---', 'layout: default', '---', '', `# ${data.title}`, '']
  if (data.bullets?.length) {
    data.bullets.forEach(b => lines.push(`- ${b}`))
  }
  if (data.quote) lines.push('', `> ${data.quote}`)
  if (data.image) lines.push('', `![](${data.image})`)
  appendNotes(lines, slide.notes)
  return lines.join('\n')
}

function generateDiagram(slide: Slide): string {
  const data = slide.data as DiagramData
  const lines = ['---', 'layout: center', '---', '', `# ${data.title}`, '']

  if (data.diagram_type === 'mermaid' && data.mermaid_code) {
    lines.push('```mermaid', data.mermaid_code, '```')
  } else if (data.diagram_type === 'excalidraw' && data.image) {
    lines.push(`![${data.caption || ''}](${data.image})`)
  } else if (data.diagram_type === 'image' && data.image) {
    lines.push(`![${data.caption || ''}](${data.image})`)
  } else if (data.diagram_type === 'embed' && data.embed_url) {
    lines.push(`<iframe src="${data.embed_url}" class="w-full h-80" />`)
  }

  if (data.caption && data.diagram_type !== 'image') {
    lines.push('', `<p class="text-sm opacity-50">${data.caption}</p>`)
  }
  appendNotes(lines, slide.notes)
  return lines.join('\n')
}

function generateCode(slide: Slide): string {
  const data = slide.data as CodeData
  const highlight = data.highlight_lines ? ` {${data.highlight_lines}}` : ''
  const lines = ['---', 'layout: default', '---', '', `# ${data.title}`, '']
  lines.push(`\`\`\`${data.language}${highlight}`, data.code, '```')
  if (data.note) lines.push('', `<p class="text-sm opacity-60 mt-2">${data.note}</p>`)
  appendNotes(lines, slide.notes)
  return lines.join('\n')
}

function generateComparison(slide: Slide): string {
  const data = slide.data as ComparisonData
  const lines = ['---', 'layout: two-cols', '---', '', `# ${data.title}`, '', '::left::', '']
  lines.push(`### ${data.left_title}`, '')
  ;(data.left_items || []).forEach(item => lines.push(`- ${item}`))
  lines.push('', '::right::', '')
  lines.push(`### ${data.right_title || ''}`, '')
  ;(data.right_items || []).forEach(item => lines.push(`- ${item}`))
  appendNotes(lines, slide.notes)
  return lines.join('\n')
}

function appendNotes(lines: string[], notes?: string) {
  if (notes) lines.push('', '<!--', notes, '-->')
}

function generateBio(slide: Slide): string {
  const data = slide.data as BioData
  const lines = ['---', 'layout: two-cols', '---', '']
  const photoUrl = data.photo_url || (data.github_username ? `https://github.com/${data.github_username}.png` : '')
  lines.push('::left::')
  if (photoUrl) lines.push('', `<img src="${photoUrl}" class="rounded-full w-40 h-40" />`)
  lines.push('', '::right::', '')
  lines.push(`# ${data.title || ''}`, '')
  if (data.bullets?.length) {
    data.bullets.forEach(b => lines.push(`- ${b}`))
  }
  appendNotes(lines, slide.notes)
  return lines.join('\n')
}

function generateCredits(slide: Slide): string {
  const data = slide.data as CreditsData
  const repoUrl = data.repo_url || 'https://github.com/sschonss/slide-builder'
  const message = data.message || 'Feito com Slide Builder'
  const lines = ['---', 'layout: center', '---', '']
  lines.push(`# Slide Builder`, '', `${message}`, '')
  lines.push(`![QR Code](https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(repoUrl)})`, '')
  lines.push(`<p class="text-sm opacity-50">${repoUrl}</p>`)
  appendNotes(lines, slide.notes)
  return lines.join('\n')
}
