import { useMemo, useState } from 'react'
import {
  Alert,
  Button,
  Card,
  Col,
  Form,
  Input,
  Row,
  Space,
  Typography,
} from 'antd'
import { API_BASE_URL, ApiError, fetchJson } from '../lib/api'

type CreateTicketPayload = {
  customerName: string
  customerEmail: string
  customerPhone?: string
  orderRefNo?: string
  productName: string
  issueType: string
  issueDescription: string
}

type TrackTicketPayload = {
  ticketNo: string
  email: string
}

type CreateTicketResponse = {
  ticketNo: string
  status: string
  createdAt: string
}

type TrackTicketResponse = {
  ticketNo: string
  status: string
  updatedAt: string
  latestPublicReply: string | null
}

export default function TicketsPage() {
  const [createAntdForm] = Form.useForm<CreateTicketPayload>()
  const [trackAntdForm] = Form.useForm<TrackTicketPayload>()

  const [createLoading, setCreateLoading] = useState(false)
  const [trackLoading, setTrackLoading] = useState(false)
  const [createResult, setCreateResult] = useState<CreateTicketResponse | null>(
    null,
  )
  const [trackResult, setTrackResult] = useState<TrackTicketResponse | null>(null)
  const [createError, setCreateError] = useState('')
  const [trackError, setTrackError] = useState('')

  const apiHint = useMemo(() => API_BASE_URL, [])

  const onSubmitCreate = async (values: CreateTicketPayload): Promise<void> => {
    setCreateError('')
    setCreateResult(null)
    setCreateLoading(true)
    try {
      const payload: CreateTicketPayload = {
        customerName: values.customerName,
        customerEmail: values.customerEmail,
        customerPhone: values.customerPhone || undefined,
        orderRefNo: values.orderRefNo || undefined,
        productName: values.productName,
        issueType: values.issueType,
        issueDescription: values.issueDescription,
      }
      const response = await fetchJson<CreateTicketResponse>('/tickets', {
        method: 'POST',
        body: payload,
      })
      setCreateResult(response)
      createAntdForm.resetFields()
    } catch (error) {
      setCreateError(
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'Failed to create ticket',
      )
    } finally {
      setCreateLoading(false)
    }
  }

  const onSubmitTrack = async (values: TrackTicketPayload): Promise<void> => {
    setTrackError('')
    setTrackResult(null)
    setTrackLoading(true)
    try {
      const response = await fetchJson<TrackTicketResponse>('/tickets/track', {
        method: 'POST',
        body: values,
      })
      setTrackResult(response)
    } catch (error) {
      setTrackError(
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'Unable to track ticket',
      )
    } finally {
      setTrackLoading(false)
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <Typography.Title level={2}>Customer Support Portal</Typography.Title>
        <Typography.Paragraph>
          Submit after-sales requests and track ticket progress.
        </Typography.Paragraph>
        <Typography.Text type="secondary">API Base URL: {apiHint}</Typography.Text>
      </header>

      <Card title="Submit Support Request" className="card">
        <Form<CreateTicketPayload>
          layout="vertical"
          form={createAntdForm}
          onFinish={onSubmitCreate}
        >
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                label="Name"
                name="customerName"
                rules={[{ required: true, message: 'Please enter your name' }]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                label="Email"
                name="customerEmail"
                rules={[
                  { required: true, message: 'Please enter your email' },
                  { type: 'email', message: 'Please enter a valid email' },
                ]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="Phone (optional)" name="customerPhone">
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="Order Ref (optional)" name="orderRefNo">
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                label="Product Name"
                name="productName"
                rules={[{ required: true, message: 'Please enter product name' }]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                label="Issue Type"
                name="issueType"
                rules={[{ required: true, message: 'Please enter issue type' }]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item
                label="Issue Description"
                name="issueDescription"
                rules={[
                  { required: true, message: 'Please describe your issue' },
                ]}
              >
                <Input.TextArea rows={4} />
              </Form.Item>
            </Col>
          </Row>
          <Space>
            <Button type="primary" htmlType="submit" loading={createLoading}>
              Create Ticket
            </Button>
          </Space>
        </Form>
        {createError ? <Alert type="error" showIcon message={createError} /> : null}
        {createResult ? (
          <Alert
            className="result-alert"
            type="success"
            showIcon
            message={`Ticket created: ${createResult.ticketNo}`}
            description={`Status: ${createResult.status} | Created: ${createResult.createdAt}`}
          />
        ) : null}
      </Card>

      <Card title="Track Ticket" className="card">
        <Form<TrackTicketPayload>
          layout="vertical"
          form={trackAntdForm}
          onFinish={onSubmitTrack}
        >
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                label="Ticket No"
                name="ticketNo"
                rules={[{ required: true, message: 'Please enter ticket number' }]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                label="Email"
                name="email"
                rules={[
                  { required: true, message: 'Please enter your email' },
                  { type: 'email', message: 'Please enter a valid email' },
                ]}
              >
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Button type="primary" htmlType="submit" loading={trackLoading}>
            Track Ticket
          </Button>
        </Form>
        {trackError ? <Alert type="error" showIcon message={trackError} /> : null}
        {trackResult ? (
          <Alert
            className="result-alert"
            type="success"
            showIcon
            message={`Ticket: ${trackResult.ticketNo}`}
            description={`Status: ${trackResult.status} | Updated: ${trackResult.updatedAt} | Latest Reply: ${trackResult.latestPublicReply || 'No public reply yet'}`}
          />
        ) : null}
      </Card>
    </div>
  )
}
