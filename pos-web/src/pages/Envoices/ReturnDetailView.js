import React, { useState, useEffect } from 'react';
import { Table, Typography, message } from 'antd';
import axiosClient from '../../api/axiosClient';

const { Text } = Typography;

const ReturnDetailView = ({ returnId }) => {
    const [details, setDetails] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchDetails = async () => {
            if (!returnId) return;
            setLoading(true);
            try {
                const res = await axiosClient.get(`/api/return-invoices/${returnId}/details`);
                setDetails(res.data);
            } catch (err) {
                console.error(err);
                message.error("Không thể tải chi tiết hàng trả");
            } finally {
                setLoading(false);
            }
        };
        fetchDetails();
    }, [returnId]);

    const detailColumns = [
        { 
            title: 'Mã hàng', 
            dataIndex: 'product_sku', 
            key: 'product_sku',
            render: (text) => <Text copyable>{text}</Text>
        },
        { 
            title: 'Tên hàng', 
            dataIndex: 'product_name', 
            key: 'product_name' 
        },
        { 
            title: 'ĐVT', 
            dataIndex: 'unit_name', 
            key: 'unit_name',
            align: 'center'
        },
        { 
            title: 'Số lượng', 
            dataIndex: 'quantity', 
            align: 'right',
            render: (val) => <Text strong>{Number(val).toLocaleString()}</Text> 
        },
        { 
            title: 'Giá hoàn', 
            dataIndex: 'return_price', 
            align: 'right',
            render: (val) => `${Number(val).toLocaleString()}đ` 
        },
        { 
            title: 'Thành tiền', 
            dataIndex: 'line_total', 
            align: 'right',
            render: (val) => <Text strong type="danger">{Number(val).toLocaleString()}đ</Text> 
        },
    ];

    return (
        <Table
            columns={detailColumns}
            dataSource={details}
            pagination={false}
            rowKey={(record) => record.id || record.product_sku}
            loading={loading}
            size="small"
            bordered
            locale={{ emptyText: 'Không có dữ liệu chi tiết' }}
        />
    );
};

// Quan trọng: Phải có dòng này để fix lỗi "export 'default' not found"
export default ReturnDetailView;