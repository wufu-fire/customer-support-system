import { Outlet, useNavigate } from 'react-router-dom'
import { Button, Layout, Space, Spin, Typography } from 'antd'
import { useAuth } from '../contexts/auth-context'

const { Header, Content } = Layout

export default function AppShell() {
  const { user, isInitializing, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async (): Promise<void> => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#fff',
          borderBottom: '1px solid #f0f0f0',
        }}
      >
        <Typography.Title level={4} style={{ margin: 0 }}>
          TailCareHub Admin
        </Typography.Title>
        <Space>
          {isInitializing ? (
            <Spin size="small" />
          ) : (
            <>
              <Typography.Text type="secondary">{user?.email}</Typography.Text>
              <Button onClick={handleLogout}>Sign out</Button>
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
