import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import {
    Row, Col, Table, Input, Button, InputNumber, Typography,
    Space, AutoComplete, Divider, Select, message, Checkbox, Layout, Modal, DatePicker
} from 'antd';
import dayjs from 'dayjs';
import {
    SearchOutlined, DeleteOutlined, ShoppingCartOutlined,
    PrinterOutlined, EditOutlined, MoreOutlined, PlusOutlined
} from '@ant-design/icons';
import axiosClient from '../../api/axiosClient';
import './POSPage.css';
import CustomerModal from '../../components/CustomerModal/CustomerModal';
import StockHistoryTable from '../Products/StockHistoryTable';
const { Text, Title } = Typography;
const { Content, Header } = Layout;

const POSPage = () => {
    const location = useLocation();
    const editData = location.state?.editInvoice;
    // --- STATE QUẢN LÝ ---
    const [allProducts, setAllProducts] = useState([]);
    const [selectedItems, setSelectedItems] = useState([]);
    const [searchText, setSearchText] = useState('');
    const [searchCustomerText, setSearchCustomerText] = useState('');
    const [allCustomers, setAllCustomers] = useState([]);
    const [selectedCustomer, setSelectedCustomer] = useState(null);

    const [discountValue, setDiscountValue] = useState(0);
    const [discountType, setDiscountType] = useState('VND');
    const [note, setNote] = useState('');
    const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
    const [customerPay, setCustomerPay] = useState(0);
    const [editingInvoiceId, setEditingInvoiceId] = useState(null);

    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [selectedSkuForHistory, setSelectedSkuForHistory] = useState(null);

    const [invoiceDate, setInvoiceDate] = useState(dayjs());
    // Thêm useEffect này để chạy đồng hồ thực tế
    useEffect(() => {
        const timer = setInterval(() => {
            setInvoiceDate(dayjs());
        }, 1000); // Cập nhật mỗi giây

        return () => clearInterval(timer); // Clear loop khi đóng component
    }, []);
    // --- FETCH DATA ---
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
                message.error("Lỗi tải dữ liệu hệ thống");
            }
        };
        fetchData();
    }, []);

    useEffect(() => {
        if (editData) {
            console.log("Dữ liệu chỉnh sửa:", editData);

            // 1. Lưu ID hóa đơn để dùng cho API UPDATE sau này
            setEditingInvoiceId(editData.id);

            // 2. Đổ thông tin khách hàng
            // Nếu customer_id là null, coi như khách lẻ
            if (editData.customer_id) {
                // Tìm trong danh sách khách hàng có sẵn (nếu bạn đã load allCustomers)
                const cust = allCustomers.find(c => c.id === editData.customer_id);
                setSelectedCustomer(cust || { id: editData.customer_id, name: editData.customer_name, phone: editData.customer_phone });
            } else {
                setSelectedCustomer(null);
            }

            // 3. Đổ thông tin Ghi chú và Giảm giá tổng đơn
            setNote(editData.note || '');
            setDiscountValue(Number(editData.discount_value) || 0);
            setDiscountType(editData.discount_type || 'VND');

            // 4. Đổ danh sách sản phẩm (Details)
            if (editData.details && Array.isArray(editData.details)) {
                const itemsFromDraft = editData.details.map(item => ({
                    // Map chính xác các key từ editData vào cấu trúc giỏ hàng POS
                    sku: item.product_sku,
                    master_name: item.product_name || item.name,
                    quantity: Number(item.quantity),
                    sale_price: Number(item.sale_price),
                    lineDiscountValue: Number(item.line_discount_value) || 0,
                    lineDiscountType: 'VND', // Mặc định hoặc lấy từ field nếu có
                    total: Number(item.line_total)
                }));

                setSelectedItems(itemsFromDraft);
            }
        }
    }, [editData, allCustomers]);
    // Thêm useEffect này sau các useMemo tính toán


    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [currentInvoice, setCurrentInvoice] = useState(null);

    // Hàm mở Modal xác nhận thay vì gọi API trực tiếp
    const showConfirmPayment = () => {
        if (selectedItems.length === 0) return message.warning("Giỏ hàng trống!");
        setIsConfirmModalOpen(true);
    };

    const handlePrint = (invoiceData) => {
        const printWindow = window.open('', '_blank');
        const itemsHtml = selectedItems.map(item => `
        <tr>
            <td colspan="3">${item.master_name}</td>
        </tr>
        <tr>
            <td>${item.quantity} x ${item.sale_price.toLocaleString()}</td>
            <td align="right">${item.total.toLocaleString()}</td>
        </tr>
    `).join('');

        printWindow.document.write(`
        <html>
            <head>
                <style>
                    body { font-family: 'Courier New', Courier, monospace; width: 80mm; font-size: 12px; }
                    .text-center { text-align: center; }
                    .text-right { text-align: right; }
                    table { width: 100%; border-collapse: collapse; }
                    .divider { border-top: 1px dashed #000; margin: 5px 0; }
                    .bold { font-weight: bold; }
                </style>
            </head>
            <body>
                <h3 class="text-center">HÓA ĐƠN BÁN HÀNG</h3>
                <p class="text-center">Mã HD: ${invoiceData.invoice_code}<br>${new Date().toLocaleString()}</p>
                <p>Khách hàng: ${selectedCustomer?.name || 'Khách lẻ'}</p>
                <div class="divider"></div>
                <table>
                    ${itemsHtml}
                </table>
                <div class="divider"></div>
                <table>
                    <tr><td>Tổng tiền hàng:</td><td class="text-right">${totalAmount.toLocaleString()}</td></tr>
                    <tr><td>Giảm giá:</td><td class="text-right">-${discountValue.toLocaleString()}${discountType}</td></tr>
                    <tr class="bold"><td>KHÁCH CẦN TRẢ:</td><td class="text-right">${finalAmount.toLocaleString()}</td></tr>
                    <tr><td>Khách đưa:</td><td class="text-right">${customerPay.toLocaleString()}</td></tr>
                    <tr><td>Tiền thừa:</td><td class="text-right">${(customerPay - finalAmount).toLocaleString()}</td></tr>
                </table>
                <p class="text-center" style="margin-top: 20px;">Cảm ơn quý khách!<br>Hẹn gặp lại!</p>
                <script>window.print(); window.close();</script>
            </body>
        </html>
    `);
        printWindow.document.close();
    };
    // --- LOGIC TÍNH TOÁN ---
    const calculateLineTotal = (quantity, price, lineDiscValue, lineDiscType) => {
        const q = Number(quantity) || 0;
        const p = Number(price) || 0;
        const v = Number(lineDiscValue) || 0;

        const subTotal = q * p;
        let total = 0;

        if (lineDiscType === '%') {
            // Chiết khấu theo % (Ví dụ: giảm 5%)
            const discountAmount = (p * (v / 100)) * q;
            total = subTotal - discountAmount;
        } else {
            // Chiết khấu theo số tiền (đ)
            // Lưu ý: Thường là giảm v tiền trên MỖI sản phẩm, 
            // hoặc giảm v tiền trên TỔNG dòng. Ở đây tôi để giảm trên TỔNG dòng.
            total = subTotal - (v * q);
        }

        return Math.round(total); // Làm tròn để không bị số lẻ như .995
    };

    const totalAmount = useMemo(() => {
        return selectedItems.reduce((sum, item) => sum + Number(item.total || 0), 0);
    }, [selectedItems]);

    const finalAmount = useMemo(() => {
        const disc = Number(discountValue || 0);
        const result = discountType === '%' ? totalAmount - (totalAmount * disc / 100) : totalAmount - disc;
        return Math.round(result);
    }, [totalAmount, discountValue, discountType]);
    useEffect(() => {
        setCustomerPay(finalAmount);
    }, [finalAmount]);
    // --- XỬ LÝ CHỌN SẢN PHẨM ---
    const removeAccents = (str) => {
        if (!str) return "";
        return str
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/đ/g, 'd')
            .replace(/Đ/g, 'D')
            .toLowerCase();
    };
    // --- XỬ LÝ CHỌN SẢN PHẨM VỚI FUZZY SEARCH ---
    const searchOptions = useMemo(() => {
        if (!searchText) return [];

        // Tách từ khóa thành mảng: ["u", "xi"]
        // Chúng ta KHÔNG dùng removeAccents ở đây để giữ lại dấu
        const searchWords = searchText
            .toLowerCase()
            .trim()
            .split(/\s+/)
            .filter(word => word.length > 0);

        return allProducts
            .filter(p => {
                // 1. Lấy tên sản phẩm/SKU và tách thành mảng các từ đơn lẻ
                const productName = (p.master_name || p.name || "").toLowerCase();
                const productSku = (p.sku || "").toLowerCase();

                // Tách tên thành mảng các từ, ví dụ: ["xiết", "cánh", "quạt"]
                const nameWords = productName.split(/\s+/);
                const skuWords = productSku.split(/\s+/);
                const allProductWords = [...nameWords, ...skuWords];

                // 2. Kiểm tra: TẤT CẢ từ khóa người dùng gõ 
                // PHẢI có ít nhất một từ trong tên sản phẩm trùng khớp hoàn toàn (không chứa)
                return searchWords.every(searchWord =>
                    allProductWords.some(productWord => productWord === searchWord)
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

                                <Text type="secondary">Tồn: <b style={{ color: p.total_stock > 0 ? '#52c41a' : '#ff4d4f' }}>{Number(p.total_stock)}</b></Text>

                            </div>

                        </div>

                    </div>
                ),
                productData: p
            }));
    }, [searchText, allProducts]);

    const onSelectProduct = (value, option) => {
        const p = option.productData;
        const existing = selectedItems.find(item => item.sku === p.sku);
        if (existing) {
            setSelectedItems(selectedItems.map(i => i.sku === p.sku
                ? { ...i, quantity: i.quantity + 1, total: calculateLineTotal(i.quantity + 1, i.sale_price, i.lineDiscountValue, i.lineDiscountType) }
                : i
            ));
        } else {
            setSelectedItems([{
                ...p,
                quantity: 1,
                lineDiscountValue: 0,
                lineDiscountType: 'VND',
                total: p.sale_price
            }, ...selectedItems]);
        }
        setSearchText('');
    };


    // 1. Logic lọc danh sách khách hàng
    const customerOptions = useMemo(() => {
        if (!searchCustomerText) return [];
        const cleanSearch = removeAccents(searchCustomerText);
        const searchWords = cleanSearch.split(/\s+/);

        return allCustomers
            .filter(c => {
                const customerName = removeAccents(c.name || "");
                const customerPhone = c.phone || "";
                const combineInfo = `${customerName} ${customerPhone}`;
                return searchWords.every(word => combineInfo.includes(word));
            })
            .map(c => ({
                value: c.phone,
                label: `${c.name} - ${c.phone}`,
                customerData: c
            }));
    }, [searchCustomerText, allCustomers]);

    // 2. Hàm xử lý khi chọn khách hàng
    const onSelectCustomer = (value, option) => {
        setSelectedCustomer(option.customerData);
        setSearchCustomerText(option.label); // Hiển thị tên + sđt lên ô input
    };

    // 3. Hàm mở modal thêm khách hàng (giả định bạn đã có modal này)
    const handleAddNewCustomer = () => {
        setIsCustomerModalOpen(true);
    };

    // Thêm hàm này vào trong POSPage component
    const handleSaveOrder = async (status = 'completed', shouldPrint = false) => {
        if (selectedItems.length === 0) return message.warning("Giỏ hàng trống!");

        try {
            const payload = {
                invoice_id: editingInvoiceId, // Gửi ID lên (null nếu là đơn mới, có giá trị nếu là sửa)
                customer_id: selectedCustomer?.id || null,
                current_customer_debt: selectedCustomer?.total_debt || 0,
                total_amount: totalAmount,
                discount_value: discountValue,
                discount_type: discountType,
                final_amount: finalAmount,
                created_at: invoiceDate.format('YYYY-MM-DD HH:mm:ss'),
                // Nếu là đặt hàng (draft), khách có thể chưa trả tiền, mặc định là 0 nếu không nhập
                customer_pay: status === 'draft' ? 0 : customerPay,
                note: note,
                status: status, // 'completed' hoặc 'draft'
                items: selectedItems
            };

            const res = await axiosClient.post('/api/sell-products', payload);

            if (res.data.success) {
                message.success(status === 'draft' ? "Đã lưu đơn đặt hàng!" : "Giao dịch hoàn tất!");
                setEditingInvoiceId(null);
                window.history.replaceState({}, document.title);

                if (shouldPrint) {
                    handlePrint({ invoice_code: res.data.invoice_code });
                }

                // Reset dữ liệu sau khi lưu thành công
                setSelectedItems([]);
                setSelectedCustomer(null);
                setSearchCustomerText('');
                setDiscountValue(0);
                setNote('');
                setIsConfirmModalOpen(false);
            }
        } catch (err) {
            message.error("Lỗi khi lưu đơn hàng");
        }
    };

    // Cập nhật lại hàm handlePayment cũ để gọi hàm chung này
    const handlePayment = (shouldPrint) => {
        handleSaveOrder('completed', shouldPrint);
    };

    const handleUpdateProductPrice = async (record) => {
        try {
            await axiosClient.put(`/api/products/update-price/${record.sku}`, {
                sale_price: record.sale_price
            });
            message.success(`Đã cập nhật giá bán cho ${record.master_name}`);
        } catch (err) {
            message.error("Lỗi khi cập nhật giá");
        }
    };
    const columns = [
        {
            title: 'Tên hàng',
            dataIndex: 'master_name',
            ellipsis: true,
            render: (text, record) => (
                <a onClick={() => {
                    setSelectedSkuForHistory(record.sku);
                    setIsHistoryModalOpen(true);
                }} style={{ fontWeight: 'bold' }}>
                    {text}
                </a>
            )
        },
        {
            title: 'Số lượng',
            dataIndex: 'quantity',
            width: 100,
            render: (val, record) => (
                <InputNumber
                    min={0}
                    value={val}
                    variant="borderless"
                    className="edit-cell-input"
                    onChange={(v) => {
                        setSelectedItems(selectedItems.map(i => i.sku === record.sku
                            ? { ...i, quantity: v, total: calculateLineTotal(v, i.sale_price, i.lineDiscountValue, i.lineDiscountType) }
                            : i
                        ));
                    }}
                />
            )
        },
        {
            title: 'Giá bán',
            dataIndex: 'sale_price',
            align: 'right',
            width: 150,
            render: (val, record) => (
                <Space.Compact>
                    <InputNumber
                        value={val}
                        variant="borderless"
                        formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                        parser={value => value.replace(/\$\s?|(,*)/g, '')}
                        onChange={(v) => {
                            setSelectedItems(selectedItems.map(i => i.sku === record.sku
                                ? { ...i, sale_price: v, total: calculateLineTotal(i.quantity, v, i.lineDiscountValue, i.lineDiscountType) }
                                : i
                            ));
                        }}
                    />
                    <Button
                        type="text"
                        icon={<EditOutlined style={{ color: '#1890ff' }} />}
                        size="small"
                        onClick={() => handleUpdateProductPrice(record)}
                    />
                </Space.Compact>
            )
        },
        {
            title: 'Chiết khấu',
            width: 160,
            render: (_, record) => (
                <InputNumber
                    value={record.lineDiscountValue}
                    className="edit-cell-input"
                    onChange={(v) => {
                        setSelectedItems(selectedItems.map(i => i.sku === record.sku
                            ? { ...i, lineDiscountValue: v, total: calculateLineTotal(i.quantity, i.sale_price, v, i.lineDiscountType) }
                            : i
                        ));
                    }}
                    addonAfter={
                        <Select value={record.lineDiscountType} variant="borderless" onChange={t => {
                            setSelectedItems(selectedItems.map(i => i.sku === record.sku ? { ...i, lineDiscountType: t, total: calculateLineTotal(i.quantity, i.sale_price, i.lineDiscountValue, t) } : i));
                        }}>
                            <Select.Option value="VND">đ</Select.Option>
                            <Select.Option value="%">%</Select.Option>
                        </Select>
                    }
                />
            )
        },
        {
            title: 'Thành tiền',
            dataIndex: 'total',
            align: 'right',
            width: 120,
            render: v => <Text strong>{v?.toLocaleString()}</Text>
        },
        {
            title: '',
            width: 50,
            render: (_, record) => (
                <Button type="text" danger icon={<DeleteOutlined />} onClick={() => setSelectedItems(selectedItems.filter(i => i.sku !== record.sku))} />
            )
        }
    ];

    return (
        <Layout className="pos-full-wrapper">
            {/* THANH SEARCH NẰM NGANG PHÍA TRÊN (GIỐNG IMPORTSTOCK) */}
            <Header className="pos-navbar">
                <Row align="middle" gutter={16} style={{ width: '100%' }}>
                    <Col flex="auto">
                        <AutoComplete
                            options={searchOptions}
                            onSelect={onSelectProduct}
                            onSearch={setSearchText}
                            value={searchText}
                            style={{ width: '100%' }}
                            dropdownMatchSelectWidth={500}
                        >
                            <Input
                                size="large"
                                placeholder="Tìm hàng hóa (F3)"
                                prefix={<SearchOutlined />}
                                allowClear
                            />
                        </AutoComplete>
                    </Col>
                    <Col>
                        <Space>
                            <Button icon={<PrinterOutlined />} size="large" />
                            <Button icon={<MoreOutlined />} size="large" />
                        </Space>
                    </Col>
                </Row>
            </Header>

            <Content className="pos-main-content">
                <Row gutter={12} style={{ height: '100%' }}>
                    {/* CỘT TRÁI: DANH SÁCH HÀNG HÓA TRONG ĐƠN */}
                    <Col span={18} className="pos-left-section">
                        <div className="table-container">
                            <Table
                                dataSource={selectedItems}
                                columns={columns}
                                pagination={false}
                                rowKey="sku"
                                scroll={{ y: 'calc(100vh - 260px)' }}
                            />
                        </div>
                        <div className="note-footer">
                            <Input
                                prefix={<EditOutlined />}
                                placeholder="Ghi chú đơn hàng"
                                variant="borderless"
                                value={note}
                                onChange={e => setNote(e.target.value)}
                            />
                        </div>
                    </Col>

                    {/* CỘT PHẢI: THÔNG TIN THANH TOÁN */}
                    <Col span={6} className="pos-right-section">
                        <div className="payment-sidebar">
                            <div className="customer-info-header">
                                <Text strong style={{ fontSize: '16px' }}>{selectedCustomer?.name || 'Vương Trọng Nghĩa'}</Text>
                                {/* Thay thế dòng ngày giờ tĩnh bằng DatePicker */}
                                <DatePicker
                                    value={invoiceDate}
                                    disabled
                                    variant="borderless" // Bỏ khung để nhìn giống text hiển thị hơn
                                    onChange={(date) => setInvoiceDate(date)}
                                    format="DD/MM/YYYY HH:mm"
                                    showTime
                                    style={{
                                        width: '100%',
                                        marginTop: 5,
                                        cursor: 'default',
                                        color: 'rgba(0, 0, 0, 0.85)' // Đảm bảo màu chữ rõ nét dù bị disabled
                                    }}
                                />
                            </div>

                            <AutoComplete
                                value={searchCustomerText}
                                options={customerOptions}
                                onSearch={(value) => setSearchCustomerText(value)}
                                onSelect={onSelectCustomer}
                                placeholder="Tìm khách hàng (F4)"
                                style={{ width: '100%', marginTop: 15 }}
                                // Hiển thị nút "Thêm mới" khi không tìm thấy dữ liệu
                                notFoundContent={
                                    searchCustomerText?.length > 0 ? (
                                        <Button
                                            type="text"
                                            block
                                            icon={<PlusOutlined />}
                                            onClick={handleAddNewCustomer}
                                            style={{ textAlign: 'left', color: '#1890ff', height: '40px' }}
                                        >
                                            Thêm mới khách hàng "{searchCustomerText}"
                                        </Button>
                                    ) : null
                                }
                                allowClear
                            />

                            <div className="billing-details">
                                <div className="bill-row">
                                    <span>Tổng tiền hàng</span>
                                    <span className="val">{totalAmount.toLocaleString()}</span>
                                </div>
                                <div className="bill-row">
                                    <span>Giảm giá</span>
                                    <InputNumber
                                        value={discountValue}
                                        onChange={setDiscountValue}
                                        className="discount-input"
                                        addonAfter={
                                            <Select value={discountType} onChange={setDiscountType} variant="borderless">
                                                <Select.Option value="VND">đ</Select.Option>
                                                <Select.Option value="%">%</Select.Option>
                                            </Select>
                                        }
                                    />
                                </div>
                                <Divider style={{ margin: '12px 0' }} />
                                <div className="bill-row total">
                                    <Text strong>KHÁCH CẦN TRẢ</Text>
                                    <Title level={3} style={{ margin: 0, color: '#133470' }}>
                                        {finalAmount.toLocaleString()}
                                    </Title>
                                </div>

                                <div className="bill-row" style={{ marginTop: '10px' }}>
                                    <span>Tiền khách đưa (F8)</span>
                                    <InputNumber
                                        className="discount-input"
                                        value={customerPay}
                                        onChange={setCustomerPay}
                                        formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                                        parser={value => value.replace(/\$\s?|(,*)/g, '')}
                                        style={{ width: '120px' }}
                                    />
                                </div>

                                <div className="bill-row">
                                    <span>Tiền thừa trả khách</span>
                                    <Text strong style={{ color: customerPay - finalAmount >= 0 ? '#52c41a' : '#ff4d4f' }}>
                                        {Math.max(0, customerPay - finalAmount).toLocaleString()}
                                    </Text>
                                </div>

                                {customerPay < finalAmount && (
                                    <div className="bill-row">
                                        <Text type="danger" italic>Tính vào công nợ:</Text>
                                        <Text type="danger">{(finalAmount - customerPay).toLocaleString()}</Text>
                                    </div>
                                )}
                            </div>

                            <div className="payment-footer">
                                {/* <Checkbox defaultChecked style={{ marginBottom: '15px' }}>
                                    Áp dụng giảm thuế theo Nghị quyết 204/2025/QH15
                                </Checkbox> */}
                                <Button
                                    type="default"
                                    block
                                    size="large"
                                    style={{
                                        height: '50px',
                                        background: '#ff9c6e',
                                        color: '#fff',
                                        borderColor: '#ff9c6e',
                                        fontWeight: 'bold',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '10px'
                                    }}
                                    onClick={() => handleSaveOrder('draft')} // Gọi hàm lưu với status draft
                                >
                                    <EditOutlined style={{ fontSize: '20px' }} />
                                    <span>ĐẶT HÀNG (F9)</span>
                                </Button>
                                <Button type="primary" block className="btn-pay-giant" onClick={showConfirmPayment}>
                                    <ShoppingCartOutlined style={{ fontSize: '24px' }} />
                                    <span>THANH TOÁN</span>
                                </Button>
                            </div>
                        </div>
                    </Col>
                </Row>
            </Content>
            <CustomerModal
                open={isCustomerModalOpen}
                initialName={searchCustomerText} // Truyền tên đang gõ vào Modal
                onCancel={() => setIsCustomerModalOpen(false)}
                onSuccess={(newCustomer) => {
                    setAllCustomers([...allCustomers, newCustomer]);
                    setSelectedCustomer(newCustomer);
                    setSearchCustomerText(newCustomer.name);
                    setIsCustomerModalOpen(false);
                }}
            />
            <Modal
                title="Xác nhận thanh toán"
                open={isConfirmModalOpen}
                onCancel={() => setIsConfirmModalOpen(false)}
                footer={[
                    <Button key="cancel" onClick={() => setIsConfirmModalOpen(false)}>Quay lại</Button>,
                    <Button key="pay" type="default" onClick={() => handlePayment(false)}>Thanh toán (Không in)</Button>,
                    <Button key="print" type="primary" icon={<PrinterOutlined />} onClick={() => handlePayment(true)}>Thanh toán & In (F10)</Button>
                ]}
            >
                <div style={{ fontSize: '16px' }}>
                    <Row style={{ marginBottom: 10 }}>
                        <Col span={12}>Tổng tiền hàng:</Col>
                        <Col span={12} align="right"><Text strong>{totalAmount.toLocaleString()}đ</Text></Col>
                    </Row>
                    <Row style={{ marginBottom: 10 }}>
                        <Col span={12}>Giảm giá hóa đơn:</Col>
                        <Col span={12} align="right"><Text type="danger">-{discountValue.toLocaleString()} {discountType}</Text></Col>
                    </Row>
                    <Divider style={{ margin: '10px 0' }} />
                    <Row style={{ marginBottom: 10 }}>
                        <Col span={12}><Title level={4}>KHÁCH CẦN TRẢ:</Title></Col>
                        <Col span={12} align="right"><Title level={4} style={{ color: '#133470' }}>{finalAmount.toLocaleString()}đ</Title></Col>
                    </Row>
                    <div style={{ padding: '15px', background: '#f5f5f5', borderRadius: '8px' }}>
                        <Row>
                            <Col span={12}>Tiền khách đưa:</Col>
                            <Col span={12} align="right"><Text strong>{customerPay.toLocaleString()}đ</Text></Col>
                        </Row>
                        <Row style={{ marginTop: 10 }}>
                            <Col span={12}>Tiền thừa trả khách:</Col>
                            <Col span={12} align="right">
                                <Text strong style={{ fontSize: '18px', color: '#52c41a' }}>
                                    {(customerPay - finalAmount).toLocaleString()}đ
                                </Text>
                            </Col>
                        </Row>
                    </div>
                </div>
            </Modal>

            <Modal
                title={`Lịch sử giao dịch hàng hóa: ${selectedSkuForHistory || ''}`}
                open={isHistoryModalOpen}
                onCancel={() => setIsHistoryModalOpen(false)}
                footer={null}
                width={900}
            >
                {isHistoryModalOpen && (
                    <StockHistoryTable sku={selectedSkuForHistory} />
                )}
            </Modal>
        </Layout>
    );
};

export default POSPage;