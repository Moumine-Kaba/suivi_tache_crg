/**
 * Serveur d'authentification - Crédit Rural de Guinée
 * Démarrage de l'application Express
 */
import app from './app.js'
import { config } from './config/index.js'

const PORT = config.port

app.listen(PORT, () => {
  console.log(`[CRG Auth] Serveur démarré sur le port ${PORT}`)
  console.log(`[CRG Auth] Domaine email autorisé: @${config.allowedEmailDomain}`)
  console.log(`[CRG Auth] Rate limit: ${config.rateLimit.max} inscriptions / ${config.rateLimit.windowMs / 60000} min`)
})
