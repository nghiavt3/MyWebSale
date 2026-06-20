import React, { useState, useEffect } from 'react';
import { Layout, Menu, Typography, Avatar, Space, Badge, Button, Spin } from 'antd';
import {
  AppstoreOutlined,
  DatabaseOutlined,
  SettingOutlined,
  BellOutlined,
  PlusCircleOutlined,
  MinusCircleOutlined,
  QuestionCircleOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate, Navigate } from 'react-router-dom';

// Import các trang của bạn
import ProductManager from './pages/Products';
import Dashboard from './pages/Dashboard';
import PurchaseManager from './pages/PurchaseOrder/PurchaseManager';
import SupplierManager from './pages/Suppliers/SupplierManager';
import POSPage from './pages/Order/POSPage';
import InvoiceList from './pages/Envoices/InvoiceList';
import ReturnPage from './pages/Order/ReturnPage';
import ReturnInvoiceList from './pages/Envoices/ReturnInvoiceList';
import PriceManagement from './pages/Products/PriceManagement';
import StockAudit from './pages/Products/StockAudit';
import CustomerManager from './pages/Customers/CustomerManager';
// THÊM MỚI: Trang thiết lập lần đầu (Bạn có thể tách ra file riêng)
const SetupPage = ({ onComplete }) => {
  const [loading, setLoading] = useState(false);

  const handleSetup = async () => {
    setLoading(true);
    try {
      // Gọi API khởi tạo hệ thống mà mình đã viết ở Backend
      const response = await fetch('http://localhost:5000/api/system/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        // Lưu một đánh dấu nhỏ vào máy khách để lần sau load nhanh hơn (tùy chọn)
        localStorage.setItem('db_configured', 'true');
        onComplete();
      } else {
        const errorData = await response.json();
        alert("Lỗi khởi tạo: " + (errorData.error || "Không xác định"));
      }
    } catch (error) {
      alert("Không thể kết nối tới Server Backend. Hãy chắc chắn Server đang chạy!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', gap: '20px', background: '#f0f2f5' }}>
      <div style={{ textAlign: 'center', padding: '40px', background: 'white', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
        <img src="https://vcdn.kiotviet.vn/kv-static/kiotviet-logo.svg" alt="logo" style={{ height: 40, marginBottom: 20 }} />
        <h1>Thiết lập hệ thống lần đầu</h1>
        <p>Hệ thống phát hiện database trống hoặc chưa có các bảng cần thiết.</p>
        <p style={{ color: '#8c8c8c' }}>Nhấn nút bên dưới để tự động tạo các bảng (Sản phẩm, Hóa đơn, Kho hàng...)</p>
        <Button type="primary" size="large" onClick={handleSetup} loading={loading}>
          {loading ? "Đang tạo cấu trúc Database..." : "Khởi tạo hệ thống ngay"}
        </Button>
      </div>
    </div>
  );
};

const { Header, Content, Footer } = Layout;

const AppLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const menuItems = [
    { key: '/', icon: <AppstoreOutlined />, label: <Link to="/">Tổng quan</Link> },
    {
      key: 'hang-hoa-group',
      icon: <DatabaseOutlined />,
      label: 'Hàng hóa',
      children: [
        {
          type: 'group',
          label: 'Hàng hóa',
          children: [
            { key: '/products', label: <Link to="/products">Danh mục hàng hóa</Link> },
            { key: '/price-edit', label: <Link to="/price-edit">Thiết lập giá</Link> },
          ],
        },
        {
          type: 'group',
          label: 'Nhập & Kiểm kho',
          children: [
            { key: '/Suppliers', label: <Link to="/Suppliers">Nhà Cung Cấp</Link> },
            { key: '/PurchaseOrder', label: <Link to="/PurchaseOrder">Nhập hàng</Link> },
            { key: '/inventory', label: <Link to="/inventory">Kiểm kho</Link> },
          ],
        },
      ],
    },
    {
      key: 'don-hang-group',
      icon: <DatabaseOutlined />,
      label: 'Đơn Hàng',
      children: [
        { key: '/Envoices', label: <Link to="/Envoices">Hóa Đơn</Link> },
        { key: '/return_invoices', label: <Link to="/return_invoices">Trả Hàng</Link> },
      ],
    },
    { key: '/customers', icon: <AppstoreOutlined />, label: <Link to="/customers">Khách Hàng</Link> },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ display: 'flex', alignItems: 'center', background: '#133470', padding: '0 20px', height: '50px', lineHeight: '50px' }}>
        <div style={{ marginRight: 20, display: 'flex', alignItems: 'center' }}>
          <img src="https://vcdn.kiotviet.vn/kv-static/kiotviet-logo.svg" alt="logo" style={{ height: 30, filter: 'brightness(0) invert(1)' }} />
        </div>
        <Menu
          theme="dark"
          mode="horizontal"
          selectedKeys={[location.pathname]}
          items={menuItems}
          style={{ flex: 1, background: 'transparent', borderBottom: 'none', fontSize: '14px' }}
        />
        <div style={{ marginRight: '10px' }}>
          <Button type="primary" icon={<PlusCircleOutlined />} style={{ backgroundColor: '#4bac4d', borderColor: '#4bac4d', fontWeight: 'bold' }} onClick={() => navigate('/pos')}>Bán hàng (F1)</Button>
        </div>
        <div style={{ marginRight: '20px' }}>
          <Button type="primary" icon={<MinusCircleOutlined />} style={{ backgroundColor: '#f5222d', borderColor: '#f5222d', fontWeight: 'bold' }} onClick={() => navigate('/Returns')}>Trả hàng</Button>
        </div>
        <Space size={18} style={{ color: 'white' }}>
          <QuestionCircleOutlined style={{ fontSize: 18 }} />
          <Badge count={5} size="small"><BellOutlined style={{ fontSize: 18, color: 'white' }} /></Badge>
          <SettingOutlined style={{ fontSize: 18 }} />
          <Avatar size="small" icon={<UserOutlined />} />
        </Space>
      </Header>

      <Content style={{ padding: '0px', background: '#f4f6f8' }}>
        <div style={{ minHeight: '85vh' }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/products" element={<ProductManager />} />
            <Route path="/PurchaseOrder" element={<PurchaseManager />} />
            <Route path="/Suppliers" element={<SupplierManager />} />
            <Route path="/customers" element={<CustomerManager />} />
            <Route path="/pos" element={<POSPage />} />
            <Route path="/Envoices" element={<InvoiceList />} />
            <Route path="/Returns" element={<ReturnPage />} />
            <Route path="/return_invoices" element={<ReturnInvoiceList />} />
            <Route path="/price-edit" element={<PriceManagement />} />
            <Route path="/inventory" element={<StockAudit />} />
            <Route path="/settings" element={<div>Trang thiết lập</div>} />
            {/* Catch-all: nếu gõ sai route thì về trang chủ */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </Content>
      <Footer style={{ textAlign: 'center', color: '#bfbfbf' }}>POS Management System ©2026</Footer>
    </Layout>
  );
};

// COMPONENT CHÍNH ĐỂ QUẢN LÝ LUỒNG
const App = () => {
  const [isConfigured, setIsConfigured] = useState(null);

  useEffect(() => {
    const checkActualDBStatus = async () => {
      try {
        // Gọi API check status ở Backend
        const response = await fetch('http://localhost:5000/api/system/status');
        const data = await response.json();

        // Nếu Backend trả về isReady: true nghĩa là đã có bảng
        setIsConfigured(data.isReady);
      } catch (error) {
        // Nếu lỗi kết nối (Backend sập), tạm thời coi là chưa sẵn sàng
        setIsConfigured(false);
      }
    };

    checkActualDBStatus();
  }, []);

  if (isConfigured === null) {
    return (
      <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
        <Spin size="large" />
        <p style={{ marginTop: 16 }}>Đang kết nối cơ sở dữ liệu...</p>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {!isConfigured ? (
          <>
            <Route path="/setup" element={<SetupPage onComplete={() => setIsConfigured(true)} />} />
            <Route path="*" element={<Navigate to="/setup" replace />} />
          </>
        ) : (
          <>
            {/* Nếu đã OK, chặn quay lại trang setup */}
            <Route path="/setup" element={<Navigate to="/" replace />} />
            <Route path="*" element={<AppLayout />} />
          </>
        )}
      </Routes>
    </Router>
  );
};

export default App;