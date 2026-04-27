import { findOrCreateUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  if (!import.meta.dev) {
    throw createError({ statusCode: 404, message: 'Not found' })
  }

  const devUser = await findOrCreateUser({
    id: 999999,
    login: 'dev-user',
    name: 'Dev User',
    avatar_url: 'https://avatars.githubusercontent.com/u/0',
  })

  await setUserSession(event, {
    user: {
      id: devUser.id,
      username: devUser.username,
      name: devUser.name,
      avatarUrl: devUser.avatarUrl,
    },
  })

  return { ok: true }
})
