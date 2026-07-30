import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Provider } from 'react-redux'
import './index.css'
import App from './App.jsx'
import store from './redux/store.js'
import { bootstrapSession, sessionExpired } from './redux/authSlice.js'
import { setSessionExpiredHandler } from './api/client.js'

// BrowserRouter lets us use pages/routes (react-router-dom)
// Provider gives every page access to the Redux store, which now also holds
// the logged in user (see redux/authSlice.js). The old AuthProvider is gone -
// auth moved into Redux in issue #3, and useAuth() reads it from there.

// Lets the axios layer clear the user when a refresh fails mid-session.
// Registered here, in the composition root, so api/client.js needs no
// import of the store and there is no circular dependency.
setSessionExpiredHandler(() => {
  store.dispatch(sessionExpired())
})

// Try to restore the session before the first render. There is no access
// token after a reload, but the httpOnly refresh cookie survives, so this
// trades it for a fresh one. Dispatched here rather than in a useEffect so
// StrictMode's double-invoked effects cannot fire two refreshes - which the
// server would read as token reuse and revoke every session.
store.dispatch(bootstrapSession())

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </Provider>
  </StrictMode>,
)
