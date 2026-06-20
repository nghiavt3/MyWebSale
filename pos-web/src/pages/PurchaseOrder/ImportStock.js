import React, { useState, useEffect, useMemo } from 'react';
import debounce from 'lodash/debounce';
import {
    Row, Col, Table, Input, Button, InputNumber, Typography,
    Space, AutoComplete, Divider, Select, message, DatePicker, Upload
} from 'antd';
import dayjs from 'dayjs';
import {
    ArrowLeftOutlined, SearchOutlined, DeleteOutlined,
    SaveOutlined, CheckCircleFilled, PrinterOutlined,
    EyeOutlined, MoreOutlined, PhoneOutlined, EnvironmentOutlined, PlusOutlined, UploadOutlined
} from '@ant-design/icons';
import axiosClient from '../../api/axiosClient';
import axiosUpload from '../../api/axiosUpload';
import './ImportStock.css';
import SupplierModal from '../../components/SupplierModal/SupplierModal';
import ProductModal from '../../components/ProductModal/ProductModal';

const { Text, Title } = Typography;

const ImportStock = ({ initialData, onBack }) => {
    // Thêm vào cùng các State khác
    const [editingId, setEditingId] = useState(null); // Lưu ID của phiếu nháp
    const [editingCode, setEditingCode] = useState(null); // Lưu mã PN của phiếu nháp
    const [allProducts, setAllProducts] = useState([]);
    const [selectedItems, setSelectedItems] = useState([]);
    const [searchText, setSearchText] = useState('');
    const [discountType, setDiscountType] = useState('VND');
    const [discountValue, setDiscountValue] = useState(0);
    const [note, setNote] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
    const [isProductModalOpen, setIsProductModalOpen] = useState(false); // <-- STATE MỚI
    // Bên trong component ImportStock:
    const [inputSearch, setInputSearch] = useState(''); // Giá trị hiển thị ô SP
    const [inputSupplier, setInputSupplier] = useState(''); // Giá trị hiển thị ô NCC
    const [importDate, setImportDate] = useState(dayjs()); // Mặc định là hôm nay
    const [fileList, setFileList] = useState([]); // Lưu danh sách các file đã chọn
    // --- FETCH DATA ---
    const fetchProducts = async () => {
        try {
            const res = await axiosClient.get('/api/products');
            setAllProducts(res.data);
        } catch (err) {
            message.error("Lỗi tải dữ liệu sản phẩm");
        }
    };
    useEffect(() => {
        fetchProducts();
    }, []);

    const [allSuppliers, setAllSuppliers] = useState([]);
    const [selectedSupplier, setSelectedSupplier] = useState(null);
    const [searchSupplierText, setSearchSupplierText] = useState('');

    useEffect(() => {
        axiosClient.get('/api/suppliers')
            .then(res => setAllSuppliers(res.data))
            .catch(() => message.error("Lỗi tải danh sách nhà cung cấp"));
    }, []);
    const fetchSuppliers = async () => {
        try {
            const res = await axiosClient.get('/api/suppliers');
            setAllSuppliers(res.data);
            return res.data;
        } catch (err) {
            message.error("Lỗi tải danh sách nhà cung cấp");
        }
    };
    // 1. Debounce cho tìm sản phẩm (300ms)
    const debouncedSearchProduct = useMemo(
        () => debounce((val) => setSearchText(val), 300),
        []
    );

    // 2. Debounce cho tìm nhà cung cấp (300ms)
    const debouncedSearchSupplier = useMemo(
        () => debounce((val) => setSearchSupplierText(val), 300),
        []
    );

    // Cleanup khi unmount
    useEffect(() => {
        return () => {
            debouncedSearchProduct.cancel();
            debouncedSearchSupplier.cancel();
        };
    }, [debouncedSearchProduct, debouncedSearchSupplier]);
    useEffect(() => {
        //console.log("initial nhận được:",initialData)
        if (initialData) {
            // 1. Nếu có initialData, load thông tin Header
            setImportDate(initialData.created_at ? dayjs(initialData.created_at) : dayjs());
            setEditingId(initialData.id);
            setEditingCode(initialData.po_code);
            setDiscountValue(initialData.discount_value);
            setDiscountType(initialData.discount_type);
            setNote(initialData.note);
            setSelectedSupplier({
                id: initialData.supplier_id,
                supplier_name: initialData.supplier_name
            });
            setSearchSupplierText(initialData.supplier_name);

            // 2. Gọi API để lấy danh sách sản phẩm chi tiết của phiếu này
            axiosClient.get(`/api/purchase-orders/${initialData.id}/details`)
                .then(res => {
                    const items = res.data.map(item => ({
                        ...item,
                        // SỬA TẠI ĐÂY: Map đúng tên trường để hiển thị
                        sku: item.sku,               // Mã hàng
                        master_name: item.name,      // Tên hàng (API trả về là 'name')
                        unit_name: item.unit_name,   // Đơn vị tính

                        // ÉP KIỂU SỐ: Để tính toán không bị ra 0 hoặc NaN
                        quantity: Number(item.quantity) || 0,
                        cost_price: Number(item.cost_price) || 0,
                        lineDiscountValue: Number(item.lineDiscountValue) || 0,
                        lineDiscountType: item.lineDiscountType || 'VND',
                        total: Number(item.total) || 0
                    }));
                    setSelectedItems(items);
                })
                .catch(err => message.error("Không thể tải chi tiết hàng hóa"));
        }
    }, [initialData]);

    // --- XỬ LÝ SAU KHI THÊM MỚI SẢN PHẨM ---
    const handleAddProductSuccess = async () => {
        await fetchProducts(); // Tải lại danh sách sản phẩm
        setIsProductModalOpen(false);
        message.success("Đã cập nhật danh sách hàng hóa");
        // Gợi ý: Bạn có thể tự động chọn sản phẩm vừa tạo ở đây nếu API trả về chi tiết sp mới
    };
    // Hàm xử lý sau khi lưu NCC thành công
    const handleAddSupplierSuccess = async (newSupplier) => {
        // Tải lại danh sách NCC để đảm bảo state allSuppliers đồng bộ
        await fetchSuppliers();

        // Tự động chọn NCC vừa tạo
        setSelectedSupplier(newSupplier);
        setSearchSupplierText(newSupplier.supplier_name);
        setIsSupplierModalOpen(false);
    };
    const handleSave = async (status) => {
        // Kiểm tra điều kiện tối thiểu
        if (!selectedSupplier) {
            return message.warning("Vui lòng chọn nhà cung cấp");
        }
        if (selectedItems.length === 0) {
            return message.warning("Chưa có hàng hóa nào trong danh sách");
        }

        const formData = new FormData();

        formData.append('data', JSON.stringify({
            po_id: editingId,      // Gửi ID nếu đang sửa bản nháp (null nếu tạo mới)
            po_code: editingCode,  // Gửi mã cũ để giữ nguyên mã phiếu
            created_at: importDate.format('YYYY-MM-DD HH:mm:ss'),
            supplier_id: selectedSupplier.id,
            current_debt: selectedSupplier.current_debt,
            total_amount: totalAmount,
            discount_value: discountValue,
            discount_type: discountType,
            final_amount: finalAmount,
            note: note,
            status: status, // 'draft' hoặc 'completed'
            items: selectedItems.map(item => ({
                sku: item.sku,
                quantity: item.quantity,
                cost_price: item.cost_price,
                lineDiscountValue: item.lineDiscountValue,
                lineDiscountType: item.lineDiscountType,
                total: item.total
            }))
        }));
        // Append các file ảnh vào FormData
        fileList.forEach((file) => {
            // Kiểm tra xem file có thực sự chứa dữ liệu không
            if (file.originFileObj) {
                // Phải append originFileObj, không phải append đối tượng 'file' của Ant Design
                formData.append('images', file.originFileObj);
            }
        });
        //console.log("Payload gửi đi:", payload);
        try {
            const response = await axiosUpload.post('/api/import-stock', formData);
            if (response.status === 200 || response.status === 201) {
                message.success(status === 'completed' ? "Nhập hàng thành công!" : "Đã lưu bản nháp");
                // Reset form sau khi hoàn thành
                if (status === 'completed') {
                    setSelectedItems([]);
                    setSelectedSupplier(null);
                    setSearchSupplierText('');
                    setDiscountValue(0);
                    setNote('');
                }
                onBack()
            }
        } catch (error) {
            console.error(error.message);
            message.error("Lỗi khi lưu phiếu nhập");
        }
    };
    // Hàm tính toán thành tiền cho từng dòng
    const calculateLineTotal = (quantity, price, lineDiscValue, lineDiscType) => {
        const qty = Number(quantity || 0);
        const prc = Number(price || 0);
        const dVal = Number(lineDiscValue || 0);

        const subTotal = qty * prc;
        const discount = lineDiscType === '%'
            ? (subTotal * dVal / 100)
            : dVal;

        // Sử dụng Math.round để triệt tiêu số thập phân
        return Math.round(subTotal - discount);
    };
    const removeAccents = (str) => {
        if (!str) return "";
        return str
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/đ/g, 'd')
            .replace(/Đ/g, 'D')
            .toLowerCase();
    };
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
            .slice(0, 15) // Tăng lên 15 kết quả để dễ chọn
            .map(p => {
                // --- Giữ nguyên phần logic tính toán stockDisplay của bạn ---
                const totalBaseStock = Number(p.total_stock) || 0;
                let stockDisplay = "";
                if (p.exchange_value > 1) {
                    const bigUnitQty = Math.floor(totalBaseStock / p.exchange_value);
                    const remainder = totalBaseStock % p.exchange_value;
                    stockDisplay = (
                        <span>
                            <b className="stock-value">{bigUnitQty.toLocaleString()}</b> {p.unit_name}
                            {remainder > 0 && <span className="stock-remainder"> (lẻ {remainder})</span>}
                        </span>
                    );
                } else {
                    stockDisplay = <span><b className="stock-value">{totalBaseStock.toLocaleString()}</b> {p.unit_name}</span>;
                }

                return {
                    value: p.sku,
                    label: (
                        <div className="search-item-container">
                            <div className="search-item-image">
                                {p.image_url ? <img src={p.image_url} alt={p.master_name} /> :
                                    <div className="no-image-placeholder"><PrinterOutlined style={{ fontSize: 20, color: '#bfbfbf' }} /></div>}
                            </div>
                            <div className="search-item-info">
                                <div className="item-name-row">
                                    <Text strong className="text-blue">{p.master_name}</Text>
                                    <span className={`unit-badge ${p.exchange_value > 1 ? 'large-unit' : 'base-unit'}`}>{p.unit_name}</span>
                                </div>
                                <div className="item-details-row">
                                    <Text type="secondary">{p.sku}</Text>
                                    <Text className="item-price">Giá nhập: <b>{Number(p.cost_price)?.toLocaleString()}đ</b></Text>
                                </div>
                                <div className="item-stock-row">
                                    <div className="stock-main">Tồn kho: {stockDisplay}</div>
                                    <div className="stock-sub">{p.exchange_value > 1 && `(1 ${p.unit_name} = ${Number(p.exchange_value)})`}</div>
                                </div>
                            </div>
                        </div>
                    ),
                    productData: p
                };
            });
    }, [searchText, allProducts]);

    const onSelectProduct = (value, option) => {
        const p = option.productData;
        const isExisted = selectedItems.find(item => item.sku === p.sku);
        if (isExisted) {
            setSelectedItems(selectedItems.map(i =>
                i.sku === p.sku
                    ? {
                        ...i,
                        quantity: i.quantity + 1,
                        total: calculateLineTotal(i.quantity + 1, i.cost_price, i.lineDiscountValue || 0, i.lineDiscountType || 'VND')
                    }
                    : i
            ));
        } else {
            // Khởi tạo dòng mới với lineDiscount mặc định là 0 VND
            setSelectedItems([{
                ...p,
                quantity: 1,
                lineDiscountValue: 0,
                lineDiscountType: 'VND',
                total: p.cost_price
            }, ...selectedItems]);
        }
        setInputSearch('');
        setSearchText('');
    };

    // Tương tự cho Supplier:
    const onSelectSupplier = (val, option) => {
        setSelectedSupplier(option.supplierData);
        setInputSupplier(option.supplierData.supplier_name); // Hiển thị tên NCC đã chọn
        setSearchSupplierText(''); // Xóa text filter
    };
    const supplierOptions = useMemo(() => {
        if (!searchSupplierText) return [];

        const cleanSearch = removeAccents(searchSupplierText);
        const searchWords = cleanSearch.split(/\s+/).filter(word => word.length > 0);

        return allSuppliers
            .filter(s => {
                const sName = removeAccents(s.supplier_name || '');
                const sCode = removeAccents(s.supplier_code || '');
                const sPhone = s.phone || '';
                const combinedInfo = `${sName} ${sCode} ${sPhone}`;

                return searchWords.every(word => combinedInfo.includes(word));
            })
            .map(s => ({
                value: s.supplier_code,
                label: (
                    <div className="search-item-container">
                        <div className="search-item-info">
                            <div className="item-name-row">
                                <Text strong className="text-blue">{s.supplier_name}</Text>
                                <span className="unit-badge base-unit">{s.supplier_code}</span>
                            </div>
                            <div className="item-details-row">
                                <Text type="secondary"><PhoneOutlined /> {s.phone || 'N/A'}</Text>
                                <Text>Nợ: <b style={{ color: '#ff4d4f' }}>{s.current_debt?.toLocaleString()}đ</b></Text>
                            </div>
                        </div>
                    </div>
                ),
                supplierData: s
            }));
    }, [searchSupplierText, allSuppliers]);

    const columns = [
        { title: 'STT', render: (t, r, i) => i + 1, width: 50, align: 'center' },
        { title: 'Mã hàng', dataIndex: 'sku', width: 120, className: 'text-blue' },
        { title: 'Tên hàng', dataIndex: 'master_name' },
        { title: 'ĐVT', dataIndex: 'unit_name', width: 80 },
        {
            title: 'Số lượng',
            dataIndex: 'quantity',
            width: 100,
            render: (val, record) => (
                <InputNumber min={1} value={val} style={{ width: '100%' }} onChange={(v) => {
                    const qty = v || 1;
                    setSelectedItems(selectedItems.map(i =>
                        i.sku === record.sku
                            ? { ...i, quantity: qty, total: calculateLineTotal(qty, i.cost_price, i.lineDiscountValue, i.lineDiscountType) }
                            : i
                    ));
                }} />
            )
        },
        {
            title: 'Giá nhập',
            dataIndex: 'cost_price',
            width: 130,
            render: (val, record) => (
                <InputNumber
                    value={val}
                    min={0}
                    formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    parser={value => value.replace(/\$\s?|(,*)/g, '')}
                    style={{ width: '100%', color: '#f5222d', fontWeight: 'bold' }}
                    onChange={(newPrice) => {
                        const prc = newPrice || 0;
                        setSelectedItems(selectedItems.map(i =>
                            i.sku === record.sku
                                ? {
                                    ...i,
                                    cost_price: prc,
                                    total: calculateLineTotal(i.quantity, prc, i.lineDiscountValue, i.lineDiscountType)
                                }
                                : i
                        ));
                    }}
                />
            )
        },
        {
            title: 'Chiết khấu',
            width: 150,
            render: (_, record) => (
                <InputNumber
                    style={{ width: '100%' }}
                    value={record.lineDiscountValue}
                    min={0}
                    onChange={(v) => {
                        const discVal = v || 0;
                        setSelectedItems(selectedItems.map(i =>
                            i.sku === record.sku
                                ? { ...i, lineDiscountValue: discVal, total: calculateLineTotal(i.quantity, i.cost_price, discVal, i.lineDiscountType) }
                                : i
                        ));
                    }}
                    addonAfter={
                        <Select
                            value={record.lineDiscountType}
                            style={{ width: 60 }}
                            onChange={(type) => {
                                setSelectedItems(selectedItems.map(i =>
                                    i.sku === record.sku
                                        ? { ...i, lineDiscountType: type, total: calculateLineTotal(i.quantity, i.cost_price, i.lineDiscountValue, type) }
                                        : i
                                ));
                            }}
                        >
                            <Select.Option value="VND">đ</Select.Option>
                            <Select.Option value="%">%</Select.Option>
                        </Select>
                    }
                />
            )
        },
        { title: 'Thành tiền', dataIndex: 'total', width: 130, align: 'right', render: (v) => <b>{Math.round(v || 0).toLocaleString('vi-VN')}</b> },
        {
            title: '', width: 50, render: (_, record) => (
                <Button type="text" danger icon={<DeleteOutlined />} onClick={() => setSelectedItems(selectedItems.filter(i => i.sku !== record.sku))} />
            )
        }
    ];

    // Tính tổng tiền hàng (đã ép kiểu Number để tránh lỗi nối chuỗi)
    const totalAmount = useMemo(() => {
        return selectedItems.reduce((sum, item) => sum + Number(item.total || 0), 0);
    }, [selectedItems]);

    // Tính số tiền cuối cùng sau khi giảm giá tổng hóa đơn
    const finalAmount = useMemo(() => {
        const disc = Number(discountValue || 0);
        let result = 0;
        if (discountType === '%') {
            result = totalAmount - (totalAmount * disc / 100);
        } else {
            result = totalAmount - disc;
        }
        return Math.round(result); // Làm tròn số cuối cùng
    }, [totalAmount, discountValue, discountType]);

    return (
        <div className="import-wrapper">
            <div className="import-header-sticky">
                <Row align="middle" justify="space-between" style={{ height: '100%' }}>
                    <Col>
                        <Space size={15}>
                            <ArrowLeftOutlined className="back-icon" onClick={onBack} />
                            <Title level={4} style={{ margin: 0 }}>
                                {editingCode ? `Chỉnh sửa phiếu: ${editingCode}` : "Nhập hàng mới"}
                            </Title>
                            <AutoComplete
                                style={{ width: 400 }}
                                options={searchOptions}
                                onSelect={onSelectProduct}
                                value={inputSearch}
                                onSearch={(val) => {
                                    setInputSearch(val);           // Update UI ngay lập tức
                                    debouncedSearchProduct(val);   // Chờ 300ms mới update filter logic
                                }}
                                dropdownMatchSelectWidth={false}
                                notFoundContent={
                                    searchText.length > 0 && (
                                        <Button
                                            type="text"
                                            block
                                            icon={<PlusOutlined />}
                                            onClick={() => setIsProductModalOpen(true)}
                                            style={{ textAlign: 'left', color: '#1890ff' }}
                                        >
                                            Thêm mới sản phẩm "{searchText}"
                                        </Button>
                                    )
                                }
                            >
                                <Input placeholder="Tìm mã hoặc tên hàng (+)" prefix={<SearchOutlined />} allowClear />
                            </AutoComplete>
                        </Space>
                    </Col>
                    <Col>
                        <Space>
                            <Button icon={<PrinterOutlined />} />
                            <Button icon={<EyeOutlined />} />
                            <Button icon={<MoreOutlined />} />
                        </Space>
                    </Col>
                </Row>
            </div>

            <Row className="import-body">
                <Col span={18} className="table-col">
                    <Table
                        dataSource={selectedItems}
                        columns={columns}
                        pagination={false}
                        rowKey={(record) => record.id || record.sku}
                        scroll={{ y: 'calc(100vh - 180px)' }}
                    />
                </Col>
                <Col span={6} className="sidebar-col">
                    <div className="sidebar-content">
                        <div className="sidebar-header">
                            <Select defaultValue="admin" style={{ width: '100%', marginBottom: 10 }}>
                                <Select.Option value="admin">Quản trị viên</Select.Option>
                            </Select>
                            <DatePicker
                                format="DD/MM/YYYY HH:mm"
                                showTime={{ format: 'HH:mm' }} // Nếu bạn muốn chọn cả giờ
                                value={importDate}
                                onChange={(date) => setImportDate(date)}
                                style={{ width: '100%', marginBottom: 10 }}
                                placeholder="Chọn ngày nhập hàng"
                                allowClear={false}
                            />
                        </div>

                        <AutoComplete
                            style={{ width: '100%' }}
                            options={supplierOptions}
                            onSelect={onSelectSupplier}
                            value={inputSupplier}
                            onSearch={(val) => {
                                setInputSupplier(val);           // Update UI ngay lập tức
                                debouncedSearchSupplier(val);    // Chờ 300ms mới update filter logic
                            }}
                            dropdownMatchSelectWidth={false}
                            // Hiển thị nút thêm mới nếu không tìm thấy kết quả
                            notFoundContent={
                                <Button
                                    type="text"
                                    block
                                    icon={<PlusOutlined />}
                                    onClick={() => setIsSupplierModalOpen(true)}
                                    style={{ textAlign: 'left', color: '#1890ff' }}
                                >
                                    Thêm mới nhà cung cấp "{searchSupplierText}"
                                </Button>
                            }
                        >
                            <Input
                                placeholder="Tìm nhà cung cấp (Mã, Tên, SĐT) (+)"
                                prefix={<SearchOutlined />}
                                allowClear
                            />
                        </AutoComplete>

                        {selectedSupplier && (
                            <div style={{ marginTop: 5, fontSize: '12px', color: '#8c8c8c' }}>
                                <EnvironmentOutlined /> {selectedSupplier.address || 'Chưa có địa chỉ'}
                            </div>
                        )}

                        <div className="price-summary m-t-20">
                            <div className="price-row"><span>Tổng tiền hàng</span> <b>{totalAmount.toLocaleString('vi-VN')}</b></div>

                            <div className="price-row m-t-10">
                                <span>Giảm giá</span>
                                <InputNumber
                                    style={{ width: 150 }}
                                    value={discountValue}
                                    onChange={setDiscountValue}
                                    addonAfter={
                                        <Select value={discountType} onChange={setDiscountType} style={{ width: 60 }}>
                                            <Select.Option value="VND">đ</Select.Option>
                                            <Select.Option value="%">%</Select.Option>
                                        </Select>
                                    }
                                />
                            </div>

                            <Divider />

                            <div className="price-row">
                                <Text strong>CẦN TRẢ NCC</Text>
                                <Title level={4} style={{ margin: 0, color: '#1890ff' }}>{finalAmount.toLocaleString('vi-VN')}</Title>
                            </div>
                        </div>

                        <Input.TextArea
                            placeholder="Ghi chú"
                            rows={3}
                            className="m-t-20"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                        />
                        {/* CHÈN PHẦN UPLOAD VÀO ĐÂY */}
                        <div style={{ marginTop: 20 }}>
                            <Text strong>Hình ảnh chứng từ:</Text>
                            <Upload
                                listType="picture-card"
                                fileList={fileList}
                                // onPreview={handlePreview} // Bạn có thể viết thêm hàm này để xem ảnh phóng to
                                onChange={({ fileList: newFileList }) => setFileList(newFileList)}
                                beforeUpload={() => false}
                                multiple={true}
                            >
                                {fileList.length < 5 && <div><PlusOutlined /><div style={{ marginTop: 8 }}>Tải ảnh</div></div>}
                            </Upload>
                        </div>
                        <div className="action-footer">
                            <Button
                                size="large"
                                className="btn-draft"
                                onClick={() => handleSave('draft')}
                            >
                                LƯU TẠM
                            </Button>
                            <Button
                                size="large"
                                type="primary"
                                icon={<CheckCircleFilled />}
                                className="btn-complete"
                                onClick={() => handleSave('completed')}
                            >
                                HOÀN THÀNH
                            </Button>
                        </div>
                    </div>
                </Col>
            </Row>
            <SupplierModal
                visible={isSupplierModalOpen}
                onCancel={() => setIsSupplierModalOpen(false)}
                onSuccess={handleAddSupplierSuccess}
            />
            {/* MODAL SẢN PHẨM (MỚI THÊM) */}
            <ProductModal
                open={isProductModalOpen}
                isEditMode={false}
                editingProduct={null}
                products={allProducts}
                onCancel={() => setIsProductModalOpen(false)}
                onSuccess={handleAddProductSuccess}
            />
        </div>

    );
};

export default ImportStock;