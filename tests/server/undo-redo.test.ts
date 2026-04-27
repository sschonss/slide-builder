import { describe, it, expect, beforeEach } from 'vitest'

interface SlideState {
  past: any[]
  present: any
  future: any[]
}

function createUndoRedo(maxHistory = 50) {
  const slides = new Map<string, SlideState>()

  function getOrCreate(slideId: string, initial: any): SlideState {
    if (!slides.has(slideId)) {
      slides.set(slideId, { past: [], present: structuredClone(initial), future: [] })
    }
    return slides.get(slideId)!
  }

  function pushState(slideId: string, current: any, incoming: any) {
    const state = getOrCreate(slideId, current)
    state.past.push(structuredClone(state.present))
    if (state.past.length > maxHistory) state.past.shift()
    state.present = structuredClone(incoming)
    state.future = []
  }

  function undo(slideId: string): any | null {
    const state = slides.get(slideId)
    if (!state || state.past.length === 0) return null
    state.future.push(structuredClone(state.present))
    state.present = state.past.pop()!
    return structuredClone(state.present)
  }

  function redo(slideId: string): any | null {
    const state = slides.get(slideId)
    if (!state || state.future.length === 0) return null
    state.past.push(structuredClone(state.present))
    state.present = state.future.pop()!
    return structuredClone(state.present)
  }

  function canUndo(slideId: string): boolean {
    return (slides.get(slideId)?.past.length ?? 0) > 0
  }

  function canRedo(slideId: string): boolean {
    return (slides.get(slideId)?.future.length ?? 0) > 0
  }

  function clear(slideId?: string) {
    if (slideId) { slides.delete(slideId) } else { slides.clear() }
  }

  return { pushState, undo, redo, canUndo, canRedo, clear }
}

describe('useUndoRedo', () => {
  let ur: ReturnType<typeof createUndoRedo>

  beforeEach(() => { ur = createUndoRedo(50) })

  it('undo returns previous state', () => {
    ur.pushState('s1', { title: 'A' }, { title: 'B' })
    expect(ur.undo('s1')).toEqual({ title: 'A' })
  })

  it('redo returns undone state', () => {
    ur.pushState('s1', { title: 'A' }, { title: 'B' })
    ur.undo('s1')
    expect(ur.redo('s1')).toEqual({ title: 'B' })
  })

  it('undo returns null when no history', () => {
    expect(ur.undo('s1')).toBeNull()
  })

  it('redo returns null when no future', () => {
    ur.pushState('s1', { title: 'A' }, { title: 'B' })
    expect(ur.redo('s1')).toBeNull()
  })

  it('new edit clears redo stack', () => {
    ur.pushState('s1', { title: 'A' }, { title: 'B' })
    ur.undo('s1')
    expect(ur.canRedo('s1')).toBe(true)
    ur.pushState('s1', { title: 'A' }, { title: 'C' })
    expect(ur.canRedo('s1')).toBe(false)
  })

  it('respects maxHistory limit', () => {
    const ur3 = createUndoRedo(3)
    ur3.pushState('s1', { v: 0 }, { v: 1 })
    ur3.pushState('s1', { v: 1 }, { v: 2 })
    ur3.pushState('s1', { v: 2 }, { v: 3 })
    ur3.pushState('s1', { v: 3 }, { v: 4 })
    expect(ur3.canUndo('s1')).toBe(true)
    ur3.undo('s1'); ur3.undo('s1'); ur3.undo('s1')
    expect(ur3.canUndo('s1')).toBe(false)
  })

  it('tracks slides independently', () => {
    ur.pushState('s1', { title: 'A1' }, { title: 'B1' })
    ur.pushState('s2', { title: 'A2' }, { title: 'B2' })
    expect(ur.undo('s1')).toEqual({ title: 'A1' })
    expect(ur.canUndo('s2')).toBe(true)
  })

  it('canUndo and canRedo return correct values', () => {
    expect(ur.canUndo('s1')).toBe(false)
    expect(ur.canRedo('s1')).toBe(false)
    ur.pushState('s1', { title: 'A' }, { title: 'B' })
    expect(ur.canUndo('s1')).toBe(true)
    expect(ur.canRedo('s1')).toBe(false)
    ur.undo('s1')
    expect(ur.canUndo('s1')).toBe(false)
    expect(ur.canRedo('s1')).toBe(true)
  })

  it('clear removes all history for a slide', () => {
    ur.pushState('s1', { title: 'A' }, { title: 'B' })
    ur.clear('s1')
    expect(ur.canUndo('s1')).toBe(false)
  })

  it('clear without arg removes all slides', () => {
    ur.pushState('s1', { title: 'A' }, { title: 'B' })
    ur.pushState('s2', { title: 'C' }, { title: 'D' })
    ur.clear()
    expect(ur.canUndo('s1')).toBe(false)
    expect(ur.canUndo('s2')).toBe(false)
  })

  it('deep clones state to prevent reference mutation', () => {
    const original = { title: 'A', bullets: ['x'] }
    ur.pushState('s1', original, { title: 'B', bullets: ['y'] })
    original.title = 'MUTATED'
    expect(ur.undo('s1')!.title).toBe('A')
  })
})
