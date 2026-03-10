/**
 * AuthController - Gestion des requêtes d'authentification
 * Inscription et connexion - Crédit Rural de Guinée
 */
import * as AuthService from '../services/AuthService.js'
import { securityLogger } from '../utils/logger.js'

/**
 * POST /api/auth/register
 * Inscription - Email @creditruralgn.com uniquement
 * Envoi d'un email de confirmation (compte inactif jusqu'à confirmation)
 */
export async function register(req, res) {
  try {
    const { email, password, nom, prenom, name, role, direction, fonction } = req.body
    const ip = req.ip || req.connection?.remoteAddress
    const userAgent = req.get('User-Agent') || ''

    const result = await AuthService.register(
      { email, password, nom, prenom, name, role, direction, fonction },
      ip,
      userAgent
    )

    res.status(201).json(result)
  } catch (err) {
    securityLogger.error('AuthController.register', { error: err.message })
    const status = err.message?.includes('déjà enregistré') ? 409 : 400
    res.status(status).json({
      success: false,
      message: err.message || 'Erreur lors de l\'inscription',
    })
  }
}

/**
 * POST /api/auth/login
 * Connexion - Retourne la session Supabase (access_token, refresh_token)
 */
export async function login(req, res) {
  try {
    const { email, password } = req.body
    const ip = req.ip || req.connection?.remoteAddress
    const userAgent = req.get('User-Agent') || ''

    const result = await AuthService.login(email, password, ip, userAgent)

    res.json({
      success: true,
      user: result.user,
      session: result.session,
    })
  } catch (err) {
    securityLogger.error('AuthController.login', { error: err.message })
    const status = err.message?.includes('incorrect') ? 401 : 400
    res.status(status).json({
      success: false,
      message: err.message || 'Erreur de connexion',
    })
  }
}
