import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Alert, Button, Card, Form, Input, Typography } from 'antd'
import { useAuth } from '../contexts/auth-context'
import { ApiError } from '../lib/api'

type LoginFormValues = {
  email: string
  password: string
}

type LocationState = { from?: { pathname?: string } } | null

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const redirectTo =
    ((location.state as LocationState)?.from?.pathname as string | undefined) ??
    '/account'

  const onFinish = async (values: LoginFormValues): Promise<void> => {
    setError('')
    setLoading(true)
    try {
      await login({ email: values.email, password: values.password })
      navigate(redirectTo, { replace: true })
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Unable to sign in',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <Card className="auth-card" title="Sign in">
        <Typography.Paragraph type="secondary">
          Access your account to manage support requests.
        </Typography.Paragraph>
        <Form<LoginFormValues> layout="vertical" onFinish={onFinish}>
          <Form.Item
            label="Email"
            name="email"
            rules={[
              { required: true, message: 'Please enter your email' },
              { type: 'email', message: 'Please enter a valid email' },
            ]}
          >
            <Input autoComplete="email" />
          </Form.Item>
          <Form.Item
            label="Password"
            name="password"
            rules={[{ required: true, message: 'Please enter your password' }]}
          >
            <Input.Password autoComplete="current-password" />
          </Form.Item>
          {error ? (
            <Alert
              className="result-alert"
              type="error"
              showIcon
              message={error}
            />
          ) : null}
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            block
            style={{ marginTop: 8 }}
          >
            Sign in
          </Button>
        </Form>
        <Typography.Paragraph style={{ marginTop: 16 }}>
          Don&apos;t have an account? <Link to="/register">Create one</Link>.
        </Typography.Paragraph>
      </Card>
    </div>
  )
}
