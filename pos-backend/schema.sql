-- CREATE DATABASE IF NOT EXISTS my_pos_kiotviet;
-- USE my_pos_kiotviet;

-- 1. Bảng Sản phẩm gốc (Thông tin chung)
CREATE TABLE products (
    id INT PRIMARY KEY AUTO_INCREMENT,
    category_name VARCHAR(255),           -- Nhóm hàng
    master_name VARCHAR(255) NOT NULL,    -- Tên hàng dùng chung
    brand VARCHAR(100),                   -- Thương hiệu
    base_unit VARCHAR(50),                -- Đơn vị nhỏ nhất (mét, cái...)
    total_stock DECIMAL(15, 3) DEFAULT 0, -- Tồn kho (Dùng DECIMAL vì có số lẻ như 0.167)
    weight DECIMAL(15, 2) DEFAULT 0,      -- Trọng lượng
    is_active TINYINT DEFAULT 1
);

-- 2. Bảng Đơn vị tính & Mã hàng (Chi tiết từng cách bán)
CREATE TABLE product_units (
    id INT PRIMARY KEY AUTO_INCREMENT,
    product_id INT,                       -- Nối với bảng products
    sku VARCHAR(50) UNIQUE NOT NULL,      -- Mã hàng (SP001312, SP000004...)
    unit_name VARCHAR(50),                -- Tên ĐVT (cuộn, mét...)
    exchange_value DECIMAL(15, 3) DEFAULT 1, -- Giá trị quy đổi (Ví dụ: 100)
    sale_price DECIMAL(15, 2) DEFAULT 0,  -- Giá bán
    cost_price DECIMAL(15, 2) DEFAULT 0,  -- Giá vốn
    is_base_unit TINYINT DEFAULT 0,       -- 1: Gốc, 0: Quy đổi
    image_url TEXT,                       -- Lưu link ảnh từ KiotViet
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- 3. Bảng Khách hàng
-- 1. Bảng Nhóm khách hàng
CREATE TABLE customer_groups (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL, -- Ví dụ: Khách lẻ, Khách VIP, Đại lý
    discount_percent DECIMAL(5,2) DEFAULT 0, -- Tự động giảm % cho nhóm này
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Bảng Khách hàng
CREATE TABLE customers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    group_id INT,
    customer_code VARCHAR(20) UNIQUE, -- Mã KH (Ví dụ: KH0001)
    name VARCHAR(150) NOT NULL,
    phone VARCHAR(15) UNIQUE NOT NULL,
    email VARCHAR(100),
    address TEXT,
    birthday DATE,
    gender ENUM('male', 'female', 'other'),
    total_debt DECIMAL(15,2) DEFAULT 0, -- Nợ cần thu từ khách
    total_spent DECIMAL(15,2) DEFAULT 0, -- Tổng tiền đã mua hàng (để xét hạng VIP)
    note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (group_id) REFERENCES customer_groups(id)
);
-- Tạo dữ liệu nhóm mặc định
INSERT INTO customer_groups (id, name, discount_percent) VALUES (1, 'Khách lẻ', 0);
INSERT INTO customer_groups (id, name, discount_percent) VALUES (2, 'Khách VIP', 5.0);
INSERT INTO customer_groups (id, name, discount_percent) VALUES (3, 'Đại lý', 8.0);


-- 1. Bảng Hóa đơn bán hàng
CREATE TABLE invoices (
    id INT PRIMARY KEY AUTO_INCREMENT,
    invoice_code VARCHAR(20) UNIQUE, -- Ví dụ: HD0203260001
    customer_id INT,
    total_amount DECIMAL(15,2), -- Tổng tiền trước giảm giá
    discount_value DECIMAL(15,2) DEFAULT 0,
    discount_type ENUM('VND', '%') DEFAULT 'VND',
    final_amount DECIMAL(15,2), -- Tiền khách phải trả
    customer_pay DECIMAL(15,2), -- Tiền khách đưa thực tế
    change_amount DECIMAL(15,2), -- Tiền thừa trả khách
    note TEXT,
    status ENUM('completed', 'draft', 'cancelled') DEFAULT 'completed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id)
);

-- 2. Bảng Chi tiết hóa đơn
CREATE TABLE invoice_details (
    id INT PRIMARY KEY AUTO_INCREMENT,
    invoice_id INT,
    product_sku VARCHAR(50),
    quantity DECIMAL(10,2),
    sale_price DECIMAL(15,2), -- Giá bán tại thời điểm đó
    line_discount_value DECIMAL(15,2) DEFAULT 0,
    line_discount_type ENUM('VND', '%') DEFAULT 'VND',
    line_total DECIMAL(15,2),
    FOREIGN KEY (invoice_id) REFERENCES invoices(id)
);

-- 3. Nhật ký công nợ khách hàng (Tương tự debt_logs của NCC)
CREATE TABLE customer_debt_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    customer_id INT,
    invoice_id INT,
    before_debt DECIMAL(15,2),
    change_amount DECIMAL(15,2),
    after_debt DECIMAL(15,2),
    type ENUM('SALE', 'PAYMENT', 'RETURN'),
    note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id)
);


-- 6. Bảng Nhà cung cấp
CREATE TABLE suppliers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    supplier_name VARCHAR(255) NOT NULL,   -- Tên nhà cung cấp (Ví dụ: Công ty A)
    supplier_code VARCHAR(50) UNIQUE,      -- Mã NCC (Ví dụ: NCC001)
    phone VARCHAR(15),                     -- Số điện thoại
    address TEXT,                          -- Địa chỉ
    email VARCHAR(100),                    -- Email liên hệ
    current_debt DECIMAL(15, 2) DEFAULT 0, -- Nợ cần trả hiện tại
    is_active TINYINT DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Bảng Header
CREATE TABLE purchase_orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    po_code VARCHAR(20) UNIQUE, -- Mã phiếu (ví dụ: PN001)
    supplier_id INT,
    total_amount DECIMAL(15,2), -- Tổng tiền hàng trước giảm giá
    discount_value DECIMAL(15,2),
    discount_type ENUM('VND', '%'),
    final_amount DECIMAL(15,2), -- Tiền thực trả
    note TEXT,
    status ENUM('draft', 'completed'), -- Trạng thái
    created_by VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
);

-- Bảng chi tiết
CREATE TABLE purchase_order_details (
    id INT AUTO_INCREMENT PRIMARY KEY,
    po_id INT,
    product_sku VARCHAR(50),
    quantity INT,
    import_price DECIMAL(15,2),
    line_discount_value DECIMAL(15,2),
    line_discount_type ENUM('VND', '%'),
    line_total DECIMAL(15,2),
    FOREIGN KEY (po_id) REFERENCES purchase_orders(id)
);


CREATE TABLE debt_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    supplier_id INT NOT NULL,
    
    -- Liên kết với các bảng nghiệp vụ khác
    reference_id INT,               -- ID của phiếu nhập hoặc phiếu chi
    reference_code VARCHAR(50),     -- Mã hiển thị (PN001, PC001) để hiển thị nhanh
    
    -- Loại giao dịch
    type ENUM('PURCHASE', 'PAYMENT', 'RETURN', 'ADJUSTMENT') NOT NULL, 
    -- PURCHASE: Nhập hàng (Tăng nợ)
    -- PAYMENT: Thanh toán (Giảm nợ)
    -- RETURN: Trả hàng (Giảm nợ)
    -- ADJUSTMENT: Điều chỉnh nợ (Tùy chỉnh thủ công)

    -- Số liệu tài chính
    before_debt DECIMAL(15, 2),     -- Nợ trước khi giao dịch
    change_amount DECIMAL(15, 2),   -- Số tiền tăng/giảm (luôn lưu số dương)
    after_debt DECIMAL(15, 2),      -- Nợ sau khi giao dịch (Phải khớp với logic tính toán)
    
    note TEXT,                      -- Ghi chú chi tiết
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_debt_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE
);


CREATE TABLE payment_vouchers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    
    -- Mã phiếu chi (Ví dụ: PC202403010001)
    payment_code VARCHAR(50) NOT NULL UNIQUE,
    
    -- Liên kết nhà cung cấp
    supplier_id INT NOT NULL,
    
    -- Số tiền thanh toán
    amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
    
    -- Phương thức thanh toán: cash (Tiền mặt), transfer (Chuyển khoản)
    payment_method ENUM('cash', 'transfer') NOT NULL DEFAULT 'cash',
    
    -- Ngày lập phiếu (Mặc định là thời điểm tạo)
    payment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- Ghi chú chi tiết (Ví dụ: Thanh toán đợt 1 đơn hàng PO001)
    note TEXT,
    
    -- Người lập phiếu (Nếu hệ thống của bạn có bảng users/staffs)
    created_by INT, 
    
    -- Trạng thái phiếu (Nếu cần quy trình duyệt)
    status ENUM('completed', 'cancelled') DEFAULT 'completed',

    -- Các ràng buộc dữ liệu
    CONSTRAINT fk_payment_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Thêm index để tìm kiếm nhanh theo mã và ngày tháng
CREATE INDEX idx_payment_code ON payment_vouchers(payment_code);
CREATE INDEX idx_payment_date ON payment_vouchers(payment_date);

-- 1. Bảng Phiếu trả hàng (Header)
CREATE TABLE return_invoices (
    id INT PRIMARY KEY AUTO_INCREMENT,
    return_code VARCHAR(20) UNIQUE,        -- Ví dụ: TH0303260001
    invoice_id INT,                       -- Liên kết với hóa đơn gốc (nếu có)
    customer_id INT,
    total_amount DECIMAL(15,2),           -- Tổng tiền hàng trả lại
    discount_value DECIMAL(15,2) DEFAULT 0, -- Giảm giá thêm trên phiếu trả
    return_fee DECIMAL(15,2) DEFAULT 0,    -- Phí trả hàng (cửa hàng thu khách)
    final_refund DECIMAL(15,2),           -- Tiền thực tế hoàn cho khách
    payment_method ENUM('cash', 'transfer', 'debt') DEFAULT 'cash',
    note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id)
);

-- 2. Bảng Chi tiết phiếu trả hàng
CREATE TABLE return_invoice_details (
    id INT PRIMARY KEY AUTO_INCREMENT,
    return_id INT,
    product_sku VARCHAR(50),              -- SKU của đơn vị quy đổi khách trả
    quantity DECIMAL(10,2),               -- Số lượng khách trả (theo ĐVT của SKU đó)
    return_price DECIMAL(15,2),           -- Giá hoàn lại của 1 đơn vị đó
    line_total DECIMAL(15,2),
    FOREIGN KEY (return_id) REFERENCES return_invoices(id)
);

CREATE TABLE stock_audits (
    id INT PRIMARY KEY AUTO_INCREMENT,
    audit_code VARCHAR(20) UNIQUE,
    note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE stock_audit_details (
    id INT PRIMARY KEY AUTO_INCREMENT,
    audit_id INT,
    product_id INT,
    sku VARCHAR(50),
    system_stock_at_time DECIMAL(15,3), -- Tồn máy lúc kiểm (quy gốc)
    actual_stock_at_time DECIMAL(15,3), -- Tồn thực tế (quy gốc)
    adjustment_qty DECIMAL(15,3),       -- Lệch (quy gốc)
    unit_name_checked VARCHAR(50),      -- Đơn vị lúc nhân viên đếm (Cuộn/Mét)
    FOREIGN KEY (audit_id) REFERENCES stock_audits(id)
);


CREATE TABLE purchase_order_images (
    id INT AUTO_INCREMENT PRIMARY KEY,
    po_id INT NOT NULL,
    image_url VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (po_id) REFERENCES purchase_orders(id) ON DELETE CASCADE
);

CREATE TABLE purchase_order_images (
    id INT AUTO_INCREMENT PRIMARY KEY,
    po_id INT NOT NULL,
    image_url VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (po_id) REFERENCES purchase_orders(id) ON DELETE CASCADE
);

CREATE INDEX idx_pod_sku ON purchase_order_details(product_sku);
CREATE INDEX idx_id_sku ON invoice_details(product_sku);
CREATE INDEX idx_rid_sku ON return_invoice_details(product_sku);
CREATE INDEX idx_sad_sku ON stock_audit_details(sku);

ALTER TABLE invoice_details 
ADD COLUMN cost_price DECIMAL(15, 2) DEFAULT 0.00 AFTER sale_price;