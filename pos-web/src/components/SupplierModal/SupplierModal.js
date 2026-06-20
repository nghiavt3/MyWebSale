import React, { useEffect } from 'react';
import { Modal, Form, Input, message } from 'antd';
import axiosClient from '../../api/axiosClient';

const SupplierModal = ({ visible, onCancel, onSuccess, editingSupplier }) => {
    const [form] = Form.useForm();

    // Mỗi khi editingSupplier thay đổi, cập nhật dữ liệu vào form
    useEffect(() => {
        if (visible) {
            if (editingSupplier) {
                form.setFieldsValue(editingSupplier);
            } else {
                form.resetFields();
            }
        }
    }, [visible, editingSupplier, form]);

    const handleOk = async () => {
        try {
            const values = await form.validateFields();
            let response;
            
            if (editingSupplier) {
                // Gửi request PUT để cập nhật
                response = await axiosClient.put(`/api/suppliers/${editingSupplier.id}`, values);
                message.success('Cập nhật nhà cung cấp thành công!');
            } else {
                // Gửi request POST để thêm mới
                response = await axiosClient.post('/api/suppliers', values);
                message.success('Thêm nhà cung cấp thành công!');
            }
            
            if (response.data) {
                onSuccess(response.data); 
                form.resetFields();
            }
        } catch (error) {
            console.error('Lỗi:', error);
            message.error(error.response?.data?.error || 'Có lỗi xảy ra khi lưu dữ liệu');
        }
    };

    return (
        <Modal
            title={editingSupplier ? "Chỉnh sửa nhà cung cấp" : "Thêm mới nhà cung cấp"}
            open={visible}
            onOk={handleOk}
            onCancel={() => {
                form.resetFields();
                onCancel();
            }}
            okText="Lưu"
            cancelText="Bỏ qua"
        >
            <Form form={form} layout="vertical">
                <Form.Item
                    name="supplier_name"
                    label="Tên nhà cung cấp"
                    rules={[{ required: true, message: 'Vui lòng nhập tên nhà cung cấp' }]}
                >
                    <Input placeholder="Ví dụ: Công ty Điện Quang" />
                </Form.Item>
                <Form.Item name="supplier_code" label="Mã nhà cung cấp">
                    <Input placeholder="Mã tự động nếu để trống" disabled={!!editingSupplier} />
                </Form.Item>
                <Form.Item name="phone" label="Số điện thoại">
                    <Input placeholder="09xxx..." />
                </Form.Item>
                <Form.Item name="address" label="Địa chỉ">
                    <Input.TextArea rows={2} placeholder="Địa chỉ giao dịch" />
                </Form.Item>
                <Form.Item name="email" label="Email">
                    <Input placeholder="example@gmail.com" />
                </Form.Item>
            </Form>
        </Modal>
    );
};

export default SupplierModal;