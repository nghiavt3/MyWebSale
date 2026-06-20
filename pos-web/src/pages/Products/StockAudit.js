import React, { useState, useEffect, useMemo } from 'react';
import {
    Table, Input, InputNumber, Button, Card, Typography,
    Space, Tag, AutoComplete, Row, Col, message
} from 'antd';
import { SaveOutlined, SearchOutlined, DeleteOutlined, ShoppingCartOutlined } from '@ant-design/icons';
import axiosClient from '../../api/axiosClient';

const { Title, Text } = Typography;

const StockAudit = () => {
    const [allProducts, setAllProducts] = useState([]);
    const [auditItems, setAuditItems] = useState([]);
    const [searchText, setSearchText] = useState('');
    const [note, setNote] = useState('');

    useEffect(() => {
        axiosClient.get('/api/products').then(res => {
            setAllProducts(res.data);
        }).catch(() => message.error("Lỗi tải danh mục hàng hóa"));
    }, []);

    // Logic tìm kiếm giống POSPage
    const searchOptions = useMemo(() => {
        if (!searchText) return [];

        // 1. Tách từ khóa thành mảng các từ đơn (GIỮ NGUYÊN DẤU)
        const searchWords = searchText.trim().toLowerCase().split(/\s+/).filter(word => word.length > 0);

        return allProducts
            .filter(p => {
                // 2. Tách tên và SKU của sản phẩm thành mảng các từ đơn lẻ (GIỮ NGUYÊN DẤU)
                const productName = (p.master_name || p.name || "").toLowerCase();
                const productSku = (p.sku || "").toLowerCase();

                // Gộp tất cả các từ có sẵn trong sản phẩm (tên + sku) vào một mảng
                const allProductWords = [...productName.split(/\s+/), ...productSku.split(/\s+/)];

                // 3. Logic: Mọi từ khóa người dùng gõ phải có ít nhất 1 từ trong SP khớp hoàn toàn
                // (Ví dụ: "u" và "xi" phải là hai từ độc lập trong tên/sku)
                return searchWords.every(searchWord =>
                    allProductWords.some(productWord => productWord === searchWord)
                );
            })
            .slice(0, 10)
            .map(p => ({
                value: p.sku,
                label: (
                    <div style={{ display: 'flex', alignItems: 'center', padding: '5px 0' }}>
                        <div style={{ marginRight: 10, width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f0f0' }}>
                            {p.image_url ? <img src={p.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <ShoppingCartOutlined />}
                        </div>
                        <div>
                            <div style={{ fontWeight: 'bold' }}>{p.master_name}</div>
                            <div style={{ fontSize: '12px', color: '#888' }}>{p.sku} - Tồn: {Number(p.total_stock)} {p.base_unit}</div>
                        </div>
                    </div>
                ),
                productData: p
            }));
    }, [searchText, allProducts]);

    const onSelectProduct = (_, option) => {
        const p = option.productData;
        if (auditItems.find(i => i.sku === p.sku)) {
            message.warning("Sản phẩm đã có trong danh sách");
        } else {
            setAuditItems([{
                ...p,
                actual_qty_input: p.total_stock / (p.exchange_value || 1),
            }, ...auditItems]);
        }
        setSearchText('');
    };

    const updateActualQty = (sku, val) => {
        setAuditItems(prev => prev.map(item =>
            item.sku === sku ? { ...item, actual_qty_input: val } : item
        ));
    };

    const handleSave = async () => {
        if (auditItems.length === 0) return message.error("Chưa có sản phẩm nào");
        try {
            await axiosClient.post('/api/stock-audits', { items: auditItems, note });
            message.success("Cân bằng kho thành công!");
            setAuditItems([]);
            setNote('');
        } catch (err) { message.error("Lỗi lưu phiếu kiểm"); }
    };

    const columns = [
        { title: 'Mã hàng', dataIndex: 'sku', width: 120 },
        { title: 'Tên hàng', dataIndex: 'master_name' },
        { title: 'ĐVT', dataIndex: 'unit_name', width: 80 },
        { title: 'Tồn hệ thống', dataIndex: 'total_stock', width: 120, render: (val) => <Text strong>{Number(val)}</Text> },
        {
            title: 'Số thực tế', width: 150,
            render: (_, record) => (
                <InputNumber
                    min={0}
                    style={{ width: '100%' }}
                    value={record.actual_qty_input}
                    onFocus={(e) => e.target.select()}
                    onChange={(val) => updateActualQty(record.sku, val)}
                />
            )
        },
        {
            title: 'Lệch', width: 100, align: 'center',
            render: (_, record) => {
                const diff = (record.actual_qty_input * (record.exchange_value || 1)) - record.total_stock;
                return <Tag color={diff === 0 ? 'green' : (diff > 0 ? 'blue' : 'red')}>{diff > 0 ? `+${diff}` : diff}</Tag>;
            }
        },
        {
            title: '', width: 50,
            render: (_, record) => <Button type="text" danger icon={<DeleteOutlined />} onClick={() => setAuditItems(auditItems.filter(i => i.sku !== record.sku))} />
        }
    ];

    return (
        <div style={{ padding: 20 }}>
            <Card title={<Title level={3}>Kiểm kho & Cân bằng</Title>}>
                <Row gutter={16} style={{ marginBottom: 20 }}>
                    <Col span={12}>
                        <AutoComplete
                            options={searchOptions}
                            onSelect={onSelectProduct}
                            onSearch={setSearchText}
                            value={searchText}
                            style={{ width: '100%' }}
                            dropdownMatchSelectWidth={400}
                        >
                            <Input size="large" placeholder="Tìm hàng hóa (quét mã hoặc tên)..." prefix={<SearchOutlined />} allowClear />
                        </AutoComplete>
                    </Col>
                </Row>

                <Table
                    dataSource={auditItems}
                    columns={columns}
                    rowKey="sku"
                    pagination={false}
                    bordered
                />

                <div style={{ marginTop: 20 }}>
                    <Input.TextArea placeholder="Ghi chú kiểm kho..." value={note} onChange={e => setNote(e.target.value)} rows={3} />
                    <Button type="primary" size="large" icon={<SaveOutlined />} onClick={handleSave} style={{ marginTop: 15 }}>
                        Hoàn thành & Cân bằng kho
                    </Button>
                </div>
            </Card>
        </div>
    );
};

export default StockAudit;