import React, { useState } from 'react';
import { Card, Select, Radio, Typography, Button, DatePicker, Divider } from 'antd';

const { Title } = Typography;
const { RangePicker } = DatePicker;

const CustomerSidebar = ({ onFilterDate }) => {
    const [timeType, setTimeType] = useState('all');
    const [tempDates, setTempDates] = useState(null);

    const handleApplyFilter = () => {
        if (onFilterDate) {
            onFilterDate(timeType === 'all' ? null : {
                startDate: tempDates ? tempDates[0].format('YYYY-MM-DD') : null,
                endDate: tempDates ? tempDates[1].format('YYYY-MM-DD') : null,
            });
        }
    };

    return (
        <Card style={{ width: 250, minHeight: '100vh' }}>
            {/* <Title level={5}>Nhóm khách hàng</Title>
            <Select defaultValue="all" style={{ width: '100%' }}>
                <Select.Option value="all">Tất cả</Select.Option>
            </Select>
            <Divider /> */}
            <Title level={5}>Thời gian giao dịch</Title>
            <Radio.Group value={timeType} onChange={(e) => setTimeType(e.target.value)}>
                <Radio value="all">Toàn thời gian</Radio>
                <Radio value="custom">Tùy chỉnh</Radio>
            </Radio.Group>
            <RangePicker 
                disabled={timeType === 'all'}
                onChange={setTempDates}
                style={{ marginTop: 10, width: '100%' }}
            />
            <Button type="primary" block style={{ marginTop: 15 }} onClick={handleApplyFilter}>Áp dụng</Button>
        </Card>
    );
};
export default CustomerSidebar;