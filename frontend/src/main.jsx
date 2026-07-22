import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Provider } from 'react-redux'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import store from './redux/store.js'

// BrowserRouter lets us use pages/routes (react-router-dom)
// AuthProvider gives every page access to the logged in user (see AuthContext.jsx)
// Provider gives every page access to the Redux store (see redux/store.js)
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Provider store={store}>
          <App />
        </Provider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
