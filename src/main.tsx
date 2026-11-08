import './utils/resetOnLaunch' // first: every launch starts from defaults (see the file)
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { perfMark } from './utils/perfMarks'

perfMark('js-evaluated')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
