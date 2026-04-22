import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Alert, Button, Card, Form, Input, Typography } from 'antd'
import { useAuth } from '../contexts/auth-context'
import { ApiError } from '../lib/api'

type RegisterFormValues = {
  email: string
  password: string
  confirmPassword: string
  name?: string
}

export default function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const onFinish = async (values: RegisterFormValues): Promise<void> => {
    setError('')
    setLoading(true)
    try {
      await register({
        email: values.email,
        password: values.password,
        name: values.name?.trim() || undefined,
      })
      navigate('/account', { replace: true })
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Unable to create account',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <Card className="auth-card" title="Create an account">
        <Typography.Paragraph type="secondary">
          Sign up with your email and a strong password.
        </Typography.Paragraph>
        <Form<RegisterFormValues> layout="vertical" onFinish={onFinish}>
          <Form.Item label="Name (optional)" name="name">
            <Input autoComplete="name" />
          </Form.Item>
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
            rules={[
              { required: true, message: 'Please enter a password' },
              { min: 10, message: 'Password must be at least 10 characters' },
              { max: 128, message: 'Password is too long' },
            ]}
            hasFeedback
          >
            <Input.Password autoComplete="new-password" />
          </Form.Item>
          <Form.Item
            label="Confirm password"
            name="confirmPassword"
            dependencies={['password']}
            hasFeedback
            rules={[
              { required: true, message: 'Please confirm your password' },
              ({ getFieldValue }) => ({
                validator(_rule, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve()
                  }
                  return Promise.reject(new Error('Passwords do not match'))
                },
              }),
            ]}
          >
            <Input.Password autoComplete="new-password" />
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
            Create account
          </Button>
        </Form>
        <Typography.Paragraph style={{ marginTop: 16 }}>
          Already have an account? <Link to="/login">Sign in</Link>.
        </Typography.Paragraph>
      </Card>
    </div>
  )
}
