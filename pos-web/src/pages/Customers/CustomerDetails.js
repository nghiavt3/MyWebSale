import React, { useState, useEffect } from 'react';
import { Modal, Table, Button, Typography, Tag, Form, InputNumber, Input, message, Popconfirm } from 'antd';
import { DollarOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import axiosClient from '../../api/axiosClient';
import dayjs from 'dayjs';
import InvoiceDetailView from '../Envoices/InvoiceDetailView';
import CustomerModal from '../../components/CustomerModal/CustomerModal';

const { Text, Title } = Typography;

const CustomerDetails = ({ customer, onUpdate }) => {
    const [tab, setTab] = useState('info');
    const [history, setHistory] = useState([]);
    const [debtHistory, setDebtHistory] = useState([]);
    const [loading, setLoading] = useState(false);

    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const [selectedEnvoice, setSelectedEnvoice] = useState(null);
    const [currentDebt, setCurrentDebt] = useState(customer.total_debt);
    const [paymentForm] = Form.useForm();

    useEffect(() => {
        if (tab === 'history') fetchHistory();
        else if (tab === 'debt') fetchDebtHistory();
    }, [tab, customer.id]);

    useEffect(() => {
        setCurrentDebt(customer.total_debt);
    }, [customer.total_debt]);

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const res = await axiosClient.get(`/api/customers/${customer.id}/sale-history`);
            setHistory(res.data);
        } catch (err) {
            message.error("Lỗi tải lịch sử bán hàng");
        } finally {
            setLoading(false);
        }
    };

    const fetchDebtHistory = async () => {
        setLoading(true);
        try {
            const res = await axiosClient.get(`/api/customers/${customer.id}/debt-history`);
            setDebtHistory(res.data);
        } catch (err) {
            message.error("Lỗi tải nhật ký công nợ");
        } finally {
            setLoading(false);
        }
    };

    const handleOpenEnvoice = async (envoice) => {
        if (!envoice.details) {
            try {
                const res = await axiosClient.get(`/api/invoices/${envoice.id}/details`);
                setSelectedEnvoice({ ...envoice, details: res.data });
            } catch (err) {
                setSelectedEnvoice(envoice);
            }
        } else {
            setSelectedEnvoice(envoice);
        }
        setIsModalOpen(true);
    };
    const handleDeleteInvoice = async (invoiceId) => {
        try {
            await axiosClient.delete(`/api/invoices/${invoiceId}`);
            message.success("Đã xóa hóa đơn thành công");

            // Cập nhật lại danh sách lịch sử sau khi xóa
            fetchHistory();

            // Nếu component cha cần update (ví dụ để trừ đi tổng nợ/tổng mua), gọi callback
            if (onUpdate) onUpdate();
        } catch (err) {
            message.error(err.response?.data?.message || "Lỗi khi xóa hóa đơn");
        }
    };
    const handleReceipt = async (values) => {
        try {
            const res = await axiosClient.post(`/api/customers/${customer.id}/receipts`, values);
            if (res.data.success) {
                message.success("Thu nợ thành công");
                setIsPaymentModalOpen(false);
                paymentForm.resetFields();
                setCurrentDebt(res.data.new_debt);
                fetchDebtHistory();
                if (onUpdate) onUpdate();
            }
        } catch (err) {
            message.error(err.response?.data?.error || "Lỗi khi thu nợ");
        }
    };

    return (
        <div>
            <div style={{ display: 'flex', borderBottom: '1px solid #eee', marginBottom: '15px' }}>
                <div style={{ padding: '8px 20px', cursor: 'pointer', borderBottom: tab === 'info' ? '2px solid #1890ff' : 'none' }} onClick={() => setTab('info')}>Thông tin</div>
                <div style={{ padding: '8px 20px', cursor: 'pointer', borderBottom: tab === 'history' ? '2px solid #1890ff' : 'none' }} onClick={() => setTab('history')}>Lịch sử mua hàng</div>
                <div style={{ padding: '8px 20px', cursor: 'pointer', borderBottom: tab === 'debt' ? '2px solid #1890ff' : 'none' }} onClick={() => setTab('debt')}>Công nợ</div>
            </div>

            {tab === 'info' && (
                <div style={{ position: 'relative' }}>
                    <Button type="primary" ghost icon={<EditOutlined />} size="small" style={{ position: 'absolute', right: 0, top: 0 }} onClick={() => setIsEditModalOpen(true)}>Chỉnh sửa</Button>
                    <p><strong>Tên KH:</strong> {customer.name}</p>
                    <p><strong>Điện thoại:</strong> {customer.phone}</p>
                    <p><strong>Địa chỉ:</strong> {customer.address || '---'}</p>
                    <p><strong>Ngày sinh:</strong> {customer.birthday ? dayjs(customer.birthday).format('DD/MM/YYYY') : '---'}</p>
                </div>
            )}

            {tab === 'history' && (
                <Table
                    dataSource={history}
                    rowKey="id"
                    loading={loading}
                    size="small"
                    pagination={{ pageSize: 5 }}
                    columns={[
                        { title: 'Mã HĐ', dataIndex: 'invoice_code', sorter: (a, b) => a.invoice_code.localeCompare(b.invoice_code), render: (text, rec) => <a onClick={() => handleOpenEnvoice(rec)}>{text}</a> },
                        { title: 'Ngày', dataIndex: 'created_at', sorter: (a, b) => dayjs(a.created_at).unix() - dayjs(b.created_at).unix(), render: d => dayjs(d).format('DD/MM/YYYY') },
                        { title: 'Tổng tiền', dataIndex: 'final_amount', align: 'right', sorter: (a, b) => a.final_amount - b.final_amount, render: v => Number(v).toLocaleString() + 'đ' },
                        {
                            title: 'Thao tác',
                            key: 'action',
                            render: (_, record) => (
                                <Popconfirm
                                    title="Bạn có chắc chắn muốn xóa hóa đơn này?"
                                    onConfirm={() => handleDeleteInvoice(record.id)}
                                    okText="Xóa"
                                    cancelText="Hủy"
                                >
                                    <Button danger type="text" icon={<DeleteOutlined />} />
                                </Popconfirm>
                            ),
                        }
                    ]}
                />
            )}

            {tab === 'debt' && (
                <div>
                    <div style={{ background: '#f6ffed', padding: 15, borderRadius: 8, marginBottom: 15, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div><Text>Nợ cần thu:</Text><Title level={4} style={{ margin: 0 }}>{Number(currentDebt).toLocaleString()}đ</Title></div>
                        <Button type="primary" icon={<DollarOutlined />} onClick={() => setIsPaymentModalOpen(true)}>Thu tiền</Button>
                    </div>
                    <Table
                        dataSource={debtHistory}
                        rowKey="id"
                        size="small"
                        pagination={{ pageSize: 5 }}
                        columns={[
                            { title: 'Thời gian', dataIndex: 'created_at', sorter: (a, b) => dayjs(a.created_at).unix() - dayjs(b.created_at).unix(), render: d => dayjs(d).format('DD/MM/YYYY HH:mm') },
                            { title: 'Mã chứng từ', dataIndex: 'reference_code', sorter: (a, b) => a.reference_code.localeCompare(b.reference_code), render: t => <Text strong style={{ color: '#1890ff' }}>{t}</Text> },
                            { title: 'Loại', dataIndex: 'type', sorter: (a, b) => a.type.localeCompare(b.type), render: t => <Tag color={t === 'SALE' ? 'blue' : 'green'}>{t === 'SALE' ? 'Bán hàng' : 'Thu nợ'}</Tag> },
                            { title: 'Giá trị', dataIndex: 'change_amount', align: 'right', sorter: (a, b) => a.change_amount - b.change_amount, render: (v, r) => <Text type={r.type === 'SALE' ? 'danger' : 'success'} strong>{r.type === 'SALE' ? '+' : '-'}{Number(v).toLocaleString()}đ</Text> },
                            { title: 'Nợ sau', dataIndex: 'after_debt', align: 'right', sorter: (a, b) => a.after_debt - b.after_debt, render: v => <Text strong>{Number(v).toLocaleString()}đ</Text> }
                        ]}
                    />
                </div>
            )}

            <Modal title="Lập phiếu thu" open={isPaymentModalOpen} onCancel={() => setIsPaymentModalOpen(false)} onOk={() => paymentForm.submit()}>
                <Form form={paymentForm} layout="vertical" onFinish={handleReceipt}>
                    <Form.Item name="amount" label="Số tiền thu" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} addonAfter="đ" /></Form.Item>
                    <Form.Item name="note" label="Ghi chú"><Input.TextArea /></Form.Item>
                </Form>
            </Modal>

            <CustomerModal
                open={isEditModalOpen}
                customer={customer}
                onCancel={() => setIsEditModalOpen(false)}
                onSuccess={() => {
                    setIsEditModalOpen(false);
                    if (onUpdate) onUpdate();
                }}
            />

            <Modal title={`Chi tiết đơn hàng: ${selectedEnvoice?.invoice_code || ''}`} open={isModalOpen} onCancel={() => setIsModalOpen(false)} footer={null} width={900} centered>
                <InvoiceDetailView record={selectedEnvoice} hideActions={true} />
            </Modal>
        </div>
    );
};

export default CustomerDetails;