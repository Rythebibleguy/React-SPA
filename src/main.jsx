import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import eruda from 'eruda'

// Initialize eruda for mobile debugging in development
if (import.meta.env.DEV) {
  eruda.init()
}

createRoot(document.getElementById('root')).render(
  <App />
)
