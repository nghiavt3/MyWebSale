import React from 'react';
import { Table, Typography, Row, Col, Space, Divider, Button, Tag, Image } from 'antd';
import { EditOutlined, EyeOutlined, PrinterOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { Text, Title } = Typography;

const PurchaseOrderDetailView = ({ record, onEditDraft, hideActions = false }) => {
    if (!record) return null;
    const detailColumns = [
        {
            title: 'Mã hàng',
            dataIndex: 'product_sku',
            key: 'sku',
            render: (text) => <Text className="text-blue">{text}</Text>
        },
        { title: 'Tên hàng', dataIndex: 'name', key: 'name' },
        {
            title: 'Số lượng',
            dataIndex: 'quantity',
            key: 'qty',
            align: 'right'
        },
        {
            title: 'Giá nhập',
            dataIndex: 'cost_price',
            key: 'price',
            align: 'right',
            render: (v) => v?.toLocaleString()
        },
        {
            title: 'Loại CK',
            dataIndex: 'lineDiscountType',
            key: 'disc',
            align: 'right',
            render: (v) => v?.toLocaleString()
        },
        {
            title: 'Giảm giá',
            dataIndex: 'lineDiscountValue',
            key: 'disc',
            align: 'right',
            render: (v) => v?.toLocaleString()
        },
        {
            title: 'Thành tiền',
            dataIndex: 'total',
            key: 'total',
            align: 'right',
            render: (v) => <Text strong>{v?.toLocaleString()}</Text>
        },
    ];

    return (
        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #f0f0f0' }}>
            <Row gutter={24} style={{ marginBottom: 20 }}>
                <Col span={12}>
                    <Space direction="vertical" size={0}>
                        <Title level={4} style={{ margin: 0 }}>{record.po_code}</Title>
                        <Tag color={record.status === 'completed' ? 'green' : 'orange'}>
                            {record.status === 'completed' ? 'HOÀN THÀNH' : 'BẢN NHÁP'}
                        </Tag>
                    </Space>
                </Col>
                <Col span={12} style={{ textAlign: 'right' }}>
                    {!hideActions && (
                        <Space>
                            {record.status === 'draft' && (
                                <Button type="primary" icon={<EditOutlined />} onClick={() => onEditDraft?.(record)}>
                                    Sửa phiếu
                                </Button>
                            )}
                            <Button icon={<PrinterOutlined />}>In phiếu</Button>
                        </Space>
                    )}
                </Col>
            </Row>

            <Row gutter={24} style={{ marginBottom: 20 }}>
                <Col span={8}>
                    <Text type="secondary">Người tạo: </Text> <Text strong>Quản trị viên</Text> <br />
                    <Text type="secondary">Ngày nhập: </Text> <Text>{dayjs(record.created_at).format('DD/MM/YYYY HH:mm')}</Text>
                </Col>
                <Col span={8}>
                    <Text type="secondary">Nhà cung cấp: </Text> <Text strong style={{ color: '#1890ff' }}>{record.supplier_name}</Text> <br />
                    <Text type="secondary">Địa chỉ: </Text> <Text>{record.address || '---'}</Text>
                </Col>
                <Col span={8}>
                    <Text type="secondary">Ghi chú: </Text> <Text italic>{record.note || 'Không có ghi chú'}</Text>
                </Col>
            </Row>

            <Table
                columns={detailColumns}
                dataSource={record.details || []}
                pagination={false}
                rowKey="id"
                size="small"
                bordered
            />
            {/* THÊM PHẦN HIỂN THỊ HÌNH ẢNH Ở ĐÂY */}
            {record.images && record.images.length > 0 && (
                <div style={{ marginTop: 20 }}>
                    <Divider orientation="left"><Text type="secondary">Hình ảnh chứng từ</Text></Divider>
                    <Space size={12} wrap>
                        <Image.PreviewGroup>
                            {record.images.map((imgUrl, index) => (
                                <Image
                                    key={index}
                                    width={100}
                                    height={100}
                                    style={{ objectFit: 'cover', borderRadius: '8px', border: '1px solid #d9d9d9' }}
                                    src={`${process.env.REACT_APP_API_URL}${imgUrl}`} // Ghép với URL Server
                                    fallback="https://via.placeholder.com/100?text=Error" // Ảnh thay thế nếu lỗi
                                />
                            ))}
                        </Image.PreviewGroup>
                    </Space>
                </div>
            )}
            <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
                <Space direction="vertical" style={{ width: '300px' }} size={10}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Text>Tổng tiền hàng:</Text>
                        <Text strong>{Math.round(record.total_amount || 0).toLocaleString()}đ</Text>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Text>Giảm giá phiếu:</Text>
                        <Text>{Math.round(record.discount_value || 0).toLocaleString()}đ</Text>
                    </div>
                    <Divider style={{ margin: '4px 0' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text strong fontSize={16}>CẦN TRẢ NCC:</Text>
                        <Title level={4} style={{ margin: 0, color: '#1890ff' }}>
                            {Math.round(record.final_amount || 0).toLocaleString()}đ
                        </Title>
                    </div>
                </Space>
            </div>
        </div>
    );
};

export default PurchaseOrderDetailView;