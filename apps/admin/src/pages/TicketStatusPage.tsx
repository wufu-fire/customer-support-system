import { useMemo, useState } from 'react'
import { Alert, Button, Card, Form, Input, Select, Space, Typography } from 'antd'
import { useAuth } from '../contexts/auth-context'
import { API_BASE_URL, ApiError, fetchJson } from '../lib/api'

type UpdateTicketStatusPayload = {
  toStatus: 'accepted' | 'in_progress' | 'resolved' | 'closed'
  comment?: string
}

type UpdateStatusResponse = {
  id: string
  ticketNo: string
  status: string
  updatedAt: string
}

export default function TicketStatusPage() {
  const { accessToken } = useAuth()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<UpdateStatusResponse | null>(null)
  const apiHint = useMemo(() => API_BASE_URL, [])

  const onFinish = async (values: {
    ticketId: string
    toStatus: UpdateTicketStatusPayload['toStatus']
    comment?: string
  }): Promise<void> => {
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const payload: UpdateTicketStatusPayload = {
        toStatus: values.toStatus,
        comment: values.comment || undefined,
      }
      const response = await fetchJson<UpdateStatusResponse>(
        `/admin/tickets/${values.ticketId}/status`,
        {
          method: 'PATCH',
          body: payload,
          accessToken,
        },
      )
      setResult(response)
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to update status',
      )
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
                { label: 'accepted', value: 'accepted' },
                { label: 'in_progress', value: 'in_progress' },
                { label: 'resolved', value: 'resolved' },
                { label: 'closed', value: 'closed' },
              ]}
            />
          </Form.Item>
          <Form.Item label="Comment (optional)" name="comment">
            <Input.TextArea rows={3} />
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
