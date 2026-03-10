/**
 * Routes d'authentification
 * /api/auth/register - Inscription
 * /api/auth/login - Connexion
 */
import { Router } from 'express'
import * as AuthController from '../controllers/AuthController.js'
import { validateRegister, validateLogin } from '../middleware/validation.js'
import { signupLimiter, loginLimiter } from '../middleware/rateLimit.js'
import { verifyCaptcha } from '../middleware/recaptcha.js'

const router = Router()

// Inscription : rate limit + CAPTCHA + validation + controller
router.post(
  '/register',
  signupLimiter,
  verifyCaptcha,
  validateRegister,
  AuthController.register
)

// Connexion : rate limit + validation + controller
router.post(
  '/login',
  loginLimiter,
  validateLogin,
  AuthController.login
)

export default router
