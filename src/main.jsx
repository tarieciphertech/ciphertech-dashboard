import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import OperationalApp from './OperationalApp'
import SetupPassword from './auth/SetupPassword'
import { AuthProvider } from './auth/AuthProvider'
import './styles.css'

const brandStylesheet=document.createElement('link')
brandStylesheet.rel='stylesheet'
brandStylesheet.href='/branding.css?v=20260908-premium'
document.head.appendChild(brandStylesheet)

const uiPolishStylesheet=document.createElement('link')
uiPolishStylesheet.rel='stylesheet'
uiPolishStylesheet.href='/ui-polish.css?v=20260912'
document.head.appendChild(uiPolishStylesheet)

function Root(){return window.location.pathname==='/auth/setup-password'?<SetupPassword/>:<OperationalApp/>}
ReactDOM.createRoot(document.getElementById('root')).render(<React.StrictMode><BrowserRouter><AuthProvider><Root/></AuthProvider></BrowserRouter></React.StrictMode>)
