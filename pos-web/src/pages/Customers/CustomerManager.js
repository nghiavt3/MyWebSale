import React, { useState, useEffect } from 'react';
import axiosClient from '../../api/axiosClient';
import CustomerTable from './CustomerTable';
import CustomerSidebar from './CustomerSidebar'; 
import CustomerModal from '../../components/CustomerModal/CustomerModal'; // Đảm bảo đúng đường dẫn
import { Row, Col, Card, Statistic, Button } from 'antd'; // Thêm Button của antd
import { PlusOutlined } from '@ant-design/icons'; // Thêm icon

const CustomerManager = () => {
    const [customers, setCustomers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    
    // State cho Modal
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    useEffect(() => {
        fetchCustomers();
    }, []);

    const fetchCustomers = async (dates) => {
        setLoading(true);
        try {
            let url = '/api/customers';
            if (dates?.startDate && dates?.endDate) {
                url += `?startDate=${dates.startDate}&endDate=${dates.endDate}`;
            }
            const res = await axiosClient.get(url);
            setCustomers(res.data);
        } catch (err) {
            console.error("Lỗi tải khách hàng:", err);
        } finally {
            setLoading(false);
        }
    };

    const refreshData = async () => {
        const res = await axiosClient.get('/api/customers');
        setCustomers(res.data);
    };

    const totalDebtAll = customers.reduce((sum, item) => sum + Number(item.total_debt || 0), 0);
    const totalSpentAll = customers.reduce((sum, item) => sum + Number(item.total_spent || 0), 0);

    const filteredData = customers.filter(c =>
        (c.name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (c.customer_code?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (c.phone?.includes(searchTerm))
    );

    return (
        <div style={{ display: 'flex', background: '#f0f2f5', minHeight: '100vh' }}>
            <div style={{ width: '250px', flexShrink: 0 }}>
                <CustomerSidebar onFilterDate={(dates) => fetchCustomers(dates)} />
            </div>

            <div style={{ flex: 1, padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                    <input
                        type="text"
                        placeholder="Tìm theo mã, tên, SĐT..."
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ width: '350px', padding: '8px 12px', border: '1px solid #d9d9d9', borderRadius: '4px' }}
                    />
                    <Button 
                        type="primary" 
                        icon={<PlusOutlined />} 
                        onClick={() => setIsAddModalOpen(true)}
                    >
                        Khách hàng mới
                    </Button>
                </div>

                <Row gutter={16} style={{ marginBottom: '20px' }}>
                    <Col span={8}>
                        <Card>
                            <Statistic title="Tổng nợ phải thu" value={totalDebtAll} precision={0} suffix="đ" valueStyle={{ color: '#cf1322' }} />
                        </Card>
                    </Col>
                    <Col span={8}>
                        <Card>
                            <Statistic title="Tổng doanh số" value={totalSpentAll} precision={0} suffix="đ" valueStyle={{ color: '#3f8600' }} />
                        </Card>
                    </Col>
                </Row>

                <CustomerTable data={filteredData} refreshData={refreshData} />
            </div>

            {/* Modal thêm khách hàng */}
            <CustomerModal 
                open={isAddModalOpen}
                onCancel={() => setIsAddModalOpen(false)}
                onSuccess={(newCustomer) => {
                    refreshData(); // Làm mới danh sách sau khi thêm thành công
                    setIsAddModalOpen(false);
                }}
            />
        </div>
    );
};

export default CustomerManager;