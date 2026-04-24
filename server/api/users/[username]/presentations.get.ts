import { dbGet, dbAll } from '../../../utils/db'

export default defineEventHandler(async (event) => {
  const username = getRouterParam(event, 'username')

  const user = await dbGet('SELECT id FROM users WHERE username = ?', [username]) as any
  if (!user) {
    throw createError({ statusCode: 404, message: 'Usuário não encontrado' })
  }

  const presentations = await dbAll(`
    SELECT p.id, p.title, p.updated_at, COUNT(s.id) as slide_count
    FROM presentations p
    LEFT JOIN slides s ON s.presentation_id = p.id
    WHERE p.user_id = ? AND p.visibility = 'public'
    GROUP BY p.id
    ORDER BY p.updated_at DESC
  `, [user.id])

  return presentations
})
