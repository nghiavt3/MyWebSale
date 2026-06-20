import React, { useState, useEffect, useMemo, useRef } from 'react';
import debounce from 'lodash/debounce';
import {
    Layout, Row, Col, Input, Button, Table, Typography,
    Divider, InputNumber, Space, AutoComplete, message
} from 'antd';
import {
    SearchOutlined, ScanOutlined, UserOutlined,
    DeleteOutlined, PrinterOutlined, MoreOutlined, ShoppingCartOutlined,
    EditOutlined
} from '@ant-design/icons';
import axiosClient from '../../api/axiosClient';
import './ReturnPage.css';

const { Header, Content, Sider } = Layout;
const { Text, Title } = Typography;

const ReturnPage = () => {
    const [allProducts, setAllProducts] = useState([]);
    const [searchCustomerText, setSearchCustomerText] = useState('');
    // State cho Input (mượt mà)
    const [inputSearchText, setInputSearchText] = useState('');
    const [inputCustomerText, setInputCustomerText] = useState('');
    const [debouncedSearchText, setDebouncedSearchText] = useState('');
    const [debouncedCustomerText, setDebouncedCustomerText] = useState('');
    const [allCustomers, setAllCustomers] = useState([]);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [searchText, setSearchText] = useState('');
    const [selectedItems, setSelectedItems] = useState([]);
    const [discount, setDiscount] = useState(0);
    const [returnFee, setReturnFee] = useState(0);
    const [paymentMethod, setPaymentMethod] = useState('cash'); // Mặc định là cash
    const searchInputRef = useRef(null);

    const removeAccents = (str) => {
        if (!str) return "";
        return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
    };
    // Khởi tạo Debounce functions
    const debounceProduct = useMemo(() => debounce(setDebouncedSearchText, 300), []);
    const debounceCustomer = useMemo(() => debounce(setDebouncedCustomerText, 300), []);

    useEffect(() => {
        return () => {
            debounceProduct.cancel();
            debounceCustomer.cancel();
        };
    }, [debounceProduct, debounceCustomer]);
    // --- 2. FETCH DATA HỆ THỐNG ---
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [prodRes, custRes] = await Promise.all([
                    axiosClient.get('/api/products'),
                    axiosClient.get('/api/customers')
                ]);
                setAllProducts(prodRes.data);
                setAllCustomers(custRes.data);
            } catch (err) {
                message.error("Không thể kết nối đến server để lấy dữ liệu");
            }
        };
        fetchData();
    }, []);

    // Tính toán tiền
    const totalReturnAmount = useMemo(() => {
        return selectedItems.reduce((sum, item) => sum + (item.quantity * item.return_price), 0);
    }, [selectedItems]);

    const finalReturn = totalReturnAmount - discount - returnFee;

    // Logic tìm kiếm sản phẩm (Giống POSPage)
    // Logic tìm kiếm sản phẩm (Giống POSPage)

    const searchOptions = useMemo(() => {
        if (!debouncedSearchText) return [];

        // 1. Tách từ khóa thành mảng (GIỮ NGUYÊN DẤU)
        const keywords = debouncedSearchText.trim().split(/\s+/).filter(x => x.length > 0);

        return allProducts
            .filter(p => {
                // 2. Tách tên và SKU của sản phẩm thành mảng các từ đơn lẻ (GIỮ NGUYÊN DẤU)
                const productName = (p.master_name || p.name || "").toLowerCase();
                const productSku = (p.sku || "").toLowerCase();

                // Gộp tất cả các từ có sẵn trong sản phẩm (tên + sku)
                const allProductWords = [...productName.split(/\s+/), ...productSku.split(/\s+/)];

                // 3. Logic: Mọi từ khóa người dùng gõ phải có ít nhất 1 từ trong SP khớp hoàn toàn
                return keywords.every(key =>
                    allProductWords.some(word => word === key.toLowerCase())
                );
            })
            .slice(0, 15)
            .map(p => ({
                value: p.sku,
                label: (
                    <div className="search-result-item">
                        <div className="item-img">
                            {p.image_url ? <img src={p.image_url} alt="" /> : <ShoppingCartOutlined />}
                        </div>
                        <div className="item-info">
                            <div className="item-line-1">
                                <Text strong className="text-blue">{p.master_name || p.name}</Text>
                                <Text strong style={{ color: '#f5222d' }}>{Number(p.sale_price).toLocaleString()}đ</Text>
                            </div>
                            <div className="item-line-2">
                                <Text type="secondary">{p.sku}</Text>
                                <Text type="secondary">Tồn: <b style={{ color: Number(p.total_stock) > 0 ? '#52c41a' : '#ff4d4f' }}>{Number(p.total_stock)}</b></Text>
                            </div>
                        </div>
                    </div>
                ),
                productData: p
            }));
    }, [debouncedSearchText, allProducts]);

    const onSelectProduct = (value, option) => {
        const p = option.productData;
        const existing = selectedItems.find(item => item.sku === p.sku);
        if (existing) {
            setSelectedItems(selectedItems.map(i => i.sku === p.sku ? { ...i, quantity: i.quantity + 1 } : i));
        } else {
            setSelectedItems([{ ...p, quantity: 1, return_price: p.sale_price }, ...selectedItems]);
        }
        setSearchText('');
    };

    // 1. Logic lọc danh sách khách hàng
    const customerOptions = useMemo(() => {
        if (!debouncedCustomerText) return [];
        const cleanKey = removeAccents(debouncedCustomerText);

        return allCustomers
            .filter(c =>
                removeAccents(c.name).includes(cleanKey) ||
                (c.phone || "").includes(cleanKey)
            )
            .map(c => ({
                value: c.phone,
                label: `${c.name} - ${c.phone}`,
                customerData: c
            }));
    }, [debouncedCustomerText, allCustomers]);

    // 2. Hàm xử lý khi chọn khách hàng
    const onSelectCustomer = (value, option) => {
        setSelectedCustomer(option.customerData);
        setSearchCustomerText(option.label); // Hiển thị tên + sđt lên ô input
    };
    const columns = [
        { title: 'Tên hàng', dataIndex: 'master_name', key: 'name' },
        {
            title: 'Số lượng',
            dataIndex: 'quantity',
            width: 120,
            render: (val, record) => (
                <InputNumber min={1} value={val} variant="borderless" onChange={v => setSelectedItems(selectedItems.map(i => i.sku === record.sku ? { ...i, quantity: v } : i))} />
            )
        },
        {
            title: 'Giá bán',
            dataIndex: 'return_price',
            width: 120,
            render: (val) => val.toLocaleString()
        },
        {
            title: 'Chiết khấu',
            width: 120,
            render: () => <InputNumber defaultValue={0} variant="borderless" />
        },
        {
            title: 'Thành tiền',
            align: 'right',
            width: 120,
            render: (_, r) => <Text strong>{(r.quantity * r.return_price).toLocaleString()}</Text>
        },
        {
            title: '',
            width: 50,
            render: (_, r) => <Button type="text" danger icon={<DeleteOutlined />} onClick={() => setSelectedItems(selectedItems.filter(i => i.sku !== r.sku))} />
        }
    ];
    const handleReturnPay = async () => {
        // 1. Kiểm tra điều kiện cơ bản
        if (selectedItems.length === 0) {
            return message.warning("Vui lòng chọn ít nhất một sản phẩm để trả!");
        }

        const hide = message.loading('Đang xử lý phiếu trả hàng...', 0);

        try {
            // 2. Chuẩn bị dữ liệu theo đúng nghiệp vụ
            const returnData = {
                customer_id: selectedCustomer?.id || null, // ID khách hàng (nếu có)
                customer_name: selectedCustomer?.name || "Khách lẻ",
                items: selectedItems.map(item => ({
                    product_id: item.product_id,
                    sku: item.sku,
                    product_name: item.master_name,
                    quantity: item.quantity,
                    return_price: item.return_price,
                    total: item.quantity * item.return_price
                })),
                total_items_price: totalReturnAmount,
                discount: discount,
                return_fee: returnFee,
                final_refund: finalReturn, // Số tiền thực tế hoàn trả khách
                payment_method: paymentMethod, // Có thể lấy động từ state nếu có toggle
                note: document.querySelector('.pos-note-input')?.value || ""
            };
            console.log("data trả hàng", returnData)
            // 3. Gửi API
            const response = await axiosClient.post('/api/returns', returnData);

            if (response.status === 201) {
                hide();
                message.success("Trả hàng thành công!");

                // Reset form
                setSelectedItems([]);
                setSelectedCustomer(null);
                setSearchCustomerText('');
                setDiscount(0);
                setReturnFee(0);

                // (Tùy chọn) Mở hộp thoại in hóa đơn tại đây
            }
        } catch (error) {
            hide();
            console.error("Return Error:", error);
            message.error(error.response?.data?.message || "Có lỗi xảy ra khi xử lý trả hàng");
        }
    };
    return (
        <Layout className="pos-return-layout">
            <Content className="pos-return-main">
                {/* Header tìm kiếm trắng giống POS */}
                <div className="pos-header-container">
                    <AutoComplete
                        options={searchOptions}
                        onSelect={(val, opt) => {
                            onSelectProduct(val, opt);
                            setInputSearchText(''); // Xóa trắng ô nhập sau khi chọn
                            setDebouncedSearchText('');
                        }}
                        onSearch={(val) => {
                            setInputSearchText(val); // UI hiện chữ ngay
                            debounceProduct(val);    // Logic lọc chạy sau 300ms
                        }}
                        value={inputSearchText}
                        style={{ flex: 1 }}
                    >
                        <Input
                            ref={searchInputRef}
                            placeholder="Tìm hàng trả (F3)"
                            prefix={<SearchOutlined />}
                            size="large"
                            className="pos-search-input"
                        />
                    </AutoComplete>
                    <Space style={{ marginLeft: 16 }}>
                        <Button icon={<PrinterOutlined />} size="large" />
                        <Button icon={<MoreOutlined />} size="large" />
                    </Space>
                </div>

                {/* Bảng hàng hóa */}
                <div className="pos-table-container">
                    <Table
                        columns={columns}
                        dataSource={selectedItems}
                        pagination={false}
                        rowKey="sku"
                        locale={{ emptyText: 'No data' }}
                    />
                </div>

                {/* Ghi chú & Hàng đổi (Vùng dưới bảng) */}
                <div className="pos-bottom-zone">
                    <Input prefix={<EditOutlined />} placeholder="Ghi chú đơn hàng" variant="borderless" className="pos-note-input" />
                </div>
            </Content>

            <Sider width={380} theme="light" className="pos-return-sidebar">
                <div className="sidebar-user-section">
                    <div className="user-info">
                        <Text strong fontSize={16}>Vương Trọng Nghĩa</Text>
                        <Text type="secondary">03/03/2026 08:10</Text>
                    </div>
                    <AutoComplete
                        value={inputCustomerText}
                        options={customerOptions}
                        onSearch={(val) => {
                            setInputCustomerText(val);
                            debounceCustomer(val);
                        }}
                        onSelect={(value, option) => {
                            setSelectedCustomer(option.customerData);
                            setInputCustomerText(option.label); // Hiển thị tên đầy đủ
                        }}
                        placeholder="Tìm khách hàng (F4)"
                        style={{ width: '100%', marginTop: 15 }}
                        allowClear
                        onClear={() => {
                            setSelectedCustomer(null);
                            setInputCustomerText('');
                            setDebouncedCustomerText('');
                        }}
                    />
                </div>

                <div className="pos-billing-section">
                    {/* 1. Tổng giá trị hàng khách mang tới trả */}
                    <div className="billing-row">
                        <Text>Tổng tiền hàng trả</Text>
                        <Text strong style={{ color: '#f5222d' }}>{totalReturnAmount.toLocaleString()}</Text>
                    </div>

                    {/* 2. Giảm giá (Nếu muốn bớt thêm tiền hoàn lại) */}
                    <div className="billing-row">
                        <Text>Giảm giá</Text>
                        <Space>
                            <InputNumber
                                value={discount}
                                onChange={setDiscount}
                                className="pos-billing-input"
                                formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                            />
                            <div className="pos-unit-tag">đ</div>
                        </Space>
                    </div>

                    {/* 3. Phí trả hàng (Cửa hàng thu phí khách - Rất quan trọng trong nghiệp vụ) */}
                    <div className="billing-row">
                        <Text>Phí trả hàng</Text>
                        <Space>
                            <InputNumber
                                value={returnFee}
                                onChange={setReturnFee}
                                className="pos-billing-input"
                                formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                            />
                            <div className="pos-unit-tag">đ</div>
                        </Space>
                    </div>

                    <div className="billing-row total-row">
                        <Text strong>CẦN TRẢ KHÁCH</Text>
                        <Title level={2} style={{ margin: 0, color: '#52c41a' }}>
                            {finalReturn.toLocaleString()}
                        </Title>
                    </div>

                    {/* 4. Hình thức hoàn tiền (Thay cho Tiền khách đưa) */}
                    <div className="billing-row">
                        <Text>Hoàn tiền bằng</Text>
                        <div className="payment-method-toggle">
                            <Button
                                size="small"
                                type={paymentMethod === 'cash' ? 'primary' : 'default'}
                                onClick={() => setPaymentMethod('cash')}
                            >
                                Tiền mặt
                            </Button>
                            <Button
                                size="small"
                                style={{ marginLeft: 4 }}
                                type={paymentMethod === 'transfer' ? 'primary' : 'default'}
                                onClick={() => setPaymentMethod('transfer')}
                            >
                                Chuyển khoản
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="pos-action-container">
                    <Button type="primary" block className="pos-btn-pay" onClick={handleReturnPay}>
                        <PrinterOutlined /> TRẢ HÀNG
                    </Button>
                </div>
            </Sider>
        </Layout>
    );
};

export default ReturnPage;