import { dbAll } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const q = (query.q as string || '').trim()

  if (!q || q.length < 2) {
    return []
  }

  const pattern = `%${q}%`
  const users = await dbAll(
    `SELECT id, username, name, avatar_url, created_at
     FROM users
     WHERE username LIKE ? OR name LIKE ?
     ORDER BY username ASC
     LIMIT 20`,
    [pattern, pattern]
  )

  return users
})
