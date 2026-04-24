const DB_NAME = 'slide-builder-cache'
const STORE_NAME = 'presentations'
const DB_VERSION = 1

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export function useLocalCache() {
  async function get<T>(key: string): Promise<T | null> {
    try {
      const db = await openDb()
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly')
        const store = tx.objectStore(STORE_NAME)
        const req = store.get(key)
        req.onsuccess = () => resolve(req.result ?? null)
        req.onerror = () => resolve(null)
      })
    } catch {
      // Fallback to localStorage
      try {
        const raw = localStorage.getItem(`cache:${key}`)
        return raw ? JSON.parse(raw) : null
      } catch {
        return null
      }
    }
  }

  async function set<T>(key: string, value: T): Promise<void> {
    try {
      const db = await openDb()
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readwrite')
        const store = tx.objectStore(STORE_NAME)
        store.put(value, key)
        tx.oncomplete = () => resolve()
        tx.onerror = () => resolve()
      })
    } catch {
      // Fallback to localStorage
      try {
        localStorage.setItem(`cache:${key}`, JSON.stringify(value))
      } catch {
        // Storage full or unavailable
      }
    }
  }

  async function remove(key: string): Promise<void> {
    try {
      const db = await openDb()
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readwrite')
        const store = tx.objectStore(STORE_NAME)
        store.delete(key)
        tx.oncomplete = () => resolve()
        tx.onerror = () => resolve()
      })
    } catch {
      try {
        localStorage.removeItem(`cache:${key}`)
      } catch {}
    }
  }

  return { get, set, remove }
}
