/**
 * SecurityLogModel - Enregistrement des événements de sécurité
 */
import pg from 'pg'
import { config } from '../config/index.js'

const pool = new pg.Pool(config.database)

/**
 * Enregistre un événement de sécurité
 */
export async function log(action, { email, userId, ipAddress, userAgent, success, details }) {
  const client = await pool.connect()
  try {
    await client.query(
      `INSERT INTO public.security_logs (action, email, user_id, ip_address, user_agent, success, details)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        action,
        email || null,
        userId || null,
        ipAddress || null,
        userAgent || null,
        success ?? false,
        details ? JSON.stringify(details) : null,
      ]
    )
  } catch (err) {
    console.error('SecurityLogModel.log error:', err.message)
  } finally {
    client.release()
  }
}
