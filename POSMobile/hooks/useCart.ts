import { useState } from 'react';
import { calculateLineTotal } from '../src/utils/calculator';

export interface CartItem {
  sku: string;
  name: string;
  master_name?: string;
  sale_price: number;
  quantity: number;
  lineDiscountValue: number;
  lineDiscountType: 'VND' | '%';
  total: number;
  image?: string;
}

export const useCart = () => {
  const [selectedItems, setSelectedItems] = useState<CartItem[]>([]);

  // HÀM THÊM VÀO GIỎ HÀNG (Cần thêm đoạn này)
  const addToCart = (product: any) => {
    setSelectedItems((prev) => {
      const existingItem = prev.find((item) => item.sku === product.sku);

      if (existingItem) {
        // Nếu đã có, tăng số lượng và tính lại tổng tiền dòng đó
        return prev.map((item) =>
          item.sku === product.sku
            ? {
                ...item,
                quantity: item.quantity + 1,
                total: calculateLineTotal(
                  item.quantity + 1,
                  item.sale_price,
                  item.lineDiscountValue,
                  item.lineDiscountType
                ),
              }
            : item
        );
      }

      // Nếu chưa có, thêm mới vào đầu danh sách
      const newItem: CartItem = {
        sku: product.sku,
        name: product.name,
        master_name: product.master_name,
        sale_price: product.sale_price,
        quantity: 1,
        lineDiscountValue: 0,
        lineDiscountType: 'VND',
        total: product.sale_price, // 1 * sale_price
        image: product.image
      };
      return [newItem, ...prev];
    });
  };

  const updateQuantity = (sku: string, newQty: number) => {
    setSelectedItems((prev) =>
      prev.map((item) =>
        item.sku === sku
          ? {
              ...item,
              quantity: newQty,
              total: calculateLineTotal(
                newQty,
                item.sale_price,
                item.lineDiscountValue,
                item.lineDiscountType
              ),
            }
          : item
      )
    );
  };

  // QUAN TRỌNG: Phải liệt kê addToCart ở đây
  return { 
    selectedItems, 
    addToCart, // <--- Thêm dòng này
    updateQuantity, 
    setSelectedItems 
  };
};