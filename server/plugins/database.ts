import { initDb } from '../utils/db'
import { mkdirSync } from 'fs'
import { join } from 'path'

export default defineNitroPlugin(() => {
  mkdirSync(join(process.cwd(), 'data', 'assets'), { recursive: true })
  mkdirSync(join(process.cwd(), 'output'), { recursive: true })
  initDb()
  console.log('[slide-builder] Database initialized')
})
