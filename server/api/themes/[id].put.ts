import { dbRun } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)

  await dbRun('UPDATE themes SET name = ?, config = ? WHERE id = ?', [
    body.name, JSON.stringify(body.config), id
  ])

  return { id, name: body.name, config: body.config }
})
