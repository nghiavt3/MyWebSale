import React, { useEffect } from 'react';
import { Modal, Form, Row, Col, Input, InputNumber, Typography, Space, Tag, Card, Button, message, Upload } from 'antd';
import { DeleteOutlined, PlusOutlined, UploadOutlined } from '@ant-design/icons';
import axiosUpload from '../../api/axiosUpload';

const { Title, Text } = Typography;

const ProductModal = ({ open, isEditMode, editingProduct, products, onCancel, onSuccess }) => {
  const [form] = Form.useForm();

  // Reset form khi đóng/mở hoặc đổi sản phẩm chỉnh sửa
  useEffect(() => {
    if (open) {
      if (isEditMode && editingProduct) {
        const allUnitsOfProduct = products.filter(p => p.product_id === editingProduct.product_id);
        form.setFieldsValue({
          master_name: editingProduct.master_name,
          category_name: editingProduct.category_name,
          brand: editingProduct.brand,
          total_stock: Number(editingProduct.total_stock),
          units: allUnitsOfProduct.map(u => ({
            sku: u.sku,
            unit_name: u.unit_name,
            cost_price: Number(u.cost_price),
            sale_price: Number(u.sale_price),
            exchange_value: Number(u.exchange_value),
            is_base_unit: u.is_base_unit,
            // image_url: u.image_url // Để hiển thị nếu cần (tùy backend trả về)
          }))
        });
      } else {
        form.resetFields();
        form.setFieldsValue({
          units: [{ unit_name: '', sku: '', is_base_unit: 1, exchange_value: 1, cost_price: 0, sale_price: 0 }]
        });
      }
    }
  }, [open, isEditMode, editingProduct, products, form]);

  // Logic cũ: Tự động tính lại giá các đơn vị quy đổi khi giá gốc thay đổi
  const handleBasePriceChange = (type, value) => {
    const units = form.getFieldValue('units');
    if (!units) return;
    units.forEach((unit, index) => {
      if (index !== 0) {
        const exchange = Number(unit.exchange_value) || 1;
        form.setFieldValue(['units', index, type], Math.round(value * exchange));
      }
    });
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const formData = new FormData();

      // Xử lý dữ liệu và gom ảnh theo từng SKU
      const formattedUnits = values.units.map((unit, index) => {
        // Lấy file từ Upload component của từng unit
        if (unit.image_file && unit.image_file.fileList && unit.image_file.fileList[0]) {
          formData.append(`image_${unit.sku || `unit_${index}`}`, unit.image_file.fileList[0].originFileObj);
        }

        return {
          ...unit,
          is_base_unit: index === 0 ? 1 : 0,
          exchange_value: index === 0 ? 1 : (unit.exchange_value || 1)
        };
      });

      // Đính kèm dữ liệu JSON
      formData.append('data', JSON.stringify({ ...values, units: formattedUnits }));

      if (isEditMode) {
        await axiosUpload.put(`/api/products/${editingProduct.product_id}`, formData);
        message.success("Cập nhật thành công");
      } else {
        await axiosUpload.post('/api/products', formData);
        message.success("Thêm hàng hóa thành công");
      }
      onSuccess();
    } catch (err) {
      console.error(err);
      message.error("Có lỗi xảy ra, vui lòng kiểm tra lại");
    }
  };

  return (
    <Modal
      title={isEditMode ? "Sửa hàng hóa" : "Thêm hàng hóa mới"}
      open={open}
      onOk={handleSave}
      onCancel={onCancel}
      width={1100}
      okText="Lưu (F9)"
      destroyOnClose
    >
      <Form form={form} layout="vertical">
        <Row gutter={24}>
          {/* CỘT TRÁI: THÔNG TIN CHUNG */}
          <Col span={6}>
            <Title level={5}>Thông tin chung</Title>
            <Form.Item label="Tên hàng" name="master_name" rules={[{ required: true, message: 'Cần nhập tên hàng' }]}><Input /></Form.Item>
            <Form.Item label="Nhóm hàng" name="category_name"><Input /></Form.Item>
            <Form.Item label="Thương hiệu" name="brand"><Input /></Form.Item>
            <Form.Item label="Tồn kho khởi tạo" name="total_stock"><InputNumber style={{ width: '100%' }} min={0} /></Form.Item>
          </Col>

          {/* CỘT PHẢI: ĐƠN VỊ & GIÁ & ẢNH */}
          <Col span={18}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Title level={5} style={{ margin: 0 }}>Đơn vị tính & Giá</Title>
              {!isEditMode && <Text type="secondary" italic>(Đơn vị đầu tiên là đơn vị gốc)</Text>}
            </div>

            <Form.List name="units">
              {(fields, { add, remove }) => (
                <>
                  <div style={{ maxHeight: '550px', overflowY: 'auto', paddingRight: 8 }}>
                    {fields.map(({ key, name, ...restField }, index) => {
                      const isBase = index === 0;
                      return (
                        <Card
                          size="small"
                          key={key}
                          style={{ marginBottom: 12, borderLeft: isBase ? '4px solid #4bac4d' : '4px solid #1890ff' }}
                          title={
                            <Space>
                              {isBase ? <Tag color="green">Gốc</Tag> : <Tag color="blue">Quy đổi {index}</Tag>}
                              {form.getFieldValue(['units', name, 'unit_name']) || '...'}
                            </Space>
                          }
                          extra={!isBase && <Button type="text" danger onClick={() => remove(name)} icon={<DeleteOutlined />} />}
                        >
                          <Row gutter={12} align="bottom">
                            <Col span={4}>
                              <Form.Item {...restField} name={[name, 'unit_name']} label="Đơn vị" rules={[{ required: true }]}><Input placeholder="Mét, Cuộn..." /></Form.Item>
                            </Col>
                            <Col span={4}>
                              <Form.Item {...restField} name={[name, 'sku']} label="Mã SKU"><Input placeholder="Tự sinh" disabled={isEditMode && isBase} /></Form.Item>
                            </Col>
                            {!isBase && (
                              <Col span={3}>
                                <Form.Item {...restField} name={[name, 'exchange_value']} label="Giá trị QĐ" rules={[{ required: true }]}>
                                  <InputNumber
                                    style={{ width: '100%' }}
                                    min={1}
                                    onChange={(ex) => {
                                      const baseCost = form.getFieldValue(['units', 0, 'cost_price']) || 0;
                                      const baseSale = form.getFieldValue(['units', 0, 'sale_price']) || 0;
                                      form.setFieldValue(['units', name, 'cost_price'], Math.round(baseCost * (ex || 1)));
                                      form.setFieldValue(['units', name, 'sale_price'], Math.round(baseSale * (ex || 1)));
                                    }}
                                  />
                                </Form.Item>
                              </Col>
                            )}
                            <Col span={isBase ? 5 : 4}>
                              <Form.Item {...restField} name={[name, 'cost_price']} label="Giá vốn">
                                <InputNumber
                                  style={{ width: '100%' }}
                                  formatter={val => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                                  parser={val => val.replace(/\$\s?|(,*)/g, '')}
                                  onChange={(val) => isBase && handleBasePriceChange('cost_price', val)}
                                />
                              </Form.Item>
                            </Col>
                            <Col span={isBase ? 5 : 4}>
                              <Form.Item {...restField} name={[name, 'sale_price']} label="Giá bán">
                                <InputNumber
                                  style={{ width: '100%' }}
                                  formatter={val => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                                  parser={val => val.replace(/\$\s?|(,*)/g, '')}
                                  onChange={(val) => isBase && handleBasePriceChange('sale_price', val)}
                                />
                              </Form.Item>
                            </Col>
                            {/* PHẦN THÊM MỚI: Tải ảnh cho từng đơn vị */}
                            <Col span={isBase ? 6 : 5}>
                              <Form.Item {...restField} name={[name, 'image_file']} label="Ảnh đơn vị">
                                <Upload 
                                  listType="picture" 
                                  maxCount={1} 
                                  beforeUpload={() => false}
                                >
                                  <Button icon={<UploadOutlined />} style={{ width: '100%' }}>Chọn ảnh</Button>
                                </Upload>
                              </Form.Item>
                            </Col>
                          </Row>
                        </Card>
                      );
                    })}
                  </div>
                  <Button type="dashed" onClick={() => add({ unit_name: '', exchange_value: 1, is_base_unit: 0, cost_price: 0, sale_price: 0 })} block icon={<PlusOutlined />} style={{ marginTop: 8 }}>
                    Thêm đơn vị quy đổi
                  </Button>
                </>
              )}
            </Form.List>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
};

export default ProductModal;