import React, { useState, useEffect,useMemo } from 'react';
import { Card, Col, Row, Statistic, DatePicker, Select, Space, Typography } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined, DollarOutlined, ShoppingCartOutlined, FallOutlined } from '@ant-design/icons';
import axiosClient from '../../api/axiosClient';
import dayjs from 'dayjs';
import debounce from 'lodash/debounce';
const { RangePicker } = DatePicker;
const { Title } = Typography;

const Dashboard = () => {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ revenue: 0, cost: 0, profit: 0, returnAmount: 0 });
  const [dates, setDates] = useState([dayjs().startOf('week'), dayjs().endOf('week')]);
  // 1. Tạo bản debounce của hàm fetchStats để bảo vệ server
  const debouncedFetchStats = useMemo(
    () => debounce((start, end) => fetchStats(start, end), 500),
    []
  );
  useEffect(() => {
    return () => debouncedFetchStats.cancel();
  }, [debouncedFetchStats]);
  const fetchStats = async (start, end) => {
    setLoading(true);
    try {
      const res = await axiosClient.get(`/api/dashboard/stats`, {
        params: {
          startDate: start.format('YYYY-MM-DD 00:00:00'),
          endDate: end.format('YYYY-MM-DD 23:59:59')
        }
      });
      setStats(res.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => {
    fetchStats(dates[0], dates[1]);
  }, []);

  const handleQuickSelect = (value) => {
    let start, end;
    switch (value) {
      case 'today': // Thêm hôm nay
        start = dayjs().startOf('day');
        end = dayjs().endOf('day');
        break;
      case 'yesterday': // Thêm hôm qua
        start = dayjs().subtract(1, 'day').startOf('day');
        end = dayjs().subtract(1, 'day').endOf('day');
        break;
      case 'this_week':
        start = dayjs().startOf('week');
        end = dayjs().endOf('week');
        break;
      case 'next_week':
        start = dayjs().add(1, 'week').startOf('week');
        end = dayjs().add(1, 'week').endOf('week');
        break;
      case 'this_month':
        start = dayjs().startOf('month');
        end = dayjs().endOf('month');
        break;
      case 'next_month':
        start = dayjs().add(1, 'month').startOf('month');
        end = dayjs().add(1, 'month').endOf('month');
        break;
      default:
        return;
    }
    setDates([start, end]);
    fetchStats(start, end);
  };

  // 1. Hàm format tiền không lấy phần thập phân
  const formatMoney = (val) => {
    // Ép kiểu về số nguyên trước khi format dấu phẩy
    const integerValue = Math.round(val);
    return `${integerValue}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={2}>Báo cáo kết quả kinh doanh</Title>
        <Space>
          <Select defaultValue="this_week" style={{ width: 150 }} onChange={handleQuickSelect}>
            <Select.Option value="today">Hôm nay</Select.Option>
            <Select.Option value="yesterday">Hôm qua</Select.Option>
            <Select.Option value="this_week">Tuần này</Select.Option>
            <Select.Option value="next_week">Tuần sau</Select.Option>
            <Select.Option value="this_month">Tháng này</Select.Option>
            <Select.Option value="next_month">Tháng sau</Select.Option>
          </Select>
          <RangePicker
            value={dates}
            onChange={(vals) => {
              if (vals) {
                setDates(vals);
                // Sử dụng debounce ở đây vì người dùng có thể click chọn ngày liên tục
                debouncedFetchStats(vals[0], vals[1]);
              }
            }}
          />
        </Space>
      </div>

      <Row gutter={16}>
        <Col span={6}>
          <Card bordered={false} loading={loading}>
            <Statistic
              title="Doanh thu thuần"
              value={stats.revenue}
              precision={0}
              valueStyle={{ color: '#3f8600' }}
              prefix={<DollarOutlined />}
              suffix="đ"
              formatter={(val) => formatMoney(val)}
            />
            <small>Sau khi đã trừ trả hàng</small>
          </Card>
        </Col>
        <Col span={6}>
          <Card bordered={false} loading={loading}>
            <Statistic
              title="Tổng giá vốn"
              value={stats.cost}
              precision={0}
              valueStyle={{ color: '#cf1322' }}
              prefix={<ShoppingCartOutlined />}
              suffix="đ"
              formatter={formatMoney}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card bordered={false} loading={loading}>
            <Statistic
              title="Lợi nhuận gộp"
              value={stats.profit}
              precision={0}
              valueStyle={{ color: stats.profit >= 0 ? '#1890ff' : '#ff4d4f' }}
              prefix={stats.profit >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
              suffix="đ"
              formatter={formatMoney}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card bordered={false} loading={loading}>
            <Statistic
              title="Giá trị trả hàng"
              value={stats.returnAmount}
              precision={0}
              valueStyle={{ color: '#faad14' }}
              prefix={<FallOutlined />}
              suffix="đ"
              formatter={formatMoney}
            />
          </Card>
        </Col>
      </Row>

      {/* Bạn có thể thêm biểu đồ Recharts ở đây để vẽ biểu đồ đường doanh thu */}
    </div>
  );
};

export default Dashboard;