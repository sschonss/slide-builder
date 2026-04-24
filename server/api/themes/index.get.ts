import { getDb } from '../../utils/db'

export default defineEventHandler(() => {
  const db = getDb()
  const rows = db.prepare('SELECT * FROM themes ORDER BY name').all() as any[]
  return rows.map(row => ({
    ...row,
    config: JSON.parse(row.config),
  }))
})
