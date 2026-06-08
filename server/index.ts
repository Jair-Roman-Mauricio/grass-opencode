import express from 'express'
import cors from 'cors'
import { pool, initSchema } from './db.js'
import 'dotenv/config'

const app = express()
const PORT = Number(process.env.API_PORT ?? 3001)

app.use(cors())
app.use(express.json({ limit: '1mb' }))

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1')
    res.json({ ok: true, db: 'up' })
  } catch (err) {
    res.status(503).json({ ok: false, db: 'down', error: String(err) })
  }
})

app.get('/api/saves', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, created_at, money, total_cut
         FROM saves
        ORDER BY updated_at DESC
        LIMIT 50`
    )
    res.json(rows)
  } catch (err) {
    console.error('[api] GET /saves', err)
    res.status(500).json({ error: 'db_error' })
  }
})

app.get('/api/saves/:id', async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'invalid_id' })
  try {
    const { rows } = await pool.query(
      `SELECT id, created_at, updated_at, money, total_cut, last_position, data
         FROM saves WHERE id = $1`,
      [id]
    )
    if (rows.length === 0) return res.status(404).json({ error: 'not_found' })
    res.json(rows[0])
  } catch (err) {
    console.error('[api] GET /saves/:id', err)
    res.status(500).json({ error: 'db_error' })
  }
})

app.post('/api/saves', async (req, res) => {
  const { money = 0, total_cut = 0, last_position = null, data = null } = req.body ?? {}
  try {
    const { rows } = await pool.query(
      `INSERT INTO saves (money, total_cut, last_position, data)
            VALUES ($1, $2, $3, $4)
        RETURNING id, created_at, money, total_cut`,
      [money, total_cut, last_position, data]
    )
    res.status(201).json(rows[0])
  } catch (err) {
    console.error('[api] POST /saves', err)
    res.status(500).json({ error: 'db_error' })
  }
})

app.put('/api/saves/:id', async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'invalid_id' })
  const { money, total_cut, last_position, data } = req.body ?? {}
  try {
    const { rows } = await pool.query(
      `UPDATE saves
          SET money        = COALESCE($2, money),
              total_cut    = COALESCE($3, total_cut),
              last_position= COALESCE($4, last_position),
              data         = COALESCE($5, data),
              updated_at   = NOW()
        WHERE id = $1
        RETURNING id, created_at, updated_at, money, total_cut`,
      [id, money, total_cut, last_position, data]
    )
    if (rows.length === 0) return res.status(404).json({ error: 'not_found' })
    res.json(rows[0])
  } catch (err) {
    console.error('[api] PUT /saves/:id', err)
    res.status(500).json({ error: 'db_error' })
  }
})

app.delete('/api/saves/:id', async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'invalid_id' })
  try {
    const { rowCount } = await pool.query(`DELETE FROM saves WHERE id = $1`, [id])
    if (rowCount === 0) return res.status(404).json({ error: 'not_found' })
    res.status(204).end()
  } catch (err) {
    console.error('[api] DELETE /saves/:id', err)
    res.status(500).json({ error: 'db_error' })
  }
})

async function start() {
  try {
    await initSchema()
    console.log('[api] schema ready')
  } catch (err) {
    console.error('[api] failed to init schema:', err)
    process.exit(1)
  }
  app.listen(PORT, () => {
    console.log(`[api] listening on http://localhost:${PORT}`)
  })
}

start()
