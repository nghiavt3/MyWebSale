import React, { useEffect } from 'react';
import { Modal, Form, Input, Select, Row, Col, DatePicker, message } from 'antd';
import { UserAddOutlined, PhoneOutlined, HomeOutlined, EditOutlined } from '@ant-design/icons';
import axiosClient from '../../api/axiosClient';
import dayjs from 'dayjs';

const CustomerModal = ({ open, onCancel, onSuccess, initialName, customer }) => {
    const [form] = Form.useForm();
    const isEditMode = !!customer; // Nếu có object customer truyền vào => Chế độ Sửa

    // Reset hoặc điền dữ liệu vào form khi Modal mở
    useEffect(() => {
        if (open) {
            if (isEditMode) {
                form.setFieldsValue({
                    ...customer,
                    birthday: customer.birthday ? dayjs(customer.birthday) : null,
                });
            } else {
                form.resetFields();
                form.setFieldsValue({ name: initialName, group_id: 1 });
            }
        }
    }, [open, customer, initialName, form, isEditMode]);

    const handleSave = async () => {
        try {
            const values = await form.validateFields();
            let res;

            if (isEditMode) {
                // Gọi API cập nhật thông tin
                res = await axiosClient.put(`/api/customers/${customer.id}`, values);
                message.success('Cập nhật khách hàng thành công!');
            } else {
                // Gọi API thêm mới
                res = await axiosClient.post('/api/customers', values);
                message.success('Thêm khách hàng thành công!');
            }

            if (res.status === 200 || res.status === 201) {
                onSuccess(res.data);
                onCancel();
            }
        } catch (error) {
            if (error.response) {
                message.error(error.response.data.message || 'Lỗi khi lưu dữ liệu');
            }
        }
    };

    return (
        <Modal
            title={
                isEditMode ? (
                    <><EditOutlined /> Chỉnh sửa khách hàng</>
                ) : (
                    <><UserAddOutlined /> Thêm khách hàng mới</>
                )
            }
            open={open}
            onCancel={onCancel}
            onOk={handleSave}
            okText="Lưu"
            cancelText="Bỏ qua"
            width={600}
        >
            <Form form={form} layout="vertical">
                <Row gutter={16}>
                    <Col span={12}>
                        <Form.Item
                            name="name"
                            label="Tên khách hàng"
                            rules={[{ required: true, message: 'Vui lòng nhập tên' }]}
                        >
                            <Input placeholder="Nguyễn Văn A" />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item
                            name="phone"
                            label="Số điện thoại"
                            rules={[{ required: true, message: 'Vui lòng nhập SĐT' }]}
                        >
                            <Input prefix={<PhoneOutlined />} placeholder="09xxxxx" />
                        </Form.Item>
                    </Col>
                </Row>

                <Row gutter={16}>
                    <Col span={12}>
                        <Form.Item name="group_id" label="Nhóm khách hàng" initialValue={1}>
                            <Select>
                                <Select.Option value={1}>Khách lẻ</Select.Option>
                                <Select.Option value={2}>Khách VIP</Select.Option>
                                <Select.Option value={3}>Đại lý</Select.Option>
                            </Select>
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item name="birthday" label="Ngày sinh">
                            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                        </Form.Item>
                    </Col>
                </Row>

                <Form.Item name="address" label="Địa chỉ">
                    <Input prefix={<HomeOutlined />} placeholder="Số nhà, tên đường..." />
                </Form.Item>

                <Form.Item name="note" label="Ghi chú">
                    <Input.TextArea rows={2} placeholder="Sở thích khách hàng, lưu ý giao hàng..." />
                </Form.Item>
            </Form>
        </Modal>
    );
};

export default CustomerModal;