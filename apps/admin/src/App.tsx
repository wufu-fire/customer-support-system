import { useMemo, useState } from 'react'
import { Alert, Button, Card, Form, Input, Select, Space, Typography } from 'antd'
import './App.css'

type UpdateTicketStatusPayload = {
  toStatus: 'in_progress' | 'waiting_customer' | 'resolved' | 'closed'
  comment?: string
  changedByAdminId?: string
}

type UpdateStatusResponse = {
  id: string
  ticketNo: string
  status: string
  updatedAt: string
}

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001'

type ApiErrorLike = {
  message?: string
}

async function parseResponseBody(response: Response): Promise<ApiErrorLike | null> {
  const contentType = response.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) {
    return null
  }
  try {
    return await response.json()
  } catch {
    return null
  }
}

function App() {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<UpdateStatusResponse | null>(null)
  const apiHint = useMemo(() => API_BASE_URL, [])

  const onFinish = async (values: {
    ticketId: string
    toStatus: UpdateTicketStatusPayload['toStatus']
    comment?: string
    changedByAdminId?: string
  }) => {
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const payload: UpdateTicketStatusPayload = {
        toStatus: values.toStatus,
        comment: values.comment || undefined,
        changedByAdminId: values.changedByAdminId || undefined,
      }
      const response = await fetch(
        `${API_BASE_URL}/admin/tickets/${values.ticketId}/status`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      )
      const data = await parseResponseBody(response)
      if (!response.ok) {
        throw new Error(
          typeof data?.message === 'string'
            ? data.message
            : 'Failed to update status',
        )
      }
      setResult(data as UpdateStatusResponse)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="page">
      <header className="page-header">
        <Typography.Title level={2}>Admin Ticket Status Panel</Typography.Title>
        <Typography.Paragraph>
          Update ticket lifecycle using the admin status API.
        </Typography.Paragraph>
        <Typography.Text type="secondary">API Base URL: {apiHint}</Typography.Text>
      </header>
      <Card title="Update Ticket Status">
        <Form layout="vertical" form={form} onFinish={onFinish}>
          <Form.Item
            label="Ticket ID (UUID)"
            name="ticketId"
            rules={[
              { required: true, message: 'Please enter ticket id' },
              {
                pattern:
                  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
                message: 'Please enter a valid UUID',
              },
            ]}
          >
            <Input placeholder="e.g. 50f0fcb6-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
          </Form.Item>
          <Form.Item
            label="Target Status"
            name="toStatus"
            rules={[{ required: true, message: 'Please select status' }]}
          >
            <Select
              options={[
                { label: 'in_progress', value: 'in_progress' },
                { label: 'waiting_customer', value: 'waiting_customer' },
                { label: 'resolved', value: 'resolved' },
                { label: 'closed', value: 'closed' },
              ]}
            />
          </Form.Item>
          <Form.Item label="Comment (optional)" name="comment">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item label="Changed By Admin ID (optional)" name="changedByAdminId">
            <Input placeholder="admin user uuid" />
          </Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={loading}>
              Update Status
            </Button>
          </Space>
        </Form>
        {error ? <Alert className="result-alert" type="error" showIcon message={error} /> : null}
        {result ? (
          <Alert
            className="result-alert"
            type="success"
            showIcon
            message={`Updated ${result.ticketNo}`}
            description={`Status: ${result.status} | Updated: ${result.updatedAt}`}
          />
        ) : null}
      </Card>
    </main>
  )
}

export default App
