import React, { useState, useMemo } from 'react';
import CustomerDetails from './CustomerDetails';

const CustomerTable = ({ data, refreshData }) => {
    const [expandedId, setExpandedId] = useState(null);
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 10;

    // 1. Logic Sắp xếp
    const sortedData = useMemo(() => {
        let sortableData = [...data];
        if (sortConfig.key) {
            sortableData.sort((a, b) => {
                if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
                if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return sortableData;
    }, [data, sortConfig]);

    // 2. Logic Phân trang
    const paginatedData = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return sortedData.slice(start, start + pageSize);
    }, [sortedData, currentPage]);

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
        setSortConfig({ key, direction });
    };

    return (
        <div>
            <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', border: '1px solid #f0f0f0' }}>
                <thead>

                    <tr style={{ background: '#fafafa', textAlign: 'left', borderBottom: '2px solid #f0f0f0' }}>

                        <th style={{ padding: '12px' }}>Mã KH</th>

                        <th style={{ padding: '12px' }}>Tên khách hàng</th>

                        <th style={{ padding: '12px' }}>Điện thoại</th>

                        <th style={{ padding: '12px', textAlign: 'right' }}>Tổng mua</th>

                        <th style={{ padding: '12px', textAlign: 'right' }}>Nợ cần thu</th>

                    </tr>

                </thead>
                <tbody>
                    {paginatedData.map((c) => (
                        <React.Fragment key={c.id}>
                            <tr onClick={() => setExpandedId(expandedId === c.id ? null : c.id)} style={{ cursor: 'pointer', borderBottom: '1px solid #f0f0f0' }}>
                                <td style={{ padding: '12px', color: '#1890ff' }}>{c.customer_code}</td>
                                <td style={{ padding: '12px', fontWeight: '500' }}>{c.name}</td>
                                <td style={{ padding: '12px' }}>{c.phone || '---'}</td>
                                <td style={{ padding: '12px', textAlign: 'right' }}>{(Number(c.total_spent) || 0).toLocaleString()}đ</td>
                                <td style={{ padding: '12px', textAlign: 'right', color: 'red' }}>{(Number(c.total_debt) || 0).toLocaleString()}đ</td>
                            </tr>
                            {expandedId === c.id && (
                                <tr>
                                    <td colSpan="5" style={{ padding: '10px', background: '#f9f9f9' }}>
                                        <CustomerDetails customer={c} onUpdate={refreshData} />
                                    </td>
                                </tr>
                            )}
                        </React.Fragment>
                    ))}
                </tbody>
            </table>

            {/* Pagination UI */}
            <div style={{ marginTop: 20, textAlign: 'center' }}>
                <button disabled={currentPage === 1} onClick={() => setCurrentPage(currentPage - 1)}>Trước</button>
                <span style={{ margin: '0 15px' }}>Trang {currentPage} / {Math.ceil(sortedData.length / pageSize)}</span>
                <button disabled={currentPage >= Math.ceil(sortedData.length / pageSize)} onClick={() => setCurrentPage(currentPage + 1)}>Sau</button>
            </div>
        </div>
    );
};

export default CustomerTable;