import React, { useState, useEffect } from 'react';
import { Table, Card, Tag, Button, Input, Row, Col, Typography, Space, Tooltip, message, Statistic, Popconfirm } from 'antd';
import { SearchOutlined, EyeOutlined, ReloadOutlined, FilterOutlined, ArrowLeftOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import axiosClient from '../../api/axiosClient';
import ReturnDetailView from './ReturnDetailView';

const { Title, Text } = Typography;

const ReturnInvoiceList = () => {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState([]);
    const [searchText, setSearchText] = useState('');

    const fetchReturns = async () => {
        setLoading(true);
        try {
            const res = await axiosClient.get('/api/return-invoices');
            setData(res.data);
        } catch (err) {
            message.error("Không thể tải danh sách trả hàng");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        setLoading(true);
        try {
            await axiosClient.delete(`/api/return-invoices/${id}`);
            message.success("Đã xóa phiếu trả hàng thành công");
            fetchReturns();
        } catch (err) {
            message.error("Lỗi khi xóa phiếu trả hàng");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReturns();
    }, []);

    const columns = [
        {
            title: 'Mã đơn trả',
            dataIndex: 'return_code',
            key: 'return_code',
            sorter: (a, b) => a.return_code.localeCompare(b.return_code),
            render: (text) => <Text strong style={{ color: '#ff4d4f' }}>{text}</Text>,
        },
        {
            title: 'Thời gian',
            dataIndex: 'created_at',
            key: 'created_at',
            sorter: (a, b) => dayjs(a.created_at).valueOf() - dayjs(b.created_at).valueOf(),
            render: (date) => dayjs(date).format('DD/MM/YYYY HH:mm'),
        },
        {
            title: 'Khách hàng',
            dataIndex: 'customer_name',
            key: 'customer_name',
            sorter: (a, b) => (a.customer_name || "").localeCompare(b.customer_name || ""),
            render: (name, record) => (
                <div>
                    <div style={{ fontWeight: 500 }}>{name}</div>
                    <Text type="secondary" style={{ fontSize: '12px' }}>{record.customer_phone}</Text>
                </div>
            )
        },
        {
            title: 'Hóa đơn gốc',
            dataIndex: 'invoice_code',
            key: 'invoice_code',
            render: (code) => code ? <Tag color="blue">{code}</Tag> : <Text type="secondary">N/A</Text>
        },
        {
            title: 'Tổng tiền trả',
            dataIndex: 'total_amount',
            align: 'right',
            sorter: (a, b) => Number(a.total_amount || 0) - Number(b.total_amount || 0),
            render: (val) => <Text>{Number(val || 0).toLocaleString()}đ</Text>
        },
        {
            title: 'Phí trả hàng',
            dataIndex: 'return_fee',
            align: 'right',
            sorter: (a, b) => Number(a.return_fee || 0) - Number(b.return_fee || 0),
            render: (val) => <Text type="danger">-{Number(val || 0).toLocaleString()}đ</Text>
        },
        {
            title: 'Thực hoàn',
            dataIndex: 'final_refund',
            align: 'right',
            sorter: (a, b) => Number(a.final_refund || 0) - Number(b.final_refund || 0),
            render: (val) => <Text strong style={{ color: '#52c41a' }}>{Number(val || 0).toLocaleString()}đ</Text>
        },
        {
            title: 'Thao tác',
            key: 'action',
            align: 'center',
            render: (_, record) => (
                <Space>
                    <Tooltip title="Xem chi tiết">
                        <Button icon={<EyeOutlined />} size="small" />
                    </Tooltip>
                    <Popconfirm
                        title="Bạn chắc chắn muốn xóa phiếu này?"
                        onConfirm={() => handleDelete(record.id)}
                        okText="Xóa"
                        cancelText="Hủy"
                        okButtonProps={{ danger: true }}
                    >
                        <Tooltip title="Xóa phiếu">
                            <Button danger icon={<DeleteOutlined />} size="small" />
                        </Tooltip>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <div style={{ padding: '24px', background: '#f5f5f5', minHeight: '100vh' }}>
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col span={18}>
                    <Title level={2}>Danh sách khách trả hàng</Title>
                    <Text type="secondary">Quản lý các đơn hàng khách hàng trả lại sản phẩm</Text>
                </Col>
                <Col span={6} style={{ textAlign: 'right' }}>
                    <Button icon={<ReloadOutlined />} onClick={fetchReturns}>Làm mới</Button>
                </Col>
            </Row>

            <Card bordered={false}>
                <Input
                    placeholder="Tìm mã phiếu, khách hàng..."
                    prefix={<SearchOutlined />}
                    onChange={e => setSearchText(e.target.value)}
                    style={{ marginBottom: 20, width: 300 }}
                />

                <Table
                    columns={columns}
                    dataSource={data.filter(i => 
                        i.return_code?.toLowerCase().includes(searchText.toLowerCase()) || 
                        i.customer_name?.toLowerCase().includes(searchText.toLowerCase())
                    )}
                    rowKey="id"
                    loading={loading}
                    pagination={{
                        pageSizeOptions: ['10', '20', '50'],
                        showSizeChanger: true,
                        showTotal: (total) => `Tổng ${total} phiếu trả`,
                    }}
                    expandable={{
                        expandedRowRender: (record) => (
                            <div style={{ padding: '12px 24px', backgroundColor: '#fffbe6', borderRadius: '8px' }}>
                                <Title level={5}>Chi tiết mặt hàng trả lại:</Title>
                                <ReturnDetailView returnId={record.id} />
                            </div>
                        ),
                        expandRowByClick: true,
                    }}
                />
            </Card>
        </div>
    );
};

export default ReturnInvoiceList;