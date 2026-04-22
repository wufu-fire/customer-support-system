import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './contexts/auth-context'
import AppShell from './components/AppShell'
import RequireAuth from './components/RequireAuth'
import LoginPage from './pages/LoginPage'
import TicketStatusPage from './pages/TicketStatusPage'
import './App.css'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="login" element={<LoginPage />} />
          <Route element={<RequireAuth />}>
            <Route element={<AppShell />}>
              <Route index element={<TicketStatusPage />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
