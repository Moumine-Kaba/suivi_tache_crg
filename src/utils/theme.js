const THEME_KEY = 'crg-theme'
const ALLOWED_THEMES = ['light', 'dark', 'midnight', 'system']

let systemThemeListenerAttached = false

const isDarkSystemPreference = () => window.matchMedia('(prefers-color-scheme: dark)').matches

const resolveTheme = (theme) => {
  if (theme === 'system') {
    return isDarkSystemPreference() ? 'dark' : 'light'
  }
  return theme
}

const applyResolvedTheme = (resolvedTheme) => {
  const root = document.documentElement
  // Le thème "midnight" utilise aussi la palette sombre (classe Tailwind dark)
  root.classList.toggle('dark', resolvedTheme === 'dark' || resolvedTheme === 'midnight')
  root.setAttribute('data-theme', resolvedTheme)
}

const handleSystemThemeChange = () => {
  const storedTheme = getTheme()
  if (storedTheme === 'system') {
    applyResolvedTheme(resolveTheme(storedTheme))
  }
}

const attachSystemThemeListener = () => {
  if (systemThemeListenerAttached) return
  const media = window.matchMedia('(prefers-color-scheme: dark)')
  media.addEventListener('change', handleSystemThemeChange)
  systemThemeListenerAttached = true
}

export const getTheme = () => {
  const stored = localStorage.getItem(THEME_KEY)
  if (stored && ALLOWED_THEMES.includes(stored)) {
    return stored
  }
  return 'light' // thème par défaut : fond blanc
}

export const setTheme = (theme) => {
  const safeTheme = ALLOWED_THEMES.includes(theme) ? theme : 'system'
  localStorage.setItem(THEME_KEY, safeTheme)

  const root = document.documentElement
  root.setAttribute('data-theme-preference', safeTheme)
  applyResolvedTheme(resolveTheme(safeTheme))
}

export const initTheme = () => {
  attachSystemThemeListener()
  const theme = getTheme()
  setTheme(theme)
}



