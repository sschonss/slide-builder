import { describe, it, expect } from 'vitest'
import { generateMarkdown } from '../../server/utils/markdown'
import type { Slide, ThemeConfig } from '../../types'

const theme: ThemeConfig = {
  colors: { background: '#1a1a2e', primary: '#e94560', secondary: '#533483', text: '#ffffff' },
  fonts: { heading: 'Inter', body: 'Inter', code: 'JetBrains Mono' },
  codeTheme: 'github-dark',
}

describe('generateMarkdown', () => {
  it('generates frontmatter for cover slide', () => {
    const slides: Slide[] = [{
      id: '1', presentation_id: 'p1', order: 0, template: 'cover',
      data: { title: 'My Talk', subtitle: 'Subtitle', author: 'Author' },
    }]
    const md = generateMarkdown('My Talk', slides, theme)
    expect(md).toContain('theme: default')
    expect(md).toContain('# My Talk')
    expect(md).toContain('Subtitle')
    expect(md).toContain('Author')
  })

  it('generates section slide', () => {
    const slides: Slide[] = [{
      id: '1', presentation_id: 'p1', order: 0, template: 'section',
      data: { title: 'Section Title', section_number: 'BLOCO 1' },
    }]
    const md = generateMarkdown('Test', slides, theme)
    expect(md).toContain('layout: section')
    expect(md).toContain('# Section Title')
  })

  it('generates content slide with bullets', () => {
    const slides: Slide[] = [{
      id: '1', presentation_id: 'p1', order: 0, template: 'content',
      data: { title: 'Content', bullets: ['Point A', 'Point B'], quote: 'A quote' },
    }]
    const md = generateMarkdown('Test', slides, theme)
    expect(md).toContain('# Content')
    expect(md).toContain('- Point A')
    expect(md).toContain('- Point B')
    expect(md).toContain('> A quote')
  })

  it('generates code slide', () => {
    const slides: Slide[] = [{
      id: '1', presentation_id: 'p1', order: 0, template: 'code',
      data: { title: 'Code Example', code: 'console.log("hi")', language: 'js', highlight_lines: '1' },
    }]
    const md = generateMarkdown('Test', slides, theme)
    expect(md).toContain('```js {1}')
    expect(md).toContain('console.log("hi")')
  })

  it('generates comparison slide with two-cols', () => {
    const slides: Slide[] = [{
      id: '1', presentation_id: 'p1', order: 0, template: 'comparison',
      data: { title: 'Vs', left_title: 'A', left_items: ['a1'], right_title: 'B', right_items: ['b1'], style: 'columns' },
    }]
    const md = generateMarkdown('Test', slides, theme)
    expect(md).toContain('layout: two-cols')
    expect(md).toContain('::left::')
    expect(md).toContain('::right::')
  })

  it('generates diagram slide with mermaid', () => {
    const slides: Slide[] = [{
      id: '1', presentation_id: 'p1', order: 0, template: 'diagram',
      data: { title: 'Architecture', diagram_type: 'mermaid', mermaid_code: 'graph TD\n  A-->B' },
    }]
    const md = generateMarkdown('Test', slides, theme)
    expect(md).toContain('layout: center')
    expect(md).toContain('```mermaid')
    expect(md).toContain('A-->B')
  })

  it('separates slides with ---', () => {
    const slides: Slide[] = [
      { id: '1', presentation_id: 'p1', order: 0, template: 'cover', data: { title: 'T', subtitle: '', author: '' } },
      { id: '2', presentation_id: 'p1', order: 1, template: 'content', data: { title: 'C', bullets: ['x'] } },
    ]
    const md = generateMarkdown('Test', slides, theme)
    const separators = md.split('\n---\n').length - 1
    expect(separators).toBeGreaterThanOrEqual(1)
  })

  it('includes speaker notes', () => {
    const slides: Slide[] = [{
      id: '1', presentation_id: 'p1', order: 0, template: 'content',
      data: { title: 'T', bullets: ['x'] }, notes: 'Remember to mention X',
    }]
    const md = generateMarkdown('Test', slides, theme)
    expect(md).toContain('<!--')
    expect(md).toContain('Remember to mention X')
  })
})
