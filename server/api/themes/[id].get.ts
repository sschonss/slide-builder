import { getDb } from '../../utils/db'

export default defineEventHandler((event) => {
  const id = getRouterParam(event, 'id')
  const db = getDb()
  const row = db.prepare('SELECT * FROM themes WHERE id = ?').get(id) as any

  if (!row) throw createError({ statusCode: 404, message: 'Theme not found' })

  return { ...row, config: JSON.parse(row.config) }
})
