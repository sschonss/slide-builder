import { dbGet, dbRun } from './db'

interface GitHubUser {
  id: number
  login: string
  name: string | null
  avatar_url: string
}

export async function findOrCreateUser(ghUser: GitHubUser) {
  const userId = String(ghUser.id)
  const existing = await dbGet('SELECT * FROM users WHERE id = ?', [userId])

  if (existing) {
    await dbRun(
      `UPDATE users SET username = ?, name = ?, avatar_url = ?, updated_at = datetime('now') WHERE id = ?`,
      [ghUser.login, ghUser.name || ghUser.login, ghUser.avatar_url, userId]
    )
  } else {
    await dbRun(
      'INSERT INTO users (id, username, name, avatar_url) VALUES (?, ?, ?, ?)',
      [userId, ghUser.login, ghUser.name || ghUser.login, ghUser.avatar_url]
    )
  }

  return {
    id: userId,
    username: ghUser.login,
    name: ghUser.name || ghUser.login,
    avatarUrl: ghUser.avatar_url,
  }
}
