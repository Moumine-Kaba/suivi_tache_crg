import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { initTheme } from './utils/theme'

// Gestion d'erreur globale pour éviter les pages blanches
window.addEventListener('error', (event) => {
  console.error('❌ Erreur globale:', event.error)
  console.error('Fichier:', event.filename, 'Ligne:', event.lineno)
})

window.addEventListener('unhandledrejection', (event) => {
  console.error('❌ Promesse rejetée non gérée:', event.reason)
  event.preventDefault() // Empêcher le message d'erreur par défaut
})

// Fonction pour afficher une erreur à l'écran
function showError(message) {
  const errorDiv = document.createElement('div')
  errorDiv.id = 'app-error'
  errorDiv.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    font-family: Arial, sans-serif;
    background: var(--bg-background);
    z-index: 9999;
    padding: 2rem;
  `
  errorDiv.innerHTML = `
    <div style="background: var(--bg-card); color: var(--text-foreground); padding: 2rem; border-radius: 0.75rem; border: 1px solid var(--border-color); box-shadow: var(--shadow-card); max-width: 500px;">
      <h1 style="color: var(--accent-error); margin-bottom: 1rem; font-size: 1.5rem;">Erreur de chargement</h1>
      <p style="color: var(--text-muted); margin-bottom: 1.5rem; line-height: 1.5;">${message}</p>
      <button onclick="window.location.reload()" style="padding: 0.75rem 1.5rem; background: var(--accent-primary); color: var(--text-on-primary); border: none; border-radius: 0.75rem; cursor: pointer; font-size: 1rem;">
        Recharger la page
      </button>
      <p style="color: var(--text-muted); font-size: 0.875rem; margin-top: 1rem;">Ouvre la console (F12) pour plus de détails</p>
    </div>
  `
  document.body.appendChild(errorDiv)
}

try {
  initTheme()

  const rootElement = document.getElementById('root')
  if (!rootElement) {
    throw new Error('Élément root non trouvé dans le DOM')
  }

  const root = createRoot(rootElement)
  root.render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>
  )
} catch (error) {
  console.error('❌ Erreur lors du rendu de l\'application:', error)
  console.error('Stack:', error.stack)
  showError(error.message || 'Une erreur inattendue s\'est produite')
}
