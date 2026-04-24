import { dbGet } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const username = getRouterParam(event, 'username')

  const user = await dbGet(
    'SELECT id, username, name, avatar_url, created_at FROM users WHERE username = ?',
    [username]
  ) as any

  if (!user) {
    throw createError({ statusCode: 404, message: 'Usuário não encontrado' })
  }

  return user
})
