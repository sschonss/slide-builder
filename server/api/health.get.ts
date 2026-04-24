import { dbGet } from '../utils/db'

export default defineEventHandler(async () => {
  const checks: Record<string, any> = {
    timestamp: new Date().toISOString(),
    env: {
      tursoUrl: process.env.NUXT_TURSO_URL ? 'SET' : 'NOT_SET',
      tursoToken: process.env.NUXT_TURSO_TOKEN ? 'SET' : 'NOT_SET',
      nodeVersion: process.version,
      platform: process.platform,
    },
  }

  try {
    const result = await dbGet('SELECT 1 as test')
    checks.db = { status: 'ok', result }
  } catch (err: any) {
    checks.db = {
      status: 'error',
      message: err.message,
      code: err.code,
    }
  }

  return checks
})
