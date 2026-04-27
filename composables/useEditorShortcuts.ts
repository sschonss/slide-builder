interface ShortcutOptions {
  onSave: () => void
  onDuplicate: () => void
  onDelete: () => void
  onNavigate: (dir: 'prev' | 'next') => void
  onToggleHelp: () => void
  onUndo?: () => void
  onRedo?: () => void
}

export function useEditorShortcuts(options: ShortcutOptions) {
  function handleKeydown(e: KeyboardEvent) {
    const tag = (e.target as HTMLElement)?.tagName?.toLowerCase()
    const isEditable = tag === 'input' || tag === 'textarea' || (e.target as HTMLElement)?.isContentEditable
    const mod = e.ctrlKey || e.metaKey

    if (mod && e.key === 's') {
      e.preventDefault()
      options.onSave()
      return
    }

    if (e.key === 'Escape') {
      options.onToggleHelp()
      return
    }

    if (isEditable) return

    if (mod && e.key === 'd') {
      e.preventDefault()
      options.onDuplicate()
      return
    }

    if (mod && e.key === 'z' && !e.shiftKey && options.onUndo) {
      e.preventDefault()
      options.onUndo()
      return
    }

    if (mod && e.key === 'z' && e.shiftKey && options.onRedo) {
      e.preventDefault()
      options.onRedo()
      return
    }

    if (e.key === 'Delete' || e.key === 'Backspace') {
      options.onDelete()
      return
    }

    if (e.key === 'ArrowUp') {
      options.onNavigate('prev')
      return
    }

    if (e.key === 'ArrowDown') {
      options.onNavigate('next')
      return
    }

    if (e.key === '?') {
      options.onToggleHelp()
      return
    }
  }

  onMounted(() => document.addEventListener('keydown', handleKeydown))
  onUnmounted(() => document.removeEventListener('keydown', handleKeydown))
}
