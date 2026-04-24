export type SlideTemplate = 'cover' | 'section' | 'content' | 'diagram' | 'code' | 'comparison'

export interface CoverData {
  title: string
  subtitle: string
  author: string
  logo?: string
  background_image?: string
}

export interface SectionData {
  section_number?: string
  title: string
  accent_color?: string
}

export interface ContentData {
  title: string
  bullets: string[]
  quote?: string
  image?: string
}

export interface DiagramData {
  title: string
  diagram_type: 'mermaid' | 'image' | 'embed' | 'excalidraw'
  mermaid_code?: string
  image?: string
  embed_url?: string
  caption?: string
  excalidraw_scene?: string
  excalidraw_svg?: string
}

export interface CodeData {
  title: string
  code: string
  language: string
  note?: string
  highlight_lines?: string
}

export interface ComparisonData {
  title: string
  left_title: string
  left_items: string[]
  right_title: string
  right_items: string[]
  style: 'columns' | 'table'
}

export type SlideData = CoverData | SectionData | ContentData | DiagramData | CodeData | ComparisonData

export interface Slide {
  id: string
  presentation_id: string
  order: number
  template: SlideTemplate
  data: SlideData
  notes?: string
}

export interface ThemeConfig {
  colors: {
    background: string
    primary: string
    secondary: string
    text: string
  }
  fonts: {
    heading: string
    body: string
    code: string
  }
  logo?: string
  codeTheme: string
}

export interface Theme {
  id: string
  name: string
  config: ThemeConfig
}

export interface Presentation {
  id: string
  title: string
  theme_id: string
  created_at: string
  updated_at: string
}

export interface Asset {
  id: string
  presentation_id: string
  filename: string
  path: string
  type: 'image' | 'video' | 'logo'
}
