import { getDb } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const db = getDb()

  const update = db.prepare('UPDATE slides SET "order" = ? WHERE id = ?')
  const runAll = db.transaction((slides: { id: string; order: number }[]) => {
    for (const s of slides) {
      update.run(s.order, s.id)
    }
  })

  runAll(body.slides)
  return { success: true }
})
