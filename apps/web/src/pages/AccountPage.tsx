import { Card, Descriptions, Typography } from 'antd'
import { useAuth } from '../contexts/auth-context'

export default function AccountPage() {
  const { user } = useAuth()
  if (!user) {
    return null
  }
  return (
    <div className="page">
      <Typography.Title level={2}>My Account</Typography.Title>
      <Card className="card">
        <Descriptions column={1} bordered size="small">
          <Descriptions.Item label="Email">{user.email}</Descriptions.Item>
          <Descriptions.Item label="Name">{user.name ?? '-'}</Descriptions.Item>
          <Descriptions.Item label="Locale">{user.locale}</Descriptions.Item>
          <Descriptions.Item label="Email verified">
            {user.emailVerifiedAt ? user.emailVerifiedAt : 'Not verified'}
          </Descriptions.Item>
        </Descriptions>
      </Card>
    </div>
  )
}
