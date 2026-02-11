import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './contexts/AuthContext'
import eruda from 'eruda'

// Initialize eruda for mobile debugging in development
if (import.meta.env.DEV) {
  eruda.init()
}

createRoot(document.getElementById('root')).render(
  <AuthProvider>
    <App />
  </AuthProvider>
)
