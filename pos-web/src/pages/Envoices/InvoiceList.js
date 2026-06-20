import React, { useState, useEffect, useMemo } from 'react';
import {
    Table, Tag, Card, Input, Typography, message,
    Row, Col, DatePicker, Statistic, Space, Button, Layout, Divider, Popconfirm, Tooltip
} from 'antd';
import {
    SearchOutlined, FilterOutlined, FileTextOutlined,
    DollarCircleOutlined, CalendarOutlined, EditOutlined, DeleteOutlined
} from '@ant-design/icons';
import axiosClient from '../../api/axiosClient';
import dayjs from 'dayjs';
import quarterOfYear from 'dayjs/plugin/quarterOfYear';
import isBetween from 'dayjs/plugin/isBetween';
import InvoiceDetailView from './InvoiceDetailView';
import { useNavigate } from 'react-router-dom';

dayjs.extend(isBetween);
dayjs.extend(quarterOfYear);
const { Title, Text } = Typography;
const { Sider, Content } = Layout;
const { RangePicker } = DatePicker;
const rangePresets = {
    'Hôm nay': [dayjs(), dayjs()],
    'Hôm qua': [dayjs().subtract(1, 'day'), dayjs().subtract(1, 'day')],
    'Tuần này': [dayjs().startOf('week'), dayjs().endOf('week')],
    'Tuần trước': [dayjs().subtract(1, 'week').startOf('week'), dayjs().subtract(1, 'week').endOf('week')],
    'Tháng này': [dayjs().startOf('month'), dayjs().endOf('month')],
    'Tháng trước': [dayjs().subtract(1, 'month').startOf('month'), dayjs().subtract(1, 'month').endOf('month')],
    'Quý này': [dayjs().startOf('quarter'), dayjs().endOf('quarter')],
    'Quý trước': [dayjs().subtract(1, 'quarter').startOf('quarter'), dayjs().subtract(1, 'quarter').endOf('quarter')],
};
const InvoiceList = () => {
    const [loading, setLoading] = useState(false);
    const [invoices, setInvoices] = useState([]);
    const [searchText, setSearchText] = useState('');
    const [dateRange, setDateRange] = useState(null);
    const navigate = useNavigate();

    const fetchInvoices = async () => {
        setLoading(true);
        try {
            const params = {};
            if (dateRange && dateRange[0] && dateRange[1]) {
                params.startDate = dateRange[0].format('YYYY-MM-DD');
                params.endDate = dateRange[1].format('YYYY-MM-DD');
            }
            const res = await axiosClient.get('/api/invoices', { params });
            setInvoices(res.data);
        } catch (err) {
            message.error("Không thể tải danh sách hóa đơn");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInvoices();
    }, [dateRange]);

    const filteredInvoices = useMemo(() => {
        return invoices.filter(inv => {
            const matchesSearch = inv.invoice_code.toLowerCase().includes(searchText.toLowerCase()) ||
                (inv.customer_name || "Khách lẻ").toLowerCase().includes(searchText.toLowerCase());

            let matchesDate = true;
            if (dateRange && dateRange[0] && dateRange[1]) {
                const invoiceDate = dayjs(inv.created_at);
                matchesDate = invoiceDate.isBetween(dateRange[0], dateRange[1], 'day', '[]');
            }
            return matchesSearch && matchesDate;
        });
    }, [invoices, searchText, dateRange]);

    const totalRevenue = useMemo(() => {
        return filteredInvoices.reduce((sum, inv) => sum + Number(inv.final_amount), 0);
    }, [filteredInvoices]);

    const handleDelete = async (id) => {
        try {
            setLoading(true);
            const res = await axiosClient.delete(`/api/invoices/${id}`);
            if (res.data.success) {
                message.success("Đã xóa hóa đơn và cập nhật tồn kho!");
                fetchInvoices();
            }
        } catch (err) {
            message.error(err.response?.data?.message || "Không thể xóa hóa đơn");
        } finally {
            setLoading(false);
        }
    };

    const columns = [
        {
            title: 'Mã hóa đơn',
            dataIndex: 'invoice_code',
            key: 'invoice_code',
            sorter: (a, b) => a.invoice_code.localeCompare(b.invoice_code),
            render: (text) => <Text strong style={{ color: '#1890ff' }}>{text}</Text>
        },
        {
            title: 'Thời gian',
            dataIndex: 'created_at',
            key: 'created_at',
            sorter: (a, b) => dayjs(a.created_at).valueOf() - dayjs(b.created_at).valueOf(),
            render: (date) => dayjs(date).format('DD/MM/YYYY HH:mm')
        },
        {
            title: 'Khách hàng',
            dataIndex: 'customer_name',
            key: 'customer_name',
            sorter: (a, b) => (a.customer_name || "").localeCompare(b.customer_name || ""),
            render: (text) => text || <Text type="secondary">Khách lẻ</Text>
        },
        {
            title: 'Tổng tiền',
            dataIndex: 'final_amount',
            align: 'right',
            sorter: (a, b) => Number(a.final_amount) - Number(b.final_amount),
            render: (v) => <Text strong>{Math.round(v).toLocaleString()}đ</Text>
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            sorter: (a, b) => a.status.localeCompare(b.status),
            render: (v) => (
                <Tag color={v === 'draft' ? 'orange' : 'blue'} style={{ borderRadius: 10 }}>
                    {v === 'draft' ? 'Đặt Hàng' : 'Hoàn Thành'}
                </Tag>
            )
        },
        {
            title: 'Thao tác',
            key: 'action',
            width: 80,
            align: 'center',
            render: (_, record) => (
                <div onClick={(e) => e.stopPropagation()}>
                    {record.status === 'draft' && (
                        <Tooltip title="Tiếp tục xử lý đơn hàng">
                            <Button type="text" style={{ color: '#faad14' }} icon={<EditOutlined />} onClick={() => navigate('/pos', { state: { editInvoice: record } })} />
                        </Tooltip>
                    )}
                    <Popconfirm
                        title="Xóa hóa đơn & Hoàn kho"
                        onConfirm={() => handleDelete(record.id)}
                        okText="Xác nhận"
                        cancelText="Hủy"
                        okButtonProps={{ danger: true }}
                    >
                        <Tooltip title="Xóa & Hoàn kho">
                            <Button type="text" danger icon={<DeleteOutlined />} />
                        </Tooltip>
                    </Popconfirm>
                </div>
            ),
        }
    ];

    return (
        <Layout style={{ minHeight: '100vh', background: '#f0f2f5' }}>
            <Sider width={300} theme="light" style={{ padding: '20px', borderRight: '1px solid #f0f0f0' }}>
                <Space direction="vertical" size={24} style={{ width: '100%' }}>
                    <div>
                        <Title level={4}><FilterOutlined /> Bộ lọc</Title>
                        <Divider style={{ margin: '12px 0' }} />
                        <Text strong><CalendarOutlined /> Theo thời gian</Text>
                        <RangePicker
                            style={{ width: '100%', marginTop: 8 }}
                            onChange={(dates) => setDateRange(dates)}
                            value={dateRange}
                            presets={[
                                { label: 'Hôm nay', value: rangePresets['Hôm nay'] },
                                { label: 'Hôm qua', value: rangePresets['Hôm qua'] },
                                { label: 'Tuần này', value: rangePresets['Tuần này'] },
                                { label: 'Tuần trước', value: rangePresets['Tuần trước'] },
                                { label: 'Tháng này', value: rangePresets['Tháng này'] },
                                { label: 'Tháng trước', value: rangePresets['Tháng trước'] },
                                { label: 'Quý này', value: rangePresets['Quý này'] },
                                { label: 'Quý trước', value: rangePresets['Quý trước'] },
                            ]}
                        />
                    </div>
                    <Card style={{ background: '#e6f7ff', border: 'none' }}>
                        <Statistic title="TỔNG DOANH THU" value={totalRevenue} precision={0} valueStyle={{ color: '#0050b3', fontWeight: 'bold' }} suffix="đ" prefix={<DollarCircleOutlined />} />
                        <Text type="secondary">{filteredInvoices.length} đơn hàng</Text>
                    </Card>
                    <Button block onClick={() => { setSearchText(''); setDateRange(null); }}>Thiết lập lại</Button>
                </Space>
            </Sider>

            <Content style={{ padding: '24px' }}>
                <Card title={<Title level={3} style={{ margin: 0 }}>Hóa đơn bán hàng</Title>}>
                    <Input size="large" placeholder="Tìm theo mã hoặc tên khách..." prefix={<SearchOutlined />} value={searchText} onChange={e => setSearchText(e.target.value)} allowClear style={{ marginBottom: 20, width: 400 }} />
                    <Table
                        dataSource={filteredInvoices}
                        columns={columns}
                        rowKey="id"
                        loading={loading}
                        pagination={{ pageSize: 12 }}
                        expandable={{
                            expandedRowRender: (record) => (
                                <div style={{ padding: '10px 20px', backgroundColor: '#fafafa', borderRadius: 8 }}>
                                    <InvoiceDetailView record={record} />
                                </div>
                            ),
                            expandRowByClick: true,
                        }}
                    />
                </Card>
            </Content>
        </Layout>
    );
};

export default InvoiceList;