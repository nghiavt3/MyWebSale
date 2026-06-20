import React, { useEffect, useState, useMemo } from 'react';
import debounce from 'lodash/debounce'; // Chỉ import debounce để tối ưu dung lượng
import {
  Layout, Table, Input, Tag, Button, Popover, Checkbox, Space, Typography,
  Divider, Row, Col, Tabs, Select, message, Popconfirm
} from 'antd';
import {
  SearchOutlined, PlusOutlined, FileExcelOutlined, DownOutlined,
  TagsOutlined, EditOutlined, DeleteOutlined
} from '@ant-design/icons';
import axiosClient from '../../api/axiosClient';
import ProductModal from '../../components/ProductModal/ProductModal'; // Đảm bảo file này nằm cùng thư mục
import StockHistoryTable from './StockHistoryTable';

const { Header, Sider, Content } = Layout;
const { Text, Title } = Typography;

const ProductManager = () => {
  // --- STATES QUẢN LÝ DỮ LIỆU ---
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inputValue, setInputValue] = useState('');
  const [searchText, setSearchText] = useState('');
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [catSearch, setCatSearch] = useState('');
  const [visible, setVisible] = useState(false);
  const [displayUnits, setDisplayUnits] = useState({});
  const [pagination, setPagination] = useState({ current: 1, pageSize: 15 });

  // --- STATES QUẢN LÝ MODAL ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await axiosClient.get('/api/products');
      setProducts(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Lỗi tải dữ liệu:", err);
      message.error("Không thể kết nối đến máy chủ");
    } finally {
      setLoading(false);
    }
  };

  const parseVnNumber = (val) => {
    if (val === null || val === undefined || val === '') return 0;
    if (typeof val === 'number') return val;
    return parseFloat(val.toString().replace(/\./g, '')) || 0;
  };

  // --- HANDLERS ---
  const handleDelete = async (id) => {
    try {
      await axiosClient.delete(`/api/products/${id}`);
      message.success("Đã xóa hàng hóa thành công");
      fetchProducts();
    } catch (err) {
      message.error("Lỗi khi xóa: " + (err.response?.data?.error || "Lỗi server"));
    }
  };

  const showAddModal = () => {
    setIsEditMode(false);
    setEditingProduct(null);
    setIsModalOpen(true);
  };

  const showEditModal = (record) => {
    setIsEditMode(true);
    setEditingProduct(record);
    setIsModalOpen(true);
  };

  const handleUnitChange = (productId, newSku) => {
    const unitData = products.find(p => p.sku === newSku);
    if (unitData) {
      setDisplayUnits(prev => ({ ...prev, [productId]: unitData }));
    }
  };

  // --- LOGIC LỌC & THỐNG KÊ ---
  const categoryStats = useMemo(() => {
    const stats = {};
    products.forEach(p => {
      if (Number(p.is_base_unit) === 1 && p.category_name) {
        stats[p.category_name] = (stats[p.category_name] || 0) + 1;
      }
    });
    return Object.entries(stats).map(([name, count]) => ({ name, count }));
  }, [products]);

  const filteredCats = categoryStats.filter(c =>
    c.name.toLowerCase().includes(catSearch.toLowerCase())
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
  // Tạo hàm debounce dùng useMemo để tránh việc hàm bị tạo lại mỗi lần re-render
  const debouncedSetSearch = useMemo(
    () => debounce((value) => {
      setSearchText(value);
    }, 200), // Đợi 400ms sau khi ngừng gõ mới thực hiện filter
    []
  );

  // Hàm xử lý khi gõ phím
  const handleInputChange = (e) => {
    const value = e.target.value;
    setInputValue(value);        // Cập nhật giao diện ngay lập tức
    debouncedSetSearch(value);   // Gửi vào hàng đợi debounce
  };

  // Đừng quên dọn dẹp debounce khi component bị unmount
  useEffect(() => {
    return () => {
      debouncedSetSearch.cancel();
    };
  }, [debouncedSetSearch]);
  const mainTableData = useMemo(() => {
    // 1. Tách từ khóa tìm kiếm thành mảng (giữ nguyên dấu)
    const searchWords = searchText.trim().split(/\s+/).filter(word => word.length > 0);

    return products.filter(item => {
        // Chỉ hiển thị đơn vị gốc
        if (Number(item.is_base_unit) !== 1) return false;

        // 2. Logic tìm kiếm chính xác từng từ (Exact Token Matching)
        let matchesSearch = true;
        if (searchWords.length > 0) {
            // Tách tên và SKU thành mảng các từ đơn lẻ
            const productName = (item.master_name || "").toLowerCase();
            const productSku = (item.sku || "").toLowerCase();
            
            // Tạo một danh sách các từ có sẵn trong sản phẩm (tên + sku)
            const allProductWords = [...productName.split(/\s+/), ...productSku.split(/\s+/)];

            // Kiểm tra: Mọi từ khóa người dùng gõ phải có ít nhất 1 từ trong SP khớp hoàn toàn
            matchesSearch = searchWords.every(searchWord => 
                allProductWords.some(productWord => productWord === searchWord.toLowerCase())
            );
        }

        // 3. Logic lọc theo Nhóm hàng
        const matchesCategory = selectedCategories.length === 0 || selectedCategories.includes(item.category_name);

        return matchesSearch && matchesCategory;
    });
}, [products, searchText, selectedCategories]);

  const totalStockValue = useMemo(() => {
    return mainTableData.reduce((sum, item) => {
      const baseQty = parseVnNumber(Number(item.total_stock));
      return sum + baseQty;
    }, 0);
  }, [mainTableData]);

  // --- RENDER CHI TIẾT DÒNG (EXPANDABLE) ---
  const expandedRowRender = (record) => {
    const current = displayUnits[record.product_id] || record;
    const qty = parseVnNumber(Number(record.total_stock)) / (parseVnNumber(Number(current.exchange_value)) || 1);

    const tabItems = [
      {
        key: '1',
        label: 'Thông tin',
        children: (
          <Row gutter={[32, 16]} style={{ padding: '10px 0' }}>
            <Col span={4}>
              <div style={{ border: '1px solid #eee', borderRadius: 8, padding: 10, textAlign: 'center', background: '#fafafa' }}>
                <img
                  src={
                    !current.image_url
                      ? 'https://placehold.co/150?text=No+Image'
                      : current.image_url.startsWith('http')
                        ? current.image_url
                        : `${process.env.REACT_APP_API_URL}${current.image_url}`
                  }
                  alt="sp"
                  style={{ maxWidth: '100%', maxHeight: 200, objectFit: 'contain' }}
                />
              </div>
            </Col>
            <Col span={20}>
              <Title level={5}>{current.master_name} <Tag color="blue">{current.unit_name || 'Đơn vị'}</Tag></Title>
              <Row gutter={[16, 16]}>
                <Col span={8}><Text type="secondary">Mã hàng:</Text><br /><b>{current.sku}</b></Col>
                <Col span={8}><Text type="secondary">Tồn quy đổi:</Text><br /><b>{qty.toLocaleString()} {current.unit_name}</b></Col>
                <Col span={8}><Text type="secondary">Giá vốn:</Text><br />{Number(current.cost_price).toLocaleString()}đ</Col>
                <Col span={8}><Text type="secondary">Giá bán:</Text><br /><b style={{ color: '#1890ff' }}>{Number(current.sale_price).toLocaleString()}đ</b></Col>
                <Col span={8}><Text type="secondary">Tỷ lệ quy đổi:</Text><br />{Number(current.exchange_value)}</Col>
                <Col span={8}><Text type="secondary">Thương hiệu:</Text><br />{current.brand || '---'}</Col>
              </Row>
              <Space style={{ marginTop: 20 }}>
                <Button type="primary" icon={<EditOutlined />} onClick={() => showEditModal(record)}>Chỉnh sửa</Button>
                <Popconfirm title="Xóa hàng hóa này?" onConfirm={() => handleDelete(record.product_id)} okText="Xóa" cancelText="Hủy">
                  <Button danger icon={<DeleteOutlined />}>Xóa</Button>
                </Popconfirm>
              </Space>
            </Col>
          </Row>
        ),
      },
      {
        key: '2',
        label: 'Thẻ kho',
        children: (
          <div style={{ padding: 20 }}>
            <StockHistoryTable sku={record.sku}></StockHistoryTable>
          </div>
        )
      }
    ];

    return <Tabs defaultActiveKey="1" items={tabItems} style={{ background: '#fff', padding: '0 20px 20px 20px' }} />;
  };

  // --- CẤU HÌNH CỘT BẢNG ---
  const columns = [
    {
      title: 'Mã hàng',
      key: 'sku',
      width: 150,
      render: (record) => (displayUnits[record.product_id] || record).sku
    },
    {
      title: 'Tên hàng',
      key: 'name',
      render: (record) => {
        const allUnits = products.filter(p => p.product_id === record.product_id);
        const current = displayUnits[record.product_id] || record;

        return (
          <Space direction="vertical" size={0}>
            <Text strong>{record.master_name}</Text>
            {allUnits.length > 1 ? (
              <Select
                size="small"
                variant="borderless"
                value={current.sku}
                style={{ color: '#1890ff', marginLeft: -8 }}
                onClick={(e) => e.stopPropagation()}
                onChange={(value) => handleUnitChange(record.product_id, value)}
                options={allUnits.map(u => ({ value: u.sku, label: `- ${u.unit_name || 'ĐV phụ'}` }))}
                suffixIcon={<DownOutlined style={{ fontSize: 10 }} />}
              />
            ) : (
              <Tag size="small" style={{ marginTop: 4 }}>{record.unit_name || 'Đơn vị'}</Tag>
            )}
          </Space>
        );
      }
    },
    {
      title: 'Giá bán',
      align: 'right',
      render: (record) => {
        const current = displayUnits[record.product_id] || record;
        return <b>{Number(current.sale_price).toLocaleString()}</b>;
      }
    },
    {
      title: 'Tồn kho',
      align: 'right',
      render: (record) => {
        const current = displayUnits[record.product_id] || record;
        const baseQty = parseVnNumber(Number(record.total_stock));
        const exchange = parseVnNumber(Number(current.exchange_value)) || 1;
        const displayQty = baseQty / exchange;
        return <b style={{ color: '#4bac4d' }}>{displayQty.toLocaleString()}</b>;
      }
    },
  ];

  const categoryFilterContent = (
    <div style={{ width: 300 }}>
      <Input placeholder="Tìm kiếm nhóm hàng" prefix={<SearchOutlined />} value={catSearch} onChange={e => setCatSearch(e.target.value)} style={{ marginBottom: 12 }} />
      <div style={{ maxHeight: 300, overflowY: 'auto' }}>
        <Checkbox.Group style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }} value={selectedCategories} onChange={list => setSelectedCategories(list)}>
          {filteredCats.map(cat => (
            <Checkbox key={cat.name} value={cat.name}>{cat.name} <Text type="secondary">({cat.count})</Text></Checkbox>
          ))}
        </Checkbox.Group>
      </div>
      <Divider style={{ margin: '12px 0' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <Button type="link" onClick={() => setSelectedCategories([])}>Xóa chọn</Button>
        <Button type="primary" size="small" onClick={() => setVisible(false)}>Áp dụng</Button>
      </div>
    </div>
  );

  return (
    <Layout style={{ minHeight: '100vh', background: '#f4f6f8' }}>
      <Sider theme="light" width={260} style={{ borderRight: '1px solid #e8e8e8', padding: '16px' }}>
        <Title level={4} style={{ marginBottom: 24 }}>Hàng hóa</Title>
        <Text type="secondary" strong><TagsOutlined /> Nhóm hàng</Text>
        <Popover content={categoryFilterContent} title="Chọn nhóm hàng" trigger="click" placement="bottomLeft" open={visible} onOpenChange={setVisible}>
          <div style={{ marginTop: 8, padding: '8px 12px', border: '1px solid #d9d9d9', borderRadius: 4, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', background: '#fff' }}>
            <Text>{selectedCategories.length > 0 ? `Đã chọn (${selectedCategories.length})` : 'Chọn nhóm hàng'}</Text>
            <DownOutlined style={{ fontSize: 12, color: '#bfbfbf' }} />
          </div>
        </Popover>
      </Sider>

      <Layout>
        <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e8e8e8' }}>
          <Input
            prefix={<SearchOutlined />}
            placeholder="Mã, tên hàng..."
            style={{ width: 450 }}
            allowClear
            value={inputValue}        // Dùng inputValue thay vì searchText
            onChange={handleInputChange} // Dùng hàm handle mới
          />
          <Space>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              style={{ background: '#4bac4d', borderColor: '#4bac4d' }}
              onClick={showAddModal}
            >
              Tạo mới
            </Button>
            <Button icon={<FileExcelOutlined />}>Xuất file</Button>
          </Space>
        </Header>

        <Content style={{ padding: '20px' }}>
          <div style={{ textAlign: 'right', marginBottom: 8, paddingRight: 10 }}>
            <Text type="secondary">Tổng tồn kho (đơn vị gốc): </Text>
            <b style={{ fontSize: 16 }}>{totalStockValue.toLocaleString()}</b>
          </div>
          <Table
            columns={columns}
            dataSource={mainTableData}
            rowKey={(record) => record.product_id}
            loading={loading}
            expandable={{ expandedRowRender, expandRowByClick: true }}
            pagination={{
              ...pagination,
              showSizeChanger: true,
              pageSizeOptions: ['15', '50', '100'],
              onShowSizeChange: (current, size) => setPagination({ ...pagination, current, pageSize: size }),
              onChange: (page, pageSize) => setPagination({ current: page, pageSize })
            }}
            scroll={{ y: 'calc(100vh - 310px)' }}
          />
        </Content>

        {/* --- COMPONENT MODAL ĐÃ TÁCH --- */}
        <ProductModal
          open={isModalOpen}
          isEditMode={isEditMode}
          editingProduct={editingProduct}
          products={products}
          onCancel={() => setIsModalOpen(false)}
          onSuccess={() => {
            setIsModalOpen(false);
            fetchProducts();
          }}
        />
      </Layout>
    </Layout>
  );
};

export default ProductManager;