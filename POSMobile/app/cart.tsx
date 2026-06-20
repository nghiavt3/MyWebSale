import React, { useState } from 'react';
import { View, FlatList, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { Text, IconButton, Button, Surface, Card, Modal, Portal, TextInput, SegmentedButtons, Divider } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { CartItem } from '../hooks/useCart';
import { formatVND } from '../src/utils/calculator';
import { useCart } from '../context/CartContext';

export default function CartScreen() {
  const router = useRouter();
  const { selectedItems, updateQuantity, setSelectedItems } = useCart();
  
  // State cho Modal chiết khấu
  const [visible, setVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<CartItem | null>(null);
  const [discountValue, setDiscountValue] = useState('');
  const [discountType, setDiscountType] = useState<'VND' | '%'>('VND');

  const totalAmount = selectedItems.reduce((sum: number, item: any) => sum + (item.total || 0), 0);

  const openDiscountModal = (item: CartItem) => {
    setEditingItem(item);
    setDiscountValue(item.lineDiscountValue?.toString() || '0');
    setDiscountType(item.lineDiscountType || 'VND');
    setVisible(true);
  };

  const applyDiscount = () => {
    if (editingItem) {
      const val = parseFloat(discountValue) || 0;
      setSelectedItems((prev: any[]) => prev.map(item => 
        item.sku === editingItem.sku 
          ? { ...item, lineDiscountValue: val, lineDiscountType: discountType }
          : item
      ));
      updateQuantity(editingItem.sku, editingItem.quantity); 
    }
    setVisible(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Portal>
        <Modal visible={visible} onDismiss={() => setVisible(false)} contentContainerStyle={styles.modal}>
          <Text style={styles.modalTitle}>Chiết khấu sản phẩm</Text>
          <Text style={styles.modalSubtitle} numberOfLines={1}>{editingItem?.name}</Text>
          
          <SegmentedButtons
            value={discountType}
            onValueChange={value => setDiscountType(value as 'VND' | '%')}
            buttons={[
              { 
                value: 'VND', 
                label: 'Số tiền (đ)',
                // Dùng props thay vì theme để tránh lỗi TS
                checkedColor: '#FFFFFF', 
                uncheckedColor: '#475569',
                style: { backgroundColor: discountType === 'VND' ? '#133470' : 'transparent' }
              },
              { 
                value: '%', 
                label: 'Phần trăm (%)',
                checkedColor: '#FFFFFF',
                uncheckedColor: '#475569',
                style: { backgroundColor: discountType === '%' ? '#133470' : 'transparent' }
              },
            ]}
            style={styles.segmented}
          />

          <TextInput
            label="Nhập giá trị giảm"
            value={discountValue}
            onChangeText={setDiscountValue}
            keyboardType="numeric"
            mode="outlined"
            outlineColor="#E2E8F0"
            activeOutlineColor="#133470"
            style={styles.input}
          />

          <View style={styles.modalActions}>
             <Button mode="text" onPress={() => setVisible(false)} textColor="#94A3B8">Bỏ qua</Button>
             <Button mode="contained" onPress={applyDiscount} buttonColor="#133470" style={{ borderRadius: 8 }}>
                Áp dụng
             </Button>
          </View>
        </Modal>
      </Portal>

      <FlatList
        data={selectedItems}
        keyExtractor={(item) => item.sku}
        contentContainerStyle={{ paddingBottom: 20 }}
        renderItem={({ item }) => (
          <Card style={styles.itemCard} elevation={0}>
            <Card.Content>
              <View style={styles.itemHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.itemSku}>Mã: {item.sku}</Text>
                </View>
                <Text style={styles.itemPrice}>{formatVND(item.sale_price)}</Text>
              </View>

              <Divider style={styles.divider} />

              <View style={styles.itemFooter}>
                <TouchableOpacity onPress={() => openDiscountModal(item)} style={styles.discountBadge}>
                  <IconButton icon="tag-outline" size={14} iconColor="#0066FF" style={{ margin: 0 }} />
                  <Text style={styles.discountText}>
                    {item.lineDiscountValue > 0 
                      ? `Giảm -${item.lineDiscountValue}${item.lineDiscountType === 'VND' ? 'đ' : '%'}` 
                      : 'Thêm giảm giá'}
                  </Text>
                </TouchableOpacity>

                <View style={styles.controls}>
                  <View style={styles.quantityBox}>
                    <TouchableOpacity onPress={() => updateQuantity(item.sku, item.quantity - 1)} style={styles.qtyBtn}>
                      <Text style={styles.qtyBtnText}>-</Text>
                    </TouchableOpacity>
                    <View style={styles.qtyValueContainer}>
                        <Text style={styles.quantityText}>{item.quantity}</Text>
                    </View>
                    <TouchableOpacity onPress={() => updateQuantity(item.sku, item.quantity + 1)} style={styles.qtyBtn}>
                      <Text style={styles.qtyBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.lineTotalText}>{formatVND(item.total)}</Text>
                </View>
              </View>
            </Card.Content>
          </Card>
        )}
      />

      <Surface style={styles.footer} elevation={5}>
        <View style={styles.summaryBox}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Số mặt hàng ({selectedItems.length})</Text>
            <Text style={styles.summaryValue}>{selectedItems.reduce((a:any, b:any) => a + b.quantity, 0)} sản phẩm</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>Tổng cộng</Text>
            <Text style={styles.totalValue}>{formatVND(totalAmount)}</Text>
          </View>
        </View>
        
        <Button 
          mode="contained" 
          buttonColor="#0066FF" 
          contentStyle={{ height: 54 }} 
          style={styles.paymentBtn}
          labelStyle={{ fontSize: 16, fontWeight: '700' }}
          onPress={() => router.push('/payment')}
        >
          THANH TOÁN
        </Button>
      </Surface>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  // Modal
  modal: { backgroundColor: 'white', padding: 24, margin: 20, borderRadius: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A', marginBottom: 4 },
  modalSubtitle: { fontSize: 14, color: '#64748B', marginBottom: 20 },
  segmented: { marginBottom: 20, height: 42 },
  input: { backgroundColor: '#FFF', marginBottom: 10 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10, gap: 8 },

  // Card Item
  itemCard: { 
    marginHorizontal: 12, 
    marginTop: 12, 
    backgroundColor: '#FFF', 
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  itemName: { fontSize: 15, fontWeight: '600', color: '#1E293B' },
  itemSku: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  itemPrice: { fontSize: 14, fontWeight: '500', color: '#64748B' },
  divider: { marginVertical: 12, backgroundColor: '#F1F5F9', height: 1 },
  itemFooter: { gap: 12 },
  
  // Discount
  discountBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#F0F7FF', 
    alignSelf: 'flex-start',
    paddingRight: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E7FF'
  },
  discountText: { color: '#0066FF', fontSize: 12, fontWeight: '600' },

  // Quantity & Total
  controls: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  quantityBox: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#F8FAFC', 
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1'
  },
  qtyBtn: { width: 40, height: 36, justifyContent: 'center', alignItems: 'center' },
  qtyBtnText: { fontSize: 22, color: '#475569', fontWeight: '400' },
  qtyValueContainer: { 
    borderLeftWidth: 1, 
    borderRightWidth: 1, 
    borderColor: '#CBD5E1', 
    paddingHorizontal: 12,
    height: 36,
    justifyContent: 'center'
  },
  quantityText: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
  lineTotalText: { fontSize: 16, fontWeight: '700', color: '#0F172A' },

  // Footer
  footer: { 
    padding: 20, 
    backgroundColor: '#FFF', 
    borderTopLeftRadius: 24, 
    borderTopRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  summaryBox: { marginBottom: 16 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  summaryLabel: { color: '#64748B', fontSize: 14 },
  summaryValue: { fontWeight: '600', color: '#334155' },
  totalLabel: { fontSize: 16, fontWeight: '600', color: '#0F172A' },
  totalValue: { fontSize: 22, fontWeight: '800', color: '#0066FF' },
  paymentBtn: { borderRadius: 12 }
});