import { dbAll } from '../../utils/db'

export default defineEventHandler(async () => {
  const rows = await dbAll('SELECT * FROM themes ORDER BY name')
  return rows.map(row => ({
    ...row,
    config: JSON.parse((row as any).config),
  }))
})
