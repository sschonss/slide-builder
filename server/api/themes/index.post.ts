import { getDb } from '../../utils/db'
import { v4 as uuid } from 'uuid'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const db = getDb()
  const id = uuid()

  db.prepare('INSERT INTO themes (id, name, config) VALUES (?, ?, ?)').run(
    id, body.name, JSON.stringify(body.config)
  )

  return { id, name: body.name, config: body.config }
})
