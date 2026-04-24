import { findOrCreateUser } from '../../utils/auth'

export default defineOAuthGitHubEventHandler({
  async onSuccess(event, { user }) {
    const dbUser = await findOrCreateUser({
      id: user.id,
      login: user.login,
      name: user.name,
      avatar_url: user.avatar_url,
    })

    await setUserSession(event, {
      user: {
        id: dbUser.id,
        username: dbUser.username,
        name: dbUser.name,
        avatarUrl: dbUser.avatarUrl,
      },
    })

    return sendRedirect(event, '/dashboard')
  },
  onError(event, error) {
    console.error('[slide-builder] GitHub OAuth error:', error)
    return sendRedirect(event, '/?error=auth')
  },
})
