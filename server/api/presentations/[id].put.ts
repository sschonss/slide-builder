import { dbRun } from '../../utils/db'
import { requireOwnership } from '../../utils/ownership'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  await requireOwnership(event, id)
  const body = await readBody(event)

  const fields: string[] = []
  const values: any[] = []

  if (body.title !== undefined) { fields.push('title = ?'); values.push(body.title) }
  if (body.theme_id !== undefined) { fields.push('theme_id = ?'); values.push(body.theme_id) }
  if (body.visibility !== undefined) { fields.push('visibility = ?'); values.push(body.visibility) }

  fields.push("updated_at = datetime('now')")
  values.push(id)

  await dbRun(`UPDATE presentations SET ${fields.join(', ')} WHERE id = ?`, values)

  return { success: true }
})
