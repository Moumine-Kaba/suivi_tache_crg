/**
 * Application Express - Backend d'authentification
 * Crédit Rural de Guinée - Plateforme interne
 */
import express from 'express'
import cors from 'cors'
import authRoutes from './routes/auth.js'
import { securityLogger } from './utils/logger.js'

const app = express()

// CORS - Autoriser le frontend (adapter les origines en production)
const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
  : ['http://localhost:5173', 'http://localhost:3000', 'https://missions.crg.gn']
app.use(cors({
  origin: corsOrigins,
  credentials: true,
}))

app.use(express.json())

// Routes
app.use('/api/auth', authRoutes)

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'crg-auth' })
})

// 404
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route non trouvée' })
})

// Gestion des erreurs
app.use((err, req, res, next) => {
  securityLogger.error('Unhandled error', { error: err.message, stack: err.stack })
  res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Erreur serveur' : err.message,
  })
})

export default app
