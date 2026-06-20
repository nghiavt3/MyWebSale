import React, { useEffect, useState } from 'react';
import { Table, message, Tag, Modal } from 'antd';
import axiosClient from '../../api/axiosClient';
import PurchaseOrderDetailView from '../PurchaseOrder/PurchaseOrderDetailView';
import InvoiceDetailView from '../Envoices/InvoiceDetailView'
const StockHistoryTable = ({ sku }) => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedDoc, setSelectedDoc] = useState(null);
    const [docType, setDocType] = useState(null); // 'Bán hàng' hoặc 'Nhập hàng'

    useEffect(() => {
        const fetchStockHistory = async () => {
            setLoading(true);
            try {
                // Bạn cần tạo API endpoint này ở server
                const res = await axiosClient.get(`/api/products/stock-history/${sku}`);
                setHistory(res.data);
                console.log(res.data)
            } catch (err) {
                message.error("Không thể tải thẻ kho");
            } finally {
                setLoading(false);
            }
        };
        fetchStockHistory();
    }, [sku]);


    const fetchDocDetail = async (record) => {
        try {
            let endpoint = '';
            if (record.transaction_type === 'Bán hàng') endpoint = `/api/invoices/code/${record.reference_code}`;
            else if (record.transaction_type === 'Nhập hàng') endpoint = `/api/purchase-orders/code/${record.reference_code}`;
            else return; // Trả hàng/Kiểm kho chưa cần modal hoặc cần xử lý riêng

            const res = await axiosClient.get(endpoint);
            setSelectedDoc(res.data);
            console.log(res.data);
            setDocType(record.transaction_type);
            setIsModalOpen(true);
        } catch (err) {
            message.error("Không thể tải chi tiết chứng từ");
        }
    };

    const columns = [
        { title: 'Thời gian', dataIndex: 'created_at', render: (val) => new Date(val).toLocaleString() },
        {
            title: 'Mã chứng từ', dataIndex: 'reference_code', render: (text, record) => (
                <a onClick={() => fetchDocDetail(record)} style={{ fontWeight: 'bold' }}>{text}</a>
            )
        },
        { title: 'Loại', dataIndex: 'transaction_type', render: (val) => <Tag>{val}</Tag> },
        {
            title: 'Thay đổi',
            dataIndex: 'change_qty',
            align: 'right',
            render: (val) => <b style={{ color: val > 0 ? '#52c41a' : '#ff4d4f' }}>{val > 0 ? `+${Number(val)}` : Number(val)}</b>
        },
        { title: 'Ghi chú', dataIndex: 'note' }
    ];

    return (
        <>
            <Table
                columns={columns}
                dataSource={history}
                rowKey={(record, index) => index}
                loading={loading}
                size="small"
                pagination={{ pageSize: 5 }}
            />
            <Modal
                title={`Chi tiết ${docType}`}
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                footer={null}
                width={800}
            >
                {docType === 'Bán hàng' && <InvoiceDetailView record={selectedDoc} />}
                {docType === 'Nhập hàng' && <PurchaseOrderDetailView record={selectedDoc} hideActions={true} />}
            </Modal>
        </>
    );
};

export default StockHistoryTable;