import React, { useState } from 'react';
import PurchaseOrderList from './PurchaseOrderList';
import ImportStock from './ImportStock'; // Đây là file chứa form nhập của bạn

const PurchaseManager = () => {
    // view: 'list' hoặc 'form'
    const [view, setView] = useState('list');
    const [editingData, setEditingData] = useState(null);

    // Hàm khi nhấn "Tạo mới"
    const handleCreateNew = () => {
        setEditingData(null); // Xóa dữ liệu cũ nếu có
        setView('form');      // Chuyển sang form
    };

    // Hàm khi nhấn "Sửa" bản nháp
    const handleEditDraft = (order) => {
        
        setEditingData(order); // Lưu dữ liệu phiếu được chọn
        setView('form');       // Chuyển sang form
    };

    // Hàm để quay lại danh sách sau khi lưu/hủy
    const handleBackToList = () => {
        setView('list');
        setEditingData(null);
    };

    return (
        <div className="manager-container">
            {view === 'list' ? (
                <PurchaseOrderList 
                    onCreateNew={handleCreateNew} 
                    onEditDraft={handleEditDraft} 
                />
            ) : (
                <ImportStock 
                    initialData={editingData} 
                    onBack={handleBackToList} 
                />
            )}
        </div>
    );
};

export default PurchaseManager;