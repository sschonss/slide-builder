export function useExportPdf() {
  const exporting = ref(false)
  const progress = ref('')

  async function exportToPdf(presentationId: string, title: string) {
    exporting.value = true
    progress.value = 'Preparando slides...'

    try {
      const [html2canvasModule, jsPDFModule, mermaidModule] = await Promise.all([
        import('html2canvas-pro'),
        import('jspdf'),
        import('mermaid'),
      ])
      const html2canvas = html2canvasModule.default
      const { jsPDF } = jsPDFModule
      const mermaid = mermaidModule.default

      mermaid.initialize({ startOnLoad: false, theme: 'dark', securityLevel: 'loose' })

      // Fetch presentation data
      const presentation = await $fetch(`/api/presentations/${presentationId}`) as any
      const slides = presentation.slides || []
      const theme = presentation.theme?.config

      if (!slides.length) {
        alert('Nenhum slide para exportar')
        return
      }

      // Pre-render mermaid diagrams
      progress.value = 'Renderizando diagramas...'
      const diagramSvgs: Record<number, string> = {}
      for (let i = 0; i < slides.length; i++) {
        const slide = slides[i]
        if (slide.template !== 'diagram') continue
        const data = typeof slide.data === 'string' ? JSON.parse(slide.data) : slide.data
        if (data.diagram_type === 'mermaid' && data.mermaid_code?.trim()) {
          try {
            const id = `pdf-mermaid-${i}-${Date.now()}`
            const { svg } = await mermaid.render(id, data.mermaid_code)
            diagramSvgs[i] = svg
          } catch {}
        } else if (data.diagram_type === 'excalidraw' && data.excalidraw_svg) {
          diagramSvgs[i] = data.excalidraw_svg
        }
      }

      // Create offscreen container
      const container = document.createElement('div')
      container.style.cssText = 'position:fixed;left:-9999px;top:0;width:960px;height:540px;overflow:hidden;'
      document.body.appendChild(container)

      const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [960, 540] })

      for (let i = 0; i < slides.length; i++) {
        progress.value = `Renderizando slide ${i + 1} de ${slides.length}...`

        // Mount a temporary slide preview
        const slideEl = document.createElement('div')
        slideEl.style.cssText = `width:960px;height:540px;background:${theme?.colors?.background || '#1a1a2e'};color:${theme?.colors?.text || '#ffffff'};display:flex;align-items:center;justify-content:center;font-family:Inter,sans-serif;padding:48px;box-sizing:border-box;`

        const slide = slides[i]
        slideEl.innerHTML = renderSlideHtml(slide, theme, diagramSvgs[i])
        container.innerHTML = ''
        container.appendChild(slideEl)

        // Wait for rendering
        await new Promise(r => setTimeout(r, 200))

        const canvas = await html2canvas(slideEl, {
          width: 960,
          height: 540,
          scale: 2,
          useCORS: true,
          backgroundColor: theme?.colors?.background || '#1a1a2e',
        })

        if (i > 0) pdf.addPage()
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 960, 540)
      }

      document.body.removeChild(container)

      progress.value = 'Gerando PDF...'
      const safeName = title.replace(/[^a-zA-Z0-9-_ ]/g, '') || 'presentation'
      pdf.save(`${safeName}.pdf`)
      progress.value = ''
    } catch (err: any) {
      alert('Erro ao gerar PDF: ' + (err.message || err))
    } finally {
      exporting.value = false
      progress.value = ''
    }
  }

  return { exporting, progress, exportToPdf }
}

function renderSlideHtml(slide: any, theme: any, diagramSvg?: string): string {
  const primary = theme?.colors?.primary || '#e94560'
  const data = typeof slide.data === 'string' ? JSON.parse(slide.data) : slide.data

  switch (slide.template) {
    case 'cover':
      return `
        <div style="text-align:center;width:100%;">
          <h1 style="font-size:42px;font-weight:700;margin-bottom:16px;">${esc(data.title || '')}</h1>
          ${data.subtitle ? `<h2 style="font-size:24px;font-weight:400;opacity:0.8;margin-bottom:12px;">${esc(data.subtitle)}</h2>` : ''}
          ${data.author ? `<p style="font-size:18px;opacity:0.6;">${esc(data.author)}</p>` : ''}
        </div>`

    case 'section':
      return `
        <div style="text-align:center;width:100%;">
          ${data.section_number ? `<span style="font-size:64px;font-weight:700;color:${primary};opacity:0.3;">${esc(data.section_number)}</span>` : ''}
          <h1 style="font-size:36px;font-weight:700;">${esc(data.title || '')}</h1>
        </div>`

    case 'content':
      return `
        <div style="width:100%;">
          <h1 style="font-size:28px;font-weight:700;color:${primary};margin-bottom:20px;">${esc(data.title || '')}</h1>
          <ul style="list-style:disc;padding-left:24px;font-size:20px;line-height:1.8;">
            ${(data.bullets || []).map((b: string) => `<li>${esc(b)}</li>`).join('')}
          </ul>
        </div>`

    case 'code':
      return `
        <div style="width:100%;">
          <h1 style="font-size:24px;font-weight:700;color:${primary};margin-bottom:16px;">${esc(data.title || '')}</h1>
          <pre style="background:#0d1117;border:1px solid #30363d;border-radius:8px;padding:20px;font-size:14px;font-family:'JetBrains Mono',monospace;overflow:hidden;white-space:pre-wrap;"><code>${esc(data.code || '')}</code></pre>
        </div>`

    case 'comparison':
      return `
        <div style="width:100%;">
          <h1 style="font-size:24px;font-weight:700;color:${primary};margin-bottom:20px;">${esc(data.title || '')}</h1>
          <div style="display:flex;gap:24px;">
            <div style="flex:1;background:rgba(255,255,255,0.05);border-radius:8px;padding:20px;">
              <h3 style="margin-bottom:12px;">${esc(data.left_title || '')}</h3>
              <ul style="list-style:disc;padding-left:20px;font-size:16px;line-height:1.8;">${(data.left_points || []).map((p: string) => `<li>${esc(p)}</li>`).join('')}</ul>
            </div>
            <div style="flex:1;background:rgba(255,255,255,0.05);border-radius:8px;padding:20px;">
              <h3 style="margin-bottom:12px;">${esc(data.right_title || '')}</h3>
              <ul style="list-style:disc;padding-left:20px;font-size:16px;line-height:1.8;">${(data.right_points || []).map((p: string) => `<li>${esc(p)}</li>`).join('')}</ul>
            </div>
          </div>
        </div>`

    case 'diagram':
      return `
        <div style="width:100%;text-align:center;">
          <h1 style="font-size:24px;font-weight:700;color:${primary};margin-bottom:16px;">${esc(data.title || '')}</h1>
          ${diagramSvg
            ? `<div style="display:flex;align-items:center;justify-content:center;max-height:380px;overflow:hidden;">${diagramSvg}</div>`
            : `<p style="font-size:16px;opacity:0.7;">[Diagrama]</p>`
          }
          ${data.caption ? `<p style="font-size:12px;opacity:0.5;margin-top:8px;">${esc(data.caption)}</p>` : ''}
        </div>`

    default:
      return `<p style="font-size:20px;opacity:0.5;">Slide</p>`
  }
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
