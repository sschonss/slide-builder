import { dbGet } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const row = await dbGet('SELECT * FROM themes WHERE id = ?', [id]) as any

  if (!row) throw createError({ statusCode: 404, message: 'Theme not found' })

  return { ...row, config: JSON.parse(row.config) }
})
