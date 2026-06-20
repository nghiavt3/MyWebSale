import React, { useState, useEffect, useRef } from 'react';
import { Table, Tag, Button, Space, Card, Input, Typography, message, Badge, Row, Upload, Col, Divider, Popconfirm } from 'antd';
import { EyeOutlined, EditOutlined, PaperClipOutlined, SearchOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import axiosClient from '../../api/axiosClient';
import dayjs from 'dayjs'; // Thư viện xử lý thời gian (nên cài: npm install dayjs)
import PurchaseOrderDetailView from './PurchaseOrderDetailView';
const { Title, Text } = Typography;

const PurchaseOrderList = ({ onEditDraft, onCreateNew }) => {
    const [loading, setLoading] = useState(false);
    const [orders, setOrders] = useState([]);
    const [searchText, setSearchText] = useState('');
    const fileInputs = useRef({});
    const fetchOrders = async () => {
        setLoading(true);
        try {
            const res = await axiosClient.get('/api/purchase-orders');
            setOrders(res.data);
            console.log(res.data);
        } catch (err) {
            message.error("Không thể tải danh sách phiếu nhập");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, []);

    const handleDelete = async (id) => {
        try {
            await axiosClient.delete(`/api/purchase-orders/${id}`);
            message.success("Đã xóa phiếu nhập hàng");
            fetchOrders(); // Tải lại danh sách sau khi xóa thành công
        } catch (err) {
            console.error(err);
            message.error("Lỗi khi xóa phiếu: " + (err.response?.data?.message || err.message));
        }
    };
    const handleUploadImage = async (file, orderId) => {
        const formData = new FormData();
        formData.append('images', file);
        console.log("đính file cho id", orderId);
        const hide = message.loading('Đang tải ảnh lên...', 0);
        try {
            await axiosClient.post(`/api/purchase-orders/${orderId.id}/images`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            message.success('Đính kèm chứng từ thành công');
            fetchOrders(); // Tải lại danh sách để cập nhật trạng thái
        } catch (err) {
            message.error('Lỗi khi đính kèm ảnh');
        } finally {
            hide();
        }
    };
    const columns = [
        {
            title: 'Mã phiếu',
            dataIndex: 'po_code',
            key: 'po_code',
            // Sắp xếp theo chuỗi (A-Z)
            sorter: (a, b) => a.po_code.localeCompare(b.po_code),
            render: (text) => <Text strong className="text-blue">{text}</Text>
        },
        {
            title: 'Ngày nhập',
            dataIndex: 'created_at',
            key: 'created_at',
            // Sắp xếp theo thời gian (Ngày mới nhất lên đầu)
            sorter: (a, b) => dayjs(a.created_at).unix() - dayjs(b.created_at).unix(),
            defaultSortOrder: 'descend', // Mặc định hiện phiếu mới nhất
            render: (date) => dayjs(date).format('DD/MM/YYYY HH:mm')
        },
        {
            title: 'Nhà cung cấp',
            dataIndex: 'supplier_name',
            key: 'supplier_name',
            sorter: (a, b) => a.supplier_name.localeCompare(b.supplier_name),
        },
        {
            title: 'Tổng tiền',
            dataIndex: 'final_amount',
            align: 'right',
            // Sắp xếp theo số (Giá trị từ thấp đến cao hoặc ngược lại)
            sorter: (a, b) => a.final_amount - b.final_amount,
            render: (v) => <Text strong>{Math.round(v).toLocaleString('vi-VN')}đ</Text>
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            key: 'status',
            sorter: (a, b) => a.status.localeCompare(b.status),
            render: (status) => (
                <Tag color={status === 'completed' ? 'green' : 'orange'} style={{ borderRadius: 10 }}>
                    {status === 'completed' ? 'HOÀN THÀNH' : 'BẢN NHÁP'}
                </Tag>
            )
        },
        {
            title: 'Chứng từ',
            key: 'attachment',
            align: 'center',
            render: (_, record) => (
                <>
                    <input
                        type="file"
                        // Gán ref cho đúng ID của dòng này
                        ref={(el) => (fileInputs.current[record.id] = el)}
                        style={{ display: 'none' }}
                        accept="image/*"
                        onChange={(e) => {
                            if (e.target.files[0]) handleUploadImage(e.target.files[0], record);
                        }}
                    />
                    <Button
                        type="dashed"
                        size="small"
                        icon={<PaperClipOutlined />}
                        onClick={(e) => {
                            e.stopPropagation();
                            // Kích hoạt đúng input của dòng đó thông qua ID
                            fileInputs.current[record.id]?.click();
                        }}
                    />
                </>
            ),
        },
        {
            title: 'Thao tác',
            key: 'action',
            width: 120,
            render: (_, record) => (
                <Space onClick={(e) => e.stopPropagation()}>
                    {/* Thêm stopPropagation để khi nhấn nút không bị đóng/mở dòng expandable */}
                    {record.status === 'draft' ? (
                        <Button
                            type="primary"
                            ghost
                            icon={<EditOutlined />}
                            size="small"
                            onClick={() => onEditDraft(record)}
                        >
                            Sửa
                        </Button>
                    ) : (
                        <Button
                            icon={<EyeOutlined />}
                            size="small"
                        >
                            Xem
                        </Button>
                    )}
                    <Popconfirm
                        title="Xóa phiếu nhập"
                        description={`Bạn có chắc chắn muốn xóa phiếu ${record.po_code}?`}
                        onConfirm={() => handleDelete(record.id)}
                        okText="Xóa"
                        cancelText="Hủy"
                        okButtonProps={{ danger: true }}
                    >
                        <Button
                            danger
                            type="text"
                            icon={<DeleteOutlined />}
                            size="small"
                        />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    // Lọc danh sách theo ô tìm kiếm
    const filteredOrders = orders.filter(o =>
        o.po_code.toLowerCase().includes(searchText.toLowerCase()) ||
        o.supplier_name.toLowerCase().includes(searchText.toLowerCase())
    );

    return (
        <Card borderless className="order-list-card">
            <Row gutter={[16, 16]} align="middle" style={{ marginBottom: 20 }}>
                <Col span={12}>
                    <Title level={3} style={{ margin: 0 }}>Quản lý nhập hàng</Title>
                </Col>
                <Col span={12} style={{ textAlign: 'right' }}>
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={onCreateNew}
                        size="large"
                    >
                        Tạo phiếu nhập mới
                    </Button>
                </Col>
                <Col span={8}>
                    <Input
                        placeholder="Tìm theo mã phiếu hoặc NCC..."
                        prefix={<SearchOutlined />}
                        onChange={e => setSearchText(e.target.value)}
                        allowClear
                    />
                </Col>
            </Row>

            <Table
                dataSource={filteredOrders}
                columns={columns}
                rowKey="id"
                loading={loading}
                pagination={{ pageSize: 10 }}
                // --- 2. Cấu hình mở rộng dòng ---
                expandable={{
                    expandedRowRender: (record) => (
                        <div style={{ padding: '10px 40px', backgroundColor: '#f9f9f9' }}>
                            <PurchaseOrderDetailView record={record} onEditDraft={onEditDraft} />
                        </div>
                    ),
                    expandRowByClick: true, // Nhấn vào bất kỳ đâu trên dòng để mở
                    expandedRowClassName: () => 'expanded-row-custom',
                }}
            />
        </Card>
    );
};

export default PurchaseOrderList;