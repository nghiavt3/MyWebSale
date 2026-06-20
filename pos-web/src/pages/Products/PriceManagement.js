import React, { useEffect, useState, useMemo } from 'react';
import debounce from 'lodash/debounce'; // Import ở đầu file
import { Table, InputNumber, Button, Card, Typography, Space, Input, Tag, message } from 'antd';
import { SaveOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import axiosClient from '../../api/axiosClient';

const { Title, Text } = Typography;

const PriceManagement = () => {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState([]); // Dữ liệu gốc từ server
    const [editingData, setEditingData] = useState({}); // Lưu các thay đổi tạm thời {sku: {sale_price, cost_price}}

    // Trong component PriceManagement:
    const [inputValue, setInputValue] = useState(''); // State để hiển thị trên Input
    const [searchText, setSearchText] = useState(''); // State thực tế để filter Table
    // Khởi tạo hàm debounce (chờ 400ms sau khi ngừng gõ)
    const debouncedSetSearch = useMemo(
        () => debounce((value) => setSearchText(value), 400),
        []
    );
    const removeAccents = (str) => {
        if (!str) return "";
        return str
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/đ/g, 'd')
            .replace(/Đ/g, 'D')
            .toLowerCase();
    };
    // Dọn dẹp debounce khi component unmount
    useEffect(() => {
        return () => debouncedSetSearch.cancel();
    }, [debouncedSetSearch]);
    const fetchPrices = async () => {
        setLoading(true);
        try {
            const res = await axiosClient.get('/api/price-management');
            setData(res.data);
            setEditingData({}); // Reset bộ nhớ tạm
        } catch (err) {
            message.error("Không thể tải dữ liệu giá");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPrices();
    }, []);

    // Xử lý khi thay đổi giá trên Input
    const handleInputChange = (sku, field, value) => {
        setEditingData(prev => {
            // Lấy thông tin sản phẩm hiện tại từ record (nếu đã có trong prev thì dùng, không thì lấy từ data)
            const currentItem = prev[sku] || data.find(item => item.sku === sku);

            return {
                ...prev,
                [sku]: {
                    ...currentItem,
                    [field]: value
                }
            };
        });
    };

    // Lưu dữ liệu lên Server
    const handleSave = async () => {
        const updates = Object.values(editingData);
        if (updates.length === 0) {
            return message.info("Chưa có thay đổi nào");
        }

        try {
            await axiosClient.post('/api/price-management/update', { updates });
            message.success(`Đã cập nhật giá cho ${updates.length} mã hàng`);
            fetchPrices();
        } catch (err) {
            message.error("Lỗi khi lưu dữ liệu");
        }
    };

    const filteredData = useMemo(() => {
        if (!searchText) return data;

        // 1. Tách từ khóa thành mảng (giữ nguyên dấu để so sánh chính xác)
        const keywords = searchText.trim().split(/\s+/).filter(x => x.length > 0);

        return data.filter(item => {
            // 2. Lấy tên và SKU, tách thành mảng các từ đơn lẻ (giữ nguyên dấu)
            const nameWords = (item.master_name || "").toLowerCase().split(/\s+/);
            const skuWords = (item.sku || "").toLowerCase().split(/\s+/);

            // Gộp tất cả các từ có sẵn trong sản phẩm vào một mảng
            const allProductWords = [...nameWords, ...skuWords];

            // 3. Logic: Mọi từ khóa người dùng gõ phải có ít nhất 1 từ trong SP khớp hoàn toàn
            // (Sử dụng .toLowerCase() để đảm bảo so sánh không bị lỗi chữ hoa/thường)
            return keywords.every(key =>
                allProductWords.some(word => word === key.toLowerCase())
            );
        });
    }, [data, searchText]);

    const columns = [
        {
            title: 'Mã hàng',
            dataIndex: 'sku',
            key: 'sku',
            width: 150,
        },
        {
            title: 'Tên hàng / ĐVT',
            key: 'name',
            render: (record) => (
                <Space direction="vertical" size={0}>
                    <Text strong>{record.master_name}</Text>
                    <Tag color="blue">{record.unit_name}</Tag>
                </Space>
            )
        },
        {
            title: 'Giá vốn',
            dataIndex: 'cost_price',
            width: 200,
            render: (val, record) => (
                <InputNumber
                    style={{ width: '100%' }}
                    formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    parser={value => value.replace(/\$\s?|(,*)/g, '')}
                    value={editingData[record.sku]?.cost_price ?? val}
                    onChange={(v) => handleInputChange(record.sku, 'cost_price', v)}
                />
            )
        },
        {
            title: 'Giá bán',
            dataIndex: 'sale_price',
            width: 200,
            render: (val, record) => (
                <InputNumber
                    style={{ width: '100%', color: '#1890ff', fontWeight: 'bold' }}
                    formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    parser={value => value.replace(/\$\s?|(,*)/g, '')}
                    value={editingData[record.sku]?.sale_price ?? val}
                    onChange={(v) => handleInputChange(record.sku, 'sale_price', v)}
                />
            )
        },
        {
            title: 'Trạng thái',
            key: 'status',
            width: 120,
            align: 'center',
            render: (record) => editingData[record.sku] ? <Tag color="orange">Đang sửa</Tag> : null
        }
    ];

    return (
        <div style={{ padding: '24px', background: '#f0f2f5', minHeight: '100vh' }}>
            <Card>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24, alignItems: 'center' }}>
                    <Title level={3} style={{ margin: 0 }}>Thiết lập giá bán</Title>
                    <Space>
                        <Button icon={<ReloadOutlined />} onClick={fetchPrices}>Làm mới</Button>
                        <Button
                            type="primary"
                            icon={<SaveOutlined />}
                            onClick={handleSave}
                            disabled={Object.keys(editingData).length === 0}
                            size="large"
                        >
                            Lưu thay đổi ({Object.keys(editingData).length})
                        </Button>
                    </Space>
                </div>

                <Input
                    placeholder="Tìm theo mã hoặc tên hàng..."
                    prefix={<SearchOutlined />}
                    style={{ marginBottom: 20, width: 400 }}
                    allowClear
                    value={inputValue} // Sử dụng inputValue
                    onChange={e => {
                        const val = e.target.value;
                        setInputValue(val);          // Cập nhật giao diện ngay lập tức
                        debouncedSetSearch(val);     // Trì hoãn việc filter table
                    }}
                />

                <Table
                    dataSource={filteredData}
                    columns={columns}
                    rowKey="sku"
                    loading={loading}
                    pagination={{ pageSize: 20 }}
                    scroll={{ y: 'calc(100vh - 350px)' }}
                    bordered
                />
            </Card>
        </div>
    );
};

export default PriceManagement;