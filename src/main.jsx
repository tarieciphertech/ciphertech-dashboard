import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import SetupPassword from './auth/SetupPassword'
import { AuthProvider } from './auth/AuthProvider'
import './styles.css'

// Load the official Cypher brand layer after the app stylesheet so it is the final visual layer.
const brandStylesheet = document.createElement('link')
brandStylesheet.rel = 'stylesheet'
brandStylesheet.href = `/branding.css?v=20260908-premium`
document.head.appendChild(brandStylesheet)

function Root() {
  return window.location.pathname === '/auth/setup-password' ? <SetupPassword /> : <App />
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Root />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
