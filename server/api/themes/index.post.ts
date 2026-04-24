import { dbRun } from '../../utils/db'
import { v4 as uuid } from 'uuid'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const id = uuid()

  await dbRun('INSERT INTO themes (id, name, config) VALUES (?, ?, ?)', [
    id, body.name, JSON.stringify(body.config)
  ])

  return { id, name: body.name, config: body.config }
})
