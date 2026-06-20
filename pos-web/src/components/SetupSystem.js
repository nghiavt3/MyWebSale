import React, { useState } from 'react';
import { Form, Input, Button, Card, message, Spin } from 'antd';

const SetupSystem = ({ onSetupComplete }) => {
    const [loading, setLoading] = useState(false);

    const handleFinish = async (values) => {
        setLoading(true);
        try {
            // Gửi yêu cầu khởi tạo hệ thống
            const response = await fetch('http://localhost:5000/api/system/init', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(values)
            });

            const data = await response.json();

            if (response.ok) {
                message.success("Khởi tạo hệ thống thành công!");
                onSetupComplete(); // Chuyển vào App chính
            } else {
                message.error(data.error || "Không thể kết nối Database");
            }
        } catch (error) {
            message.error("Lỗi kết nối server backend");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f0f2f5' }}>
            <Card title="Thiết lập hệ thống POS lần đầu" style={{ width: 400 }}>
                <Form layout="vertical" onFinish={handleFinish}>
                    <Form.Item label="Database Name" name="database" initialValue="my_pos_db">
                        <Input />
                    </Form.Item>
                    <Form.Item label="User" name="user" initialValue="root">
                        <Input />
                    </Form.Item>
                    <Form.Item label="Password" name="password">
                        <Input.Password />
                    </Form.Item>
                    <Button type="primary" htmlType="submit" block loading={loading}>
                        Khởi tạo Database & Bắt đầu
                    </Button>
                </Form>
            </Card>
        </div>
    );
};

export default SetupSystem;