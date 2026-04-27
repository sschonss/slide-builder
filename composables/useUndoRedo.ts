interface SlideState {
  past: any[]
  present: any
  future: any[]
}

export function useUndoRedo(maxHistory = 50) {
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
