import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { reportFrontendError } from './api/client'

window.addEventListener('error', (event) => {
  reportFrontendError(event.message, { stack: event.error?.stack, url: window.location.href })
})
window.addEventListener('unhandledrejection', (event) => {
  reportFrontendError(String(event.reason), { url: window.location.href })
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
