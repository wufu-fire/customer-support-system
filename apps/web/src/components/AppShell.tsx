import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Button, Layout, Menu, Space, Spin, Typography } from 'antd'
import { useAuth } from '../contexts/auth-context'

const { Header, Content } = Layout

export default function AppShell() {
  const { user, isInitializing, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const selectedKey =
    location.pathname === '/' ? '/' : `/${location.pathname.split('/')[1]}`

  const handleLogout = async (): Promise<void> => {
    await logout()
    navigate('/', { replace: true })
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          background: '#fff',
          borderBottom: '1px solid #f0f0f0',
        }}
      >
        <Typography.Title level={4} style={{ margin: 0 }}>
          TailCareHub
        </Typography.Title>
        <Menu
          mode="horizontal"
          selectedKeys={[selectedKey]}
          style={{ flex: 1, borderBottom: 'none' }}
          items={[
            { key: '/', label: <Link to="/">Support</Link> },
            ...(user
              ? [
                  {
                    key: '/account',
                    label: <Link to="/account">Account</Link>,
                  },
                ]
              : []),
          ]}
        />
        <Space>
          {isInitializing ? (
            <Spin size="small" />
          ) : user ? (
            <>
              <Typography.Text type="secondary">{user.email}</Typography.Text>
              <Button onClick={handleLogout}>Sign out</Button>
            </>
          ) : (
            <>
              <Button onClick={() => navigate('/login')}>Sign in</Button>
              <Button type="primary" onClick={() => navigate('/register')}>
                Sign up
              </Button>
            </>
          )}
        </Space>
      </Header>
      <Content>
        <Outlet />
      </Content>
    </Layout>
  )
}
