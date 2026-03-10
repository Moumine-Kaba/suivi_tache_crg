import { Component } from 'react'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('❌ Erreur capturée par ErrorBoundary:', error)
    console.error('Détails:', errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          flexDirection: 'column',
          fontFamily: 'Arial, sans-serif',
          background: 'var(--bg-background)',
          padding: '2rem'
        }}>
          <div style={{
            background: 'var(--bg-card)',
            color: 'var(--text-foreground)',
            padding: '2rem',
            borderRadius: '0.75rem',
            border: '1px solid var(--border-color)',
            boxShadow: 'var(--shadow-card)',
            maxWidth: '500px',
            textAlign: 'center'
          }}>
            <h1 style={{ color: 'var(--accent-error)', marginBottom: '1rem', fontSize: '1.5rem' }}>
              ⚠️ Erreur de l'application
            </h1>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', lineHeight: '1.5' }}>
              {this.state.error?.message || 'Une erreur inattendue s\'est produite'}
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null })
                window.location.reload()
              }}
              style={{
                padding: '0.75rem 1.5rem',
                background: 'var(--accent-primary)',
                color: 'var(--text-on-primary)',
                border: 'none',
                borderRadius: '0.75rem',
                cursor: 'pointer',
                fontSize: '1rem',
                marginRight: '0.5rem'
              }}
            >
              Recharger la page
            </button>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null })
              }}
              style={{
                padding: '0.75rem 1.5rem',
                background: 'var(--bg-input)',
                color: 'var(--text-foreground)',
                border: '1px solid var(--border-color)',
                borderRadius: '0.75rem',
                cursor: 'pointer',
                fontSize: '1rem'
              }}
            >
              Réessayer
            </button>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '1rem' }}>
              Ouvre la console (F12) pour plus de détails
            </p>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
















