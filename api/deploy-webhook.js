/**
 * Webhook Vercel → Slack pour le suivi des déploiements
 * Reçoit les événements de déploiement Vercel et les envoie dans un canal Slack
 *
 * Configuration requise :
 * - SLACK_WEBHOOK_URL : URL du Incoming Webhook Slack
 * - Webhook Vercel pointant vers https://[votre-domaine]/api/deploy-webhook
 */

const DEPLOYMENT_EVENTS = [
  'deployment.ready',      // Déploiement réussi
  'deployment.error',     // Déploiement échoué
  'deployment.canceled',  // Déploiement annulé
  'deployment.created',  // Déploiement démarré
]

const EVENT_LABELS = {
  'deployment.ready': { emoji: '✅', label: 'Déploiement réussi', color: '#22c55e' },
  'deployment.error': { emoji: '❌', label: 'Déploiement échoué', color: '#ef4444' },
  'deployment.canceled': { emoji: '⏹️', label: 'Déploiement annulé', color: '#f59e0b' },
  'deployment.created': { emoji: '🚀', label: 'Déploiement démarré', color: '#3b82f6' },
}

function buildSlackMessage(type, payload) {
  const config = EVENT_LABELS[type] || { emoji: '📦', label: type, color: '#6b7280' }
  const dep = payload.deployment || {}
  const target = payload.target || 'preview'
  const targetLabel = target === 'production' ? 'Production' : target === 'staging' ? 'Staging' : 'Preview'

  const blocks = [
    {
      type: 'header',
      text: { type: 'plain_text', text: `${config.emoji} ${config.label} - Suivi Tâche CRG`, emoji: true },
    },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*Environnement:*\n${targetLabel}` },
        { type: 'mrkdwn', text: `*Projet:*\n${dep.name || 'suivi_tache_crg'}` },
      ],
    },
  ]

  if (dep.url) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*URL:* <${dep.url}|${dep.url}>`,
      },
    })
  }

  if (payload.links?.deployment) {
    blocks.push({
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: 'Voir le déploiement', emoji: true },
          url: payload.links.deployment,
        },
        ...(payload.links.project ? [{
          type: 'button',
          text: { type: 'plain_text', text: 'Voir le projet', emoji: true },
          url: payload.links.project,
        }] : []),
      ],
    })
  }

  return {
    blocks,
    ...(config.color && { attachments: [{ color: config.color, blocks: [] }] }),
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const webhookUrl = process.env.SLACK_WEBHOOK_URL
  if (!webhookUrl) {
    console.error('SLACK_WEBHOOK_URL non configurée')
    res.status(500).json({ error: 'Configuration Slack manquante' })
    return
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
    const { type, payload } = body

    if (!DEPLOYMENT_EVENTS.includes(type)) {
      res.status(200).json({ received: true, skipped: true, type })
      return
    }

    const slackPayload = {
      ...buildSlackMessage(type, payload),
      username: 'Vercel Deploy',
      icon_emoji: ':vercel:',
    }

    const slackRes = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(slackPayload),
    })

    if (!slackRes.ok) {
      const errText = await slackRes.text()
      console.error('Slack error:', slackRes.status, errText)
      res.status(502).json({ error: 'Échec envoi Slack', details: errText })
      return
    }

    res.status(200).json({ received: true, type, slack: 'sent' })
  } catch (err) {
    console.error('Webhook error:', err)
    res.status(500).json({ error: err.message })
  }
}
