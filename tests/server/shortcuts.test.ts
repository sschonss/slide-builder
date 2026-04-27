import { describe, it, expect, vi, beforeEach } from 'vitest'

function createShortcutHandler(options: {
  onSave: () => void
  onDuplicate: () => void
  onDelete: () => void
  onNavigate: (dir: 'prev' | 'next') => void
  onToggleHelp: () => void
  onUndo?: () => void
  onRedo?: () => void
}) {
  return function handleKeydown(e: { key: string; ctrlKey: boolean; metaKey: boolean; shiftKey: boolean; target: { tagName?: string; isContentEditable?: boolean }; preventDefault: () => void }) {
    const tag = e.target?.tagName?.toLowerCase()
    const isEditable = tag === 'input' || tag === 'textarea' || e.target?.isContentEditable
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
}

describe('editor shortcuts', () => {
  let handlers: Record<string, ReturnType<typeof vi.fn>>
  let handleKeydown: ReturnType<typeof createShortcutHandler>

  function makeEvent(overrides: Partial<Parameters<typeof handleKeydown>[0]> = {}) {
    return {
      key: '',
      ctrlKey: false,
      metaKey: false,
      shiftKey: false,
      target: { tagName: 'DIV', isContentEditable: false },
      preventDefault: vi.fn(),
      ...overrides,
    }
  }

  beforeEach(() => {
    handlers = {
      onSave: vi.fn(),
      onDuplicate: vi.fn(),
      onDelete: vi.fn(),
      onNavigate: vi.fn(),
      onToggleHelp: vi.fn(),
      onUndo: vi.fn(),
      onRedo: vi.fn(),
    }
    handleKeydown = createShortcutHandler(handlers)
  })

  it('Ctrl+S calls onSave and prevents default', () => {
    const e = makeEvent({ key: 's', ctrlKey: true })
    handleKeydown(e)
    expect(handlers.onSave).toHaveBeenCalled()
    expect(e.preventDefault).toHaveBeenCalled()
  })

  it('Ctrl+S works even in text input', () => {
    const e = makeEvent({ key: 's', ctrlKey: true, target: { tagName: 'INPUT' } })
    handleKeydown(e)
    expect(handlers.onSave).toHaveBeenCalled()
  })

  it('Ctrl+D calls onDuplicate', () => {
    const e = makeEvent({ key: 'd', ctrlKey: true })
    handleKeydown(e)
    expect(handlers.onDuplicate).toHaveBeenCalled()
    expect(e.preventDefault).toHaveBeenCalled()
  })

  it('Ctrl+D is suppressed in text input', () => {
    const e = makeEvent({ key: 'd', ctrlKey: true, target: { tagName: 'TEXTAREA' } })
    handleKeydown(e)
    expect(handlers.onDuplicate).not.toHaveBeenCalled()
  })

  it('ArrowUp calls onNavigate prev', () => {
    const e = makeEvent({ key: 'ArrowUp' })
    handleKeydown(e)
    expect(handlers.onNavigate).toHaveBeenCalledWith('prev')
  })

  it('ArrowDown calls onNavigate next', () => {
    const e = makeEvent({ key: 'ArrowDown' })
    handleKeydown(e)
    expect(handlers.onNavigate).toHaveBeenCalledWith('next')
  })

  it('ArrowUp is suppressed in text input', () => {
    const e = makeEvent({ key: 'ArrowUp', target: { tagName: 'TEXTAREA' } })
    handleKeydown(e)
    expect(handlers.onNavigate).not.toHaveBeenCalled()
  })

  it('Delete calls onDelete (not in text input)', () => {
    const e = makeEvent({ key: 'Delete' })
    handleKeydown(e)
    expect(handlers.onDelete).toHaveBeenCalled()
  })

  it('Delete is suppressed in text input', () => {
    const e = makeEvent({ key: 'Delete', target: { tagName: 'INPUT' } })
    handleKeydown(e)
    expect(handlers.onDelete).not.toHaveBeenCalled()
  })

  it('? toggles help', () => {
    const e = makeEvent({ key: '?' })
    handleKeydown(e)
    expect(handlers.onToggleHelp).toHaveBeenCalled()
  })

  it('Ctrl+Z calls onUndo', () => {
    const e = makeEvent({ key: 'z', ctrlKey: true })
    handleKeydown(e)
    expect(handlers.onUndo).toHaveBeenCalled()
  })

  it('Ctrl+Shift+Z calls onRedo', () => {
    const e = makeEvent({ key: 'z', ctrlKey: true, shiftKey: true })
    handleKeydown(e)
    expect(handlers.onRedo).toHaveBeenCalled()
  })

  it('Escape calls onToggleHelp', () => {
    const e = makeEvent({ key: 'Escape' })
    handleKeydown(e)
    expect(handlers.onToggleHelp).toHaveBeenCalled()
  })
})
