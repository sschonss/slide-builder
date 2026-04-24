import { dbAll } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)

  if (!session?.user?.id) {
    return []
  }

  const rows = await dbAll(`
    SELECT p.*, COUNT(s.id) as slide_count
    FROM presentations p
    LEFT JOIN slides s ON s.presentation_id = p.id
    WHERE p.user_id = ?
    GROUP BY p.id
    ORDER BY p.updated_at DESC
  `, [session.user.id])

  return rows
})
