import React, { useState } from 'react';
import { Card, Select, Input, Radio, Typography, Button, DatePicker, Divider } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { Title } = Typography;
const { RangePicker } = DatePicker;

const SupplierSidebar = ({ onFilterDate }) => {
    // 1. Thêm state để quản lý loại thời gian (all hoặc custom)
    const [timeType, setTimeType] = useState('all');
    const [tempDates, setTempDates] = useState(null);

    const handleApplyFilter = () => {
        if (onFilterDate) {
            // Nếu chọn 'all', gửi null để backend hiểu là lấy toàn thời gian
            if (timeType === 'all') {
                onFilterDate({ startDate: null, endDate: null });
            } else {
                onFilterDate({
                    startDate: tempDates ? tempDates[0].format('YYYY-MM-DD') : null,
                    endDate: tempDates ? tempDates[1].format('YYYY-MM-DD') : null,
                });
            }
        }
    };

    // 2. Hàm xử lý khi thay đổi Radio
    const handleTimeTypeChange = (e) => {
        const value = e.target.value;
        setTimeType(value);
        if (value === 'all') {
            setTempDates(null); // Reset ngày khi quay về "Toàn thời gian"
        }
    };

    return (
        <Card className="supplier-sidebar" style={{ width: 250, borderRight: '1px solid #f0f0f0' }}>
            {/* <Title level={5}>Nhóm nhà cung cấp</Title>
            <Select defaultValue="all" style={{ width: '100%', marginBottom: 20 }}>
                <Select.Option value="all">Tất cả các nhóm</Select.Option>
            </Select>

            <Divider style={{ margin: '12px 0' }} />

            <Title level={5}>Tổng mua</Title>
            <div style={{ display: 'flex', gap: 5, marginBottom: 10 }}>
                <Input placeholder="Từ" />
                <Input placeholder="Tới" />
            </div> */}

            <Divider style={{ margin: '12px 0' }} />

            <Title level={5}>Thời gian</Title>
            <Radio.Group 
                value={timeType} 
                onChange={handleTimeTypeChange} 
                style={{ marginBottom: 10 }}
            >
                <Radio value="all">Toàn thời gian</Radio>
                <Radio value="custom">Tùy chỉnh</Radio>
            </Radio.Group>
            
            {/* 3. Thêm thuộc tính disabled dựa trên timeType */}
            <RangePicker 
                style={{ width: '100%', marginBottom: 15 }}
                format="DD/MM/YYYY"
                value={tempDates}
                onChange={(values) => setTempDates(values)}
                placeholder={['Từ ngày', 'Đến ngày']}
                disabled={timeType === 'all'} 
            />

            <Button 
                type="primary" 
                block 
                onClick={handleApplyFilter}
                style={{ backgroundColor: '#5b73e8' }}
            >
                Áp dụng
            </Button>

            <Divider style={{ margin: '12px 0' }} />

            {/* <Title level={5}>Nợ hiện tại</Title>
            <div style={{ display: 'flex', gap: 5, marginBottom: 10 }}>
                <Input placeholder="Từ" />
                <Input placeholder="Tới" />
            </div>

            <Title level={5}>Trạng thái</Title>
            <Radio.Group defaultValue="active">
                <Radio value="all">Tất cả</Radio>
                <Radio value="active">Đang hoạt động</Radio>
            </Radio.Group> */}
        </Card>
    );
};

export default SupplierSidebar;