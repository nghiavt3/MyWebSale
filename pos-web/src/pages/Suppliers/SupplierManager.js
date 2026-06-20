import React, { useState, useEffect } from 'react';
import axiosClient from '../../api/axiosClient';
import SupplierTable from './SupplierTable';
import SupplierSidebar from './SupplierSidebar'; // Import thêm dòng này
import SupplierModal from '../../components/SupplierModal/SupplierModal';
import { DatePicker, Row, Col, Card, Statistic, Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
const { RangePicker } = DatePicker;
const SupplierManager = () => {
    const [suppliers, setSuppliers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);

    const [isModalOpen, setIsModalOpen] = useState(false);
    // Tính toán tổng nợ từ mảng suppliers
    // current_debt thường là kiểu string từ Database nên cần chuyển sang Number
    const totalDebtAll = suppliers.reduce((sum, item) => sum + Number(item.current_debt || 0), 0);
    const totalBuyAll = suppliers.reduce((sum, item) => sum + Number(item.total_buy || 0), 0);
    useEffect(() => {
        fetchSuppliers();
    }, []);

    const fetchSuppliers = async (dates) => {
        try {
            let url = '/api/suppliers/time_interval';
            if (dates?.startDate && dates?.endDate) {
                const start = dates.startDate;
                const end = dates.endDate;
                url += `?startDate=${start}&endDate=${end}`;
            }
            const res = await axiosClient.get(url);
            setSuppliers(res.data);
            setLoading(false);
        } catch (err) {
            console.error("Lỗi tải NCC:", err);
            setLoading(false);
        }
    };
    // Hàm fetch lại toàn bộ danh sách từ API
    const refreshData = async () => {
        // const res = await axiosClient.get('/api/suppliers');
        // setSuppliers(res.data);
        fetchSuppliers();
    };
    // Hàm xử lý sau khi thêm mới thành công
    const handleAddSuccess = () => {
        setIsModalOpen(false);
        refreshData();
    };
    // Logic tìm kiếm
    const filteredData = suppliers.filter(s => {
        const search = searchTerm.trim().toLowerCase();
        return (
            s.supplier_name?.toLowerCase().includes(search) ||
            s.supplier_code?.toLowerCase().includes(search) ||
            s.phone?.includes(search)
        );
    });

    return (
        <div style={{ display: 'flex', background: '#f0f2f5', minHeight: '100vh' }}>
            {/* Sidebar nằm bên trái */}
            <div style={{ width: '250px', flexShrink: 0 }}>
                <SupplierSidebar
                    onFilterDate={(dates) => fetchSuppliers(dates)}
                />
            </div>

            {/* Nội dung chính nằm bên phải */}
            <div style={{ flex: 1, padding: '20px', overflowX: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                    {/* Ô tìm kiếm và nút Thêm mới */}
                    <input
                        type="text"
                        placeholder="Theo mã, tên, số điện thoại..."
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ width: '350px', padding: '8px 12px', border: '1px solid #d9d9d9', borderRadius: '4px' }}
                    />
                    <div style={{ display: 'flex', gap: '10px' }}>
                        {/* <button style={{ padding: '8px 15px' }}>📥 Import file</button> */}
                        {/* <button style={{ padding: '8px 15px' }}>📤 Xuất file</button> */}
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={() => setIsModalOpen(true)}
                        >
                            Nhà cung cấp
                        </Button>
                    </div>
                </div>
                <div style={{ flex: 1, marginLeft: '20px' }}>
                    {/* Phần hiển thị tổng hợp nằm trên Table */}
                    <Row gutter={16} style={{ marginBottom: '20px' }}>
                        <Col span={8}>
                            <Card variant="borderless">
                                <Statistic
                                    title="Tổng nợ cần trả"
                                    value={totalDebtAll}
                                    precision={0}
                                    suffix="đ"
                                    valueStyle={{ color: '#cf1322' }}
                                />
                            </Card>
                        </Col>
                        <Col span={8}>
                            <Card variant="borderless">
                                <Statistic
                                    title="Tổng giá trị nhập hàng"
                                    value={totalBuyAll}
                                    precision={0}
                                    suffix="đ"
                                    valueStyle={{ color: '#3f8600' }}
                                />
                            </Card>
                        </Col>
                    </Row>
                    <SupplierTable data={filteredData} refreshData={refreshData} />
                </div>
            </div>
            <SupplierModal
                visible={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                onSuccess={handleAddSuccess}
                editingSupplier={null} // Truyền null vì đây là nút "Thêm mới"
            />
        </div>
    );
};

export default SupplierManager;