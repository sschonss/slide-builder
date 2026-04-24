import { getDb } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)
  const db = getDb()

  db.prepare('UPDATE themes SET name = ?, config = ? WHERE id = ?').run(
    body.name, JSON.stringify(body.config), id
  )

  return { id, name: body.name, config: body.config }
})
