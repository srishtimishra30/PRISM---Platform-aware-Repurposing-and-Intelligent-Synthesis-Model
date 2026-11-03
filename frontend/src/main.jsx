import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { GenerationProvider } from './context/GenerationContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GenerationProvider>
      <App />
    </GenerationProvider>
  </StrictMode>,
)
