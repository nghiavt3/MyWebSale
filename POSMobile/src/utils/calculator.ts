// src/utils/calculator.ts

/**
 * Tính tổng tiền cho một dòng sản phẩm
 * @param quantity Số lượng (number)
 * @param price Đơn giá (number)
 * @param lineDiscValue Giá trị chiết khấu (number)
 * @param lineDiscType Loại chiết khấu ('%' hoặc 'VND')
 */
export const calculateLineTotal = (
    quantity: number, 
    price: number, 
    lineDiscValue: number, 
    lineDiscType: string | '%' | 'VND'
): number => {
    const q = Number(quantity) || 0;
    const p = Number(price) || 0;
    const v = Number(lineDiscValue) || 0;
    const subTotal = q * p;
    let total = 0;

    if (lineDiscType === '%') {
        total = subTotal - (p * (v / 100)) * q;
    } else {
        total = subTotal - (v * q);
    }
    
    return Math.round(total);
};

export const formatVND = (amount: number): string => {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
    }).format(amount);
};