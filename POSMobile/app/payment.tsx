import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Alert, SafeAreaView, TouchableOpacity } from 'react-native';
import { Text, Button, TextInput, Card, Divider, Surface, HelperText, SegmentedButtons } from 'react-native-paper';
import { useRouter } from 'expo-router';
import * as Print from 'expo-print';
import axiosClient from '../src/api/axiosClient';
import { useCart } from '../context/CartContext';
import { formatVND } from '../src/utils/calculator';

export default function PaymentScreen() {
  const router = useRouter();
  const { selectedItems, setSelectedItems } = useCart();
  
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [discountValue, setDiscountValue] = useState('0');
  const [discountType, setDiscountType] = useState<'VND' | '%'>('VND');

  const totalAmount = useMemo(() => {
    return selectedItems.reduce((sum: number, item: any) => sum + (parseFloat(item.total) || 0), 0);
  }, [selectedItems]);

  const finalAmount = useMemo(() => {
    const disc = parseFloat(discountValue) || 0;
    const result = discountType === '%' 
      ? totalAmount - (totalAmount * disc / 100) 
      : totalAmount - disc;
    return Math.max(0, Math.round(result));
  }, [totalAmount, discountValue, discountType]);

  const [customerPay, setCustomerPay] = useState(finalAmount.toString());

  useEffect(() => {
    setCustomerPay(finalAmount.toString());
  }, [finalAmount]);

  const change = (parseFloat(customerPay) || 0) - finalAmount;

  const handleSaveOrder = async (status = 'completed') => {
    if (selectedItems.length === 0) {
      Alert.alert("Thông báo", "Giỏ hàng trống!");
      return;
    }

    try {
      setLoading(true);
      const payload = {
        invoice_id: null,
        customer_id: null,
        current_customer_debt: 0,
        total_amount: totalAmount,
        discount_value: parseFloat(discountValue) || 0,
        discount_type: discountType,
        final_amount: finalAmount,
        customer_pay: parseFloat(customerPay) || 0,
        note: note,
        status: status,
        items: selectedItems.map((item: any) => ({
          product_id: item.product_id,
          master_name: item.master_name || item.name,
          category_name: item.category_name,
          sku: item.sku,
          unit_name: item.unit_name,
          sale_price: item.sale_price,
          quantity: item.quantity,
          lineDiscountValue: item.lineDiscountValue || 0,
          lineDiscountType: item.lineDiscountType || 'VND',
          total: item.total
        }))
      };

      const res = await axiosClient.post('/api/sell-products', payload);

      if (res.data.success) {
        Alert.alert("Thành công", status === 'draft' ? "Đã lưu đơn đặt hàng!" : "Giao dịch hoàn tất!");
        setSelectedItems([]);
        router.replace('/');
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Lỗi", "Không thể lưu đơn hàng");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        
        {/* Khối 1: Tổng kết tiền hàng */}
        <Card style={styles.card} elevation={0}>
          <Card.Content>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Tổng tiền hàng</Text>
              <Text style={styles.value}>{formatVND(totalAmount)}</Text>
            </View>
            
            <View style={styles.discountSection}>
               <Text style={[styles.label, { marginBottom: 8 }]}>Giảm giá hóa đơn</Text>
               <View style={styles.discountRow}>
                  <SegmentedButtons
                    value={discountType}
                    onValueChange={v => setDiscountType(v as 'VND' | '%')}
                    style={styles.segmented}
                    buttons={[
                      { value: 'VND', label: 'đ', checkedColor: '#FFF', style: { backgroundColor: discountType === 'VND' ? '#64748B' : 'transparent' } },
                      { value: '%', label: '%', checkedColor: '#FFF', style: { backgroundColor: discountType === '%' ? '#64748B' : 'transparent' } },
                    ]}
                  />
                  <TextInput
                    value={discountValue}
                    onChangeText={setDiscountValue}
                    keyboardType="numeric"
                    mode="outlined"
                    dense
                    style={styles.discountInput}
                    activeOutlineColor="#64748B"
                  />
               </View>
            </View>

            <Divider style={styles.divider} />
            
            <View style={styles.infoRow}>
              <Text style={styles.finalLabel}>KHÁCH CẦN TRẢ</Text>
              <Text style={styles.finalValue}>{formatVND(finalAmount)}</Text>
            </View>
          </Card.Content>
        </Card>

        {/* Khối 2: Tiền khách đưa */}
        <Card style={styles.card} elevation={0}>
          <Card.Content>
            <Text style={styles.payLabel}>TIỀN KHÁCH ĐƯA</Text>
            <TextInput
              value={customerPay}
              onChangeText={setCustomerPay}
              keyboardType="numeric"
              mode="flat"
              style={styles.customerPayInput}
              underlineColor="#0066FF"
              activeUnderlineColor="#0066FF"
              selectionColor="#0066FF"
            />
            
            <View style={styles.quickPayRow}>
               {[finalAmount, 100000, 200000, 500000].map((amount) => (
                 <TouchableOpacity 
                    key={amount} 
                    style={styles.chip} 
                    onPress={() => setCustomerPay(amount.toString())}
                 >
                    <Text style={styles.chipText}>{amount >= 1000 ? `${amount/1000}k` : amount}</Text>
                 </TouchableOpacity>
               ))}
            </View>

            <Surface style={[styles.changeBox, { backgroundColor: change >= 0 ? '#F0FDF4' : '#FFF1F0' }]} elevation={0}>
                <Text style={styles.changeLabel}>{change >= 0 ? 'Tiền thừa trả khách' : 'Khách còn nợ'}</Text>
                <Text style={[styles.changeValue, { color: change >= 0 ? '#16A34A' : '#CF1322' }]}>
                    {formatVND(Math.abs(change))}
                </Text>
            </Surface>
          </Card.Content>
        </Card>

        {/* Khối 3: Ghi chú */}
        <TextInput
          label="Ghi chú đơn hàng..."
          value={note}
          onChangeText={setNote}
          mode="outlined"
          multiline
          numberOfLines={3}
          style={styles.noteInput}
          outlineColor="#E2E8F0"
          activeOutlineColor="#0066FF"
        />
      </ScrollView>

      {/* Footer Actions */}
      <Surface style={styles.footer} elevation={5}>
        <View style={styles.buttonGroup}>
          <Button 
            mode="outlined" 
            onPress={() => handleSaveOrder('draft')}
            style={styles.draftBtn}
            textColor="#F59E0B"
            labelStyle={{ fontWeight: '700' }}
          >
            LƯU TẠM
          </Button>
          <Button 
            mode="contained" 
            onPress={() => handleSaveOrder('completed')}
            loading={loading}
            style={styles.payBtn}
            buttonColor="#0066FF"
            labelStyle={{ fontWeight: '700', fontSize: 16 }}
          >
            HOÀN THÀNH
          </Button>
        </View>
      </Surface>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  scrollContent: { padding: 16 },
  card: { marginBottom: 16, borderRadius: 12, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E2E8F0' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 4 },
  label: { color: '#64748B', fontSize: 14 },
  value: { fontSize: 15, fontWeight: '600', color: '#1E293B' },
  
  // Discount Section
  discountSection: { marginTop: 16 },
  discountRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  segmented: { flex: 1, height: 36 },
  discountInput: { flex: 1, height: 40, backgroundColor: '#FFF' },
  
  divider: { marginVertical: 16, backgroundColor: '#F1F5F9' },
  
  // Final Total
  finalLabel: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  finalValue: { fontSize: 24, fontWeight: '800', color: '#0066FF' },

  // Customer Pay
  payLabel: { fontSize: 13, color: '#64748B', fontWeight: '600', marginBottom: -10 },
  customerPayInput: { 
    fontSize: 32, 
    fontWeight: '800', 
    backgroundColor: 'transparent', 
    paddingHorizontal: 0,
    color: '#1E293B'
  },
  quickPayRow: { flexDirection: 'row', gap: 8, marginTop: 12, marginBottom: 20 },
  chip: { 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 8, 
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  chipText: { fontSize: 13, color: '#475569', fontWeight: '600' },

  // Change Box
  changeBox: { padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  changeLabel: { fontSize: 13, color: '#64748B', marginBottom: 4 },
  changeValue: { fontSize: 20, fontWeight: '700' },

  noteInput: { backgroundColor: '#FFF', marginBottom: 100 },

  // Footer
  footer: { 
    padding: 16, 
    backgroundColor: '#FFF', 
    borderTopLeftRadius: 20, 
    borderTopRightRadius: 20,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0
  },
  buttonGroup: { flexDirection: 'row', gap: 12 },
  draftBtn: { flex: 1, height: 50, borderRadius: 10, borderColor: '#F59E0B', borderWidth: 1.5 },
  payBtn: { flex: 2, height: 50, borderRadius: 10, elevation: 0 }
});