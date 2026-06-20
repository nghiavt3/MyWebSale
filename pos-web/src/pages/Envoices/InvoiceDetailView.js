import React from 'react';
import { Table, Typography, Row, Col, Space, Divider, Tag } from 'antd';
import dayjs from 'dayjs';

const { Text, Title } = Typography;

const InvoiceDetailView = ({ record }) => {
    if (!record) return null;

    const columns = [
        { title: 'Mã hàng', dataIndex: 'product_sku', key: 'sku' },
        { title: 'Tên hàng', dataIndex: 'product_name', key: 'name' },
        { title: 'SL', dataIndex: 'quantity', align: 'right' },
        { title: 'Giá bán', dataIndex: 'sale_price', align: 'right', render: v => v?.toLocaleString() },
        { title: 'Giảm giá', dataIndex: 'line_discount_value', align: 'right', render: v => v?.toLocaleString() },
        { 
            title: 'Thành tiền', 
            dataIndex: 'line_total', 
            align: 'right', 
            render: v => <Text strong>{v?.toLocaleString()}đ</Text> 
        },
    ];

    return (
        <div style={{ padding: '10px' }}>
            <Row gutter={24} style={{ marginBottom: 15 }}>
                <Col span={8}>
                    <Text type="secondary">Mã đơn: </Text> <Text strong>{record.invoice_code}</Text><br/>
                    <Text type="secondary">Thời gian: </Text> <Text>{dayjs(record.created_at).format('DD/MM/YYYY HH:mm')}</Text>
                </Col>
                <Col span={8}>
                    <Text type="secondary">Khách hàng: </Text> <Text strong color="blue">{record.customer_name || 'Khách lẻ'}</Text><br/>
                    <Text type="secondary">Ghi chú: </Text> <Text italic>{record.note || '---'}</Text>
                </Col>
                <Col span={8} align="right">
                    <Tag color="green">ĐÃ THANH TOÁN</Tag>
                </Col>
            </Row>

            <Table 
                columns={columns} 
                dataSource={record.details || []} 
                pagination={false} 
                size="small" 
                bordered 
                rowKey="id"
            />

            <div style={{ marginTop: 15, textAlign: 'right' }}>
                <Space direction="vertical" style={{ width: 250 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Text>Tổng tiền hàng:</Text>
                        <Text strong>{record.total_amount?.toLocaleString()}đ</Text>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Text>Giảm giá HD:</Text>
                        <Text>-{record.discount_value?.toLocaleString()}đ</Text>
                    </div>
                    <Divider style={{ margin: '4px 0' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Text strong>KHÁCH ĐÃ TRẢ:</Text>
                        <Title level={4} style={{ margin: 0, color: '#1890ff' }}>
                            {record.final_amount?.toLocaleString()}đ
                        </Title>
                    </div>
                </Space>
            </div>
        </div>
    );
};

export default InvoiceDetailView;