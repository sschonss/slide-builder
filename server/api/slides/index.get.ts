import { getDb } from '../../utils/db'

export default defineEventHandler((event) => {
  const query = getQuery(event)
  const presentationId = query.presentation_id as string
  if (!presentationId) throw createError({ statusCode: 400, message: 'presentation_id required' })

  const db = getDb()
  const rows = db.prepare(
    'SELECT * FROM slides WHERE presentation_id = ? ORDER BY "order" ASC'
  ).all(presentationId) as any[]

  return rows.map(r => ({ ...r, data: JSON.parse(r.data) }))
})
