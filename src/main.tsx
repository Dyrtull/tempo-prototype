/**
 * main.tsx
 * Entry point: mounts React, wraps the app in the language provider and a
 * HashRouter (hash URLs work on GitHub Pages with no server configuration).
 * Also starts the 1-minute "tick" that simulates server jobs (see api/tick).
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import './index.css'
import App from './App'
import { LangProvider } from './hooks'
import { tick } from './api'

tick()
setInterval(tick, 60_000)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LangProvider>
      <HashRouter>
        <App />
      </HashRouter>
    </LangProvider>
  </StrictMode>,
)
