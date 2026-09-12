import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import OperationalApp from './OperationalApp'
import SetupPassword from './auth/SetupPassword'
import { AuthProvider } from './auth/AuthProvider'
import './styles.css'

const brandStylesheet=document.createElement('link')
brandStylesheet.rel='stylesheet'
brandStylesheet.href='/branding.css?v=20260912-system'
document.head.appendChild(brandStylesheet)

const sidebarStylesheet=document.createElement('link')
sidebarStylesheet.rel='stylesheet'
sidebarStylesheet.href='/sidebar-scroll.css?v=20260912'
document.head.appendChild(sidebarStylesheet)

function Root(){return window.location.pathname==='/auth/setup-password'?<SetupPassword/>:<OperationalApp/>}
ReactDOM.createRoot(document.getElementById('root')).render(<React.StrictMode><BrowserRouter><AuthProvider><Root/></AuthProvider></BrowserRouter></React.StrictMode>)
