import React, { useState, useMemo, useEffect } from 'react';
import SupplierDetails from './SupplierDetails';
import { CaretUpOutlined, CaretDownOutlined, LeftOutlined, RightOutlined } from '@ant-design/icons';
import { Button, Select, Space, Typography } from 'antd';

const { Text } = Typography;

const SupplierTable = ({ data, refreshData }) => {
    const [expandedId, setExpandedId] = useState(null);
    const [sortConfig, setSortConfig] = useState({ key: 'supplier_name', direction: 'asc' });
    
    // --- STATE PHÂN TRANG ---
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    // Reset về trang 1 nếu dữ liệu gốc thay đổi (ví dụ khi search)
    useEffect(() => {
        setCurrentPage(1);
    }, [data.length]);

    const requestSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const sortedData = useMemo(() => {
        let sortableItems = [...data];
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                let aValue = a[sortConfig.key];
                let bValue = b[sortConfig.key];

                if (['current_debt', 'total_buy'].includes(sortConfig.key)) {
                    aValue = Number(aValue) || 0;
                    bValue = Number(bValue) || 0;
                } else {
                    aValue = (aValue || "").toString().toLowerCase();
                    bValue = (bValue || "").toString().toLowerCase();
                }

                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return sortableItems;
    }, [data, sortConfig]);

    // --- LOGIC CẮT DỮ LIỆU PHÂN TRANG ---
    const paginatedData = useMemo(() => {
        const startIndex = (currentPage - 1) * pageSize;
        return sortedData.slice(startIndex, startIndex + pageSize);
    }, [sortedData, currentPage, pageSize]);

    const totalPages = Math.ceil(data.length / pageSize);

    const handleRowClick = (id) => {
        setExpandedId(expandedId === id ? null : id);
    };

    const getSortIcon = (columnKey) => {
        if (sortConfig.key !== columnKey) return <CaretUpOutlined style={{ color: '#bfbfbf', fontSize: '12px' }} />;
        return sortConfig.direction === 'asc' 
            ? <CaretUpOutlined style={{ color: '#1890ff', fontSize: '12px' }} /> 
            : <CaretDownOutlined style={{ color: '#1890ff', fontSize: '12px' }} />;
    };

    const thStyle = (key, align = 'left') => ({
        padding: '12px',
        cursor: 'pointer',
        textAlign: align,
        userSelect: 'none',
        transition: 'background 0.3s'
    });

    return (
        <div style={{ background: '#fff', border: '1px solid #f0f0f0', borderRadius: '4px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                    <tr style={{ background: '#fafafa', borderBottom: '2px solid #f0f0f0' }}>
                        <th style={thStyle('supplier_code')} onClick={() => requestSort('supplier_code')}>
                            Mã NCC {getSortIcon('supplier_code')}
                        </th>
                        <th style={thStyle('supplier_name')} onClick={() => requestSort('supplier_name')}>
                            Tên nhà cung cấp {getSortIcon('supplier_name')}
                        </th>
                        <th style={thStyle('phone')} onClick={() => requestSort('phone')}>
                            Điện thoại {getSortIcon('phone')}
                        </th>
                        <th style={thStyle('current_debt', 'right')} onClick={() => requestSort('current_debt')}>
                            Nợ hiện tại {getSortIcon('current_debt')}
                        </th>
                        <th style={thStyle('total_buy', 'right')} onClick={() => requestSort('total_buy')}>
                            Tổng mua {getSortIcon('total_buy')}
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {paginatedData.map((s) => (
                        <React.Fragment key={s.id}>
                            <tr
                                onClick={() => handleRowClick(s.id)}
                                style={{ 
                                    cursor: 'pointer', 
                                    borderBottom: '1px solid #f0f0f0',
                                    background: expandedId === s.id ? '#e6f7ff' : 'transparent' 
                                }}
                            >
                                <td style={{ padding: '12px', color: '#1890ff' }}>{s.supplier_code}</td>
                                <td style={{ padding: '12px', fontWeight: '500' }}>{s.supplier_name}</td>
                                <td style={{ padding: '12px' }}>{s.phone || '---'}</td>
                                <td style={{ padding: '12px', textAlign: 'right', color: 'red' }}>
                                    {(Number(s.current_debt) || 0).toLocaleString()}đ
                                </td>
                                <td style={{ padding: '12px', textAlign: 'right' }}>
                                    {(Number(s.total_buy) || 0).toLocaleString()}đ
                                </td>
                            </tr>

                            {expandedId === s.id && (
                                <tr>
                                    <td colSpan="5" style={{ padding: '0', background: '#fafafa' }}>
                                        <div style={{ padding: '20px', borderBottom: '1px solid #f0f0f0' }}>
                                            <SupplierDetails supplier={s} onUpdate={refreshData} />
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </React.Fragment>
                    ))}
                </tbody>
            </table>

            {/* --- THANH PHÂN TRANG (PAGINATION FOOTER) --- */}
            <div style={{ 
                padding: '12px 20px', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                borderTop: '1px solid #f0f0f0'
            }}>
                <Space>
                    <Text type="secondary">Hiển thị</Text>
                    <Select 
                        size="small"
                        value={pageSize} 
                        onChange={(val) => { setPageSize(val); setCurrentPage(1); }}
                        options={[
                            { value: 10, label: '10 / trang' },
                            { value: 20, label: '20 / trang' },
                            { value: 50, label: '50 / trang' },
                        ]}
                    />
                    <Text type="secondary">Tổng số: {data.length}</Text>
                </Space>

                <Space>
                    <Button 
                        size="small"
                        icon={<LeftOutlined />} 
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(prev => prev - 1)}
                    />
                    <Text strong>{currentPage} / {totalPages || 1}</Text>
                    <Button 
                        size="small"
                        icon={<RightOutlined />} 
                        disabled={currentPage === totalPages || totalPages === 0}
                        onClick={() => setCurrentPage(prev => prev + 1)}
                    />
                </Space>
            </div>
        </div>
    );
};

export default SupplierTable;