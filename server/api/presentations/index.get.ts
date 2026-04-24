import { dbAll } from '../../utils/db'

export default defineEventHandler(async () => {
  const rows = await dbAll(`
    SELECT p.*, COUNT(s.id) as slide_count
    FROM presentations p
    LEFT JOIN slides s ON s.presentation_id = p.id
    GROUP BY p.id
    ORDER BY p.updated_at DESC
  `)
  return rows
})
