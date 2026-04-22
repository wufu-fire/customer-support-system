import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './contexts/auth-context'
import AppShell from './components/AppShell'
import RequireAuth from './components/RequireAuth'
import TicketsPage from './pages/TicketsPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import AccountPage from './pages/AccountPage'
import './App.css'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />
          <Route element={<RequireAuth />}>
            <Route element={<AppShell />}>
              <Route index element={<TicketsPage />} />
              <Route path="account" element={<AccountPage />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
