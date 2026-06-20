import React, { useState, useEffect } from 'react';
import { Modal, Table, Button, Typography, Tag, Space, Form, InputNumber, Input, Select, message, Popconfirm, Upload } from 'antd';
import { PlusOutlined, HistoryOutlined, DollarOutlined, DeleteOutlined } from '@ant-design/icons';
import axiosClient from '../../api/axiosClient';
import axiosUpload from '../../api/axiosUpload';
import dayjs from 'dayjs';
import PurchaseOrderDetailView from '../PurchaseOrder/PurchaseOrderDetailView';
import SupplierModal from '../../components/SupplierModal/SupplierModal';
const { Text, Title } = Typography;

const SupplierDetails = ({ supplier, onUpdate }) => {
    const [tab, setTab] = useState('info');
    const [history, setHistory] = useState([]);
    const [debtHistory, setDebtHistory] = useState([]); // State cho nhật ký công nợ
    const [loading, setLoading] = useState(false);

    // State cho Modal chi tiết đơn hàng
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    // State cho Modal Thanh toán
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [form] = Form.useForm();

    // Tạo state riêng cho số nợ để có thể cập nhật nhanh trên UI
    const [currentDebt, setCurrentDebt] = useState(supplier.current_debt);
    // Điều hướng fetch dữ liệu theo Tab
    useEffect(() => {
        if (tab === 'history') {
            fetchHistory();
        } else if (tab === 'debt') {
            fetchDebtHistory();
        }
    }, [tab, supplier.id]);
    // Cập nhật lại currentDebt nếu props supplier thay đổi (khi chọn NCC khác)
    useEffect(() => {
        setCurrentDebt(supplier.current_debt);
    }, [supplier.id, supplier.current_debt]);
    const fetchHistory = async () => {
        setLoading(true);
        try {
            const res = await axiosClient.get(`/api/suppliers/${supplier.id}/purchase-history`);
            console.log(res.data)
            setHistory(res.data);
        } catch (err) {
            message.error("Lỗi tải lịch sử nhập hàng");
        } finally {
            setLoading(false);
        }
    };
    const handleDelete = async () => {
        try {
            // Gửi is_active = 0 lên endpoint put đã có hoặc một endpoint riêng
            const res = await axiosClient.put(`/api/suppliers/${supplier.id}`, {
                ...supplier,
                is_active: 0
            });

            if (res.data.success) {
                message.success("Đã ngừng hoạt động nhà cung cấp");
                if (onUpdate) onUpdate(); // Refresh lại danh sách bên ngoài
            }
        } catch (err) {
            message.error("Lỗi khi cập nhật trạng thái");
        }
    };
    const fetchDebtHistory = async () => {
        setLoading(true);
        try {
            const res = await axiosClient.get(`/api/suppliers/${supplier.id}/debt-history`);
            setDebtHistory(res.data);
        } catch (err) {
            message.error("Lỗi tải nhật ký công nợ");
        } finally {
            setLoading(false);
        }
    };
    // Hàm xử lý sau khi chỉnh sửa thành công
    const handleEditSuccess = (updatedData) => {
        setIsEditModalOpen(false);
        if (onUpdate) onUpdate(updatedData); // Thông báo cho component cha cập nhật lại list
        message.success("Thông tin đã được cập nhật");
    };
    const handlePayment = async (values) => {
        const cleanValues = {
            amount: values.amount,
            payment_method: values.payment_method || 'cash',
            note: values.note || null  // Đảm bảo không gửi undefined
        };
        try {
            console.log("Dữ liệu gửi đi:", values);
            const res = await axiosClient.post(`/api/suppliers/${supplier.id}/payments`, cleanValues);
            if (res.data.success) {
                message.success("Lập phiếu thanh toán thành công");
                setIsPaymentModalOpen(false);
                form.resetFields();
                fetchDebtHistory(); // Refresh bảng nợ
                // Cập nhật số nợ mới từ kết quả API trả về
                setCurrentDebt(res.data.new_debt);
                // Load lại lịch sử bảng nợ
                fetchDebtHistory();
                if (onUpdate) onUpdate(); // Refresh số nợ ở bảng danh sách NCC bên ngoài
            }

        } catch (err) {
            message.error(err.response?.data?.error || "Lỗi khi thanh toán");
        }
    };

    const handleOpenOrder = async (order) => {
        setLoading(true); // Có thể thêm loading để trải nghiệm tốt hơn
        try {
            // Gọi API lấy cả chi tiết hàng và mảng ảnh
            const res = await axiosClient.get(`/api/purchase-orders/${order.id}/details`);

            // Cập nhật state với cấu trúc dữ liệu mới từ backend
            setSelectedOrder({
                ...order,
                supplier_name: supplier.supplier_name,
                address: supplier.address,
                details: res.data.details, // Lấy mảng hàng hóa
                images: res.data.images    // Lấy mảng url ảnh
            });
            console.log(selectedOrder)
        } catch (err) {
            message.error("Không thể tải chi tiết hóa đơn");
            setSelectedOrder(order);
        } finally {
            setLoading(false);
            setIsModalOpen(true);
        }
    };

    const handleUploadImage = async (file, orderId) => {
        const formData = new FormData();
        formData.append('images', file); // 'images' phải khớp với tên field ở backend (Multer)

        const hide = message.loading('Đang tải ảnh lên...', 0);
        try {
            const res = await axiosUpload.post(`/api/purchase-orders/${orderId}/images`, formData);

            if (res.data.success) {
                message.success('Tải ảnh chứng từ thành công');
                // Cập nhật lại danh sách lịch sử để UI đồng bộ (nếu cần)
                fetchHistory();
            }
        } catch (err) {
            console.error(err);
            message.error(err.response?.data?.error || 'Lỗi khi tải ảnh');
        } finally {
            hide();
        }
    };

    const debtColumns = [
        {
            title: 'Thời gian',
            dataIndex: 'created_at',
            key: 'created_at',
            render: (date) => dayjs(date).format('DD/MM/YYYY HH:mm'),
        },
        {
            title: 'Mã chứng từ',
            dataIndex: 'reference_code',
            key: 'reference_code',
            render: (text, record) => {
                // Nếu là đơn nhập hàng thì cho phép click, nếu là phiếu thanh toán thì chỉ hiện text
                if (record.type === 'PURCHASE') {
                    return <a onClick={() => handleOpenDebtOrder(record)} style={{ fontWeight: 'bold' }}>{text}</a>;
                }
                return <Text strong>{text}</Text>;
            }
        },
        {
            title: 'Loại',
            dataIndex: 'type',
            key: 'type',
            render: (type) => (
                <Tag color={type === 'PURCHASE' ? 'volcano' : 'green'}>
                    {type === 'PURCHASE' ? 'Nhập hàng' : 'Thanh toán'}
                </Tag>
            )
        },
        {
            title: 'Giá trị',
            dataIndex: 'display_amount',
            key: 'display_amount',
            align: 'right',
            render: (val) => (
                <Text type={val > 0 ? 'danger' : 'success'} strong>
                    {val > 0 ? '+' : ''}{val.toLocaleString()}đ
                </Text>
            )
        },
        {
            title: 'Nợ sau giao dịch',
            dataIndex: 'after_debt',
            key: 'after_debt',
            align: 'right',
            render: (val) => <Text strong>{val.toLocaleString()}đ</Text>
        }
    ];
    const handleOpenDebtOrder = (debtRecord) => {
        // Chỉ xử lý nếu là loại Nhập hàng (PURCHASE)
        if (debtRecord.type !== 'PURCHASE') return;
        console.log(debtRecord);
        console.log(history);

        // Tìm đơn hàng trong mảng history có po_code khớp với reference_code của dòng nợ
        const matchedOrder = history.find(order => order.po_code === debtRecord.reference_code);

        if (matchedOrder) {
            // Nếu tìm thấy, nạp object đó vào hàm handleOpenOrder đã có của bạn
            handleOpenOrder(matchedOrder);
        } else {
            // Trường hợp không tìm thấy trong history (ví dụ history chưa load hoặc đơn quá cũ)
            // Chúng ta vẫn có thể gọi handleOpenOrder với ID từ reference_id nếu backend có trả về
            message.warning("Không tìm thấy dữ liệu đơn hàng trong danh sách lịch sử hiện tại.");

            // Option dự phòng: Nếu debtRecord có chứa ID gốc của đơn hàng
            if (debtRecord.reference_id) {
                handleOpenOrder({ id: debtRecord.reference_id, po_code: debtRecord.reference_code });
            }
        }
    };
    const tabStyle = (name) => ({
        padding: '8px 20px',
        cursor: 'pointer',
        borderBottom: tab === name ? '2px solid #1890ff' : 'none',
        color: tab === name ? '#1890ff' : '#555',
        fontWeight: tab === name ? 'bold' : 'normal'
    });

    return (
        <div>
            {/* Tab Headers */}
            <div style={{ display: 'flex', borderBottom: '1px solid #eee', marginBottom: '15px' }}>
                <div style={tabStyle('info')} onClick={() => setTab('info')}>Thông tin</div>
                <div style={tabStyle('history')} onClick={() => setTab('history')}>Lịch sử nhập hàng</div>
                <div style={tabStyle('debt')} onClick={() => setTab('debt')}>Nợ cần trả</div>
            </div>

            {/* TAB INFO */}
            {tab === 'info' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div>
                        <p><strong>Mã NCC:</strong> {supplier.supplier_code}</p>
                        <p><strong>Tên NCC:</strong> {supplier.supplier_name}</p>
                        <p><strong>Điện thoại:</strong> {supplier.phone || 'Chưa có'}</p>
                    </div>
                    <div>
                        <p><strong>Địa chỉ:</strong> {supplier.address || 'Chưa có địa chỉ'}</p>
                        <p><strong>Email:</strong> {supplier.email || 'Chưa có email'}</p>
                        <p><strong>Ghi chú:</strong> {supplier.note || '---'}</p>
                    </div>
                    <div style={{ gridColumn: 'span 2', textAlign: 'right', marginTop: '10px' }}>
                        <Space>
                            <Popconfirm
                                title="Ngừng hoạt động nhà cung cấp"
                                description="Bạn có chắc chắn muốn ngừng hợp tác với nhà cung cấp này không?"
                                onConfirm={handleDelete}
                                okText="Đồng ý"
                                cancelText="Hủy"
                                okButtonProps={{ danger: true }}
                            >
                                <Button danger icon={<DeleteOutlined />}>
                                    Ngừng hoạt động
                                </Button>
                            </Popconfirm>
                            <Button
                                type="primary"
                                ghost
                                onClick={() => setIsEditModalOpen(true)} // Mở modal khi nhấn
                            >
                                Chỉnh sửa
                            </Button>
                        </Space>
                    </div>
                </div>
            )}

            {/* TAB HISTORY */}
            {tab === 'history' && (
                <Table
                    dataSource={history}
                    columns={[
                        {
                            title: 'Mã phiếu',
                            dataIndex: 'po_code',
                            key: 'po_code',
                            render: (text, rec) => <a onClick={() => handleOpenOrder(rec)}>{text}</a>
                        },
                        {
                            title: 'Thời gian',
                            dataIndex: 'created_at',
                            key: 'created_at',
                            render: d => dayjs(d).format('DD/MM/YYYY HH:mm'),
                            // Sắp xếp theo ngày tháng
                            sorter: (a, b) => dayjs(a.created_at).unix() - dayjs(b.created_at).unix(),
                            defaultSortOrder: 'descend', // Mặc định hiện đơn mới nhất
                        },
                        {
                            title: 'Tổng cộng',
                            dataIndex: 'final_amount',
                            key: 'final_amount',
                            align: 'right',
                            render: v => <b>{Number(v).toLocaleString()}đ</b>,
                            // Sắp xếp theo giá trị tiền
                            sorter: (a, b) => Number(a.final_amount) - Number(b.final_amount),
                        },
                        {
                            title: 'Trạng thái',
                            dataIndex: 'status',
                            key: 'status',
                            render: s => (
                                <Tag color={s === 'completed' ? 'green' : 'orange'}>
                                    {s.toUpperCase()}
                                </Tag>
                            ),
                            // Lọc theo trạng thái nếu cần
                            filters: [
                                { text: 'Hoàn thành', value: 'completed' },
                                { text: 'Bản nháp', value: 'draft' },
                            ],
                            onFilter: (value, record) => record.status === value,
                        },
                        {
                            title: 'Đính kèm',
                            key: 'action',
                            width: 100,
                            align: 'center',
                            render: (_, record) => (
                                <Upload
                                    name="images"
                                    multiple
                                    showUploadList={false} // Không hiện danh sách file của Antd vì ta sẽ xem trong chi tiết
                                    customRequest={({ file }) => handleUploadImage(file, record.id)}
                                    accept="image/*"
                                >
                                    <Button
                                        icon={<PlusOutlined />}
                                        size="small"
                                        type="dashed"
                                        title="Tải lên chứng từ"
                                    >
                                        Ảnh
                                    </Button>
                                </Upload>
                            )
                        },
                    ]}
                    rowKey="id"
                    loading={loading}
                    size="small"
                    // Cấu hình phân trang
                    pagination={{
                        pageSize: 10,
                        showSizeChanger: true,
                        pageSizeOptions: ['10', '20', '50'],
                        showTotal: (total) => `Tổng cộng ${total} đơn hàng`,
                    }}
                />
            )}

            {/* TAB NỢ CẦN TRẢ */}
            {tab === 'debt' && (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, padding: '10px', background: '#fff7e6', borderRadius: 8 }}>
                        <div>
                            <Text>Nợ hiện tại:</Text>
                            <Title level={4} style={{ margin: 0, color: '#f5222d' }}>
                                {Number(currentDebt).toLocaleString()}đ
                            </Title>
                        </div>
                        <Button
                            type="primary"
                            danger
                            icon={<DollarOutlined />}
                            size="large"
                            onClick={() => setIsPaymentModalOpen(true)}
                        >
                            Thanh toán
                        </Button>
                    </div>

                    <Table
                        dataSource={debtHistory}
                        columns={debtColumns}
                        rowKey="id"
                        loading={loading}
                        size="small"
                        pagination={{ pageSize: 5 }}
                        // Thêm logic click dòng ở đây
                        onRow={(record) => ({
                            onClick: () => {
                                if (record.type === 'PURCHASE') {
                                    handleOpenDebtOrder(record);
                                }
                            },
                            style: { cursor: record.type === 'PURCHASE' ? 'pointer' : 'default' }
                        })}
                    />
                </div>
            )}

            {/* MODAL THANH TOÁN */}
            <Modal
                title="Lập phiếu chi - Thanh toán nợ"
                open={isPaymentModalOpen}
                onCancel={() => setIsPaymentModalOpen(false)}
                onOk={() => form.submit()}
                okText="Xác nhận thanh toán"
                okButtonProps={{ danger: true }}
                destroyOnClose
            >
                <Form form={form} layout="vertical" onFinish={handlePayment} initialValues={{ amount: supplier.current_debt, payment_method: 'cash' }}>
                    <Form.Item name="amount" label="Số tiền thanh toán" rules={[{ required: true, message: 'Vui lòng nhập số tiền' }]}>
                        <InputNumber
                            style={{ width: '100%' }}
                            formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                            parser={value => value.replace(/\$\s?|(,*)/g, '')}
                            addonAfter="đ"
                            min={1}
                        />
                    </Form.Item>
                    <Form.Item name="payment_method" label="Phương thức thanh toán">
                        <Select options={[{ label: 'Tiền mặt', value: 'cash' }, { label: 'Chuyển khoản', value: 'transfer' }]} />
                    </Form.Item>
                    <Form.Item name="note" label="Ghi chú" value=''>
                        <Input.TextArea placeholder="Nhập lý do thanh toán..." rows={3} />
                    </Form.Item>
                </Form>
            </Modal>

            {/* MODAL XEM CHI TIẾT ĐƠN HÀNG */}
            <Modal
                title={`Chi tiết đơn hàng: ${selectedOrder?.po_code || ''}`}
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                footer={null}
                width={900}
                centered
            >
                <PurchaseOrderDetailView record={selectedOrder} hideActions={true} />
            </Modal>
            <SupplierModal
                visible={isEditModalOpen}
                editingSupplier={supplier} // Truyền dữ liệu NCC hiện tại vào
                onCancel={() => setIsEditModalOpen(false)}
                onSuccess={handleEditSuccess}
            />
        </div>
    );
};

export default SupplierDetails;