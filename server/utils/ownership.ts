import { dbGet } from './db'
import type { H3Event } from 'h3'

export async function requireAuth(event: H3Event) {
  const session = await getUserSession(event)
  if (!session?.user?.id) {
    throw createError({ statusCode: 401, message: 'Autenticação necessária' })
  }
  return session.user
}

export async function requireOwnership(event: H3Event, presentationId: string) {
  const user = await requireAuth(event)
  const presentation = await dbGet(
    'SELECT user_id FROM presentations WHERE id = ?',
    [presentationId]
  ) as any

  if (!presentation) {
    throw createError({ statusCode: 404, message: 'Apresentação não encontrada' })
  }

  if (presentation.user_id && presentation.user_id !== user.id) {
    throw createError({ statusCode: 403, message: 'Sem permissão para esta apresentação' })
  }

  return user
}
