import React, { createContext, useContext, useState } from 'react';
import { calculateLineTotal } from '../src/utils/calculator';

const CartContext = createContext<any>(null);
// 1. Định nghĩa cấu trúc item trong giỏ hàng
interface CartItem {
    product_id: number;
    sku: string;
    master_name: string;
    sale_price: number;
    quantity: number;
    lineDiscountValue?: number;
    lineDiscountType?: string;
    total?: number;
    [key: string]: any; // Cho phép các trường bổ sung khác
}
export function CartProvider({ children }: { children: React.ReactNode }) {
    const [selectedItems, setSelectedItems] = useState<CartItem[]>([]);

    const addToCart = (product: any) => {
        setSelectedItems((prev) => {
            // Kiểm tra xem SKU này đã có trong giỏ chưa
            const existingIndex = prev.findIndex((item) => item.sku === product.sku);

            if (existingIndex > -1) {
                // Nếu có rồi, chỉ tăng số lượng
                const newItems = [...prev];
                const item = newItems[existingIndex];
                const newQty = (item.quantity || 1) + 1;

                newItems[existingIndex] = {
                    ...item,
                    quantity: newQty,
                    // Tính lại tổng tiền của dòng đó
                    total: newQty * (Number(item.sale_price) || 0)
                };
                return newItems;
            } else {
                // Nếu chưa có, thêm mới với quantity = 1
                return [...prev, { ...product, quantity: 1, total: parseFloat(product.sale_price) }];
            }
        });
    };

    const updateQuantity = (sku: string, newQty: number) => {
        if (newQty <= 0) {
            setSelectedItems((prev: any) => prev.filter((item: any) => item.sku !== sku));
            return;
        }
        setSelectedItems((prev: any) => prev.map((item: any) =>
            item.sku === sku ? { ...item, quantity: newQty, total: calculateLineTotal(newQty, item.sale_price, item.lineDiscountValue, item.lineDiscountType) } : item
        ));
    };

    return (
        <CartContext.Provider value={{ selectedItems, addToCart, updateQuantity, setSelectedItems }}>
            {children}
        </CartContext.Provider>
    );
}

export const useCart = () => useContext(CartContext);