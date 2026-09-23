
CREATE TABLE products (
    id INT PRIMARY KEY AUTO_INCREMENT,
    category_name VARCHAR(255),           
    master_name VARCHAR(255) NOT NULL,    
    brand VARCHAR(100),                   
    base_unit VARCHAR(50),                
    total_stock DECIMAL(15, 3) DEFAULT 0, 
    weight DECIMAL(15, 2) DEFAULT 0,      
    is_active TINYINT DEFAULT 1
);


CREATE TABLE product_units (
    id INT PRIMARY KEY AUTO_INCREMENT,
    product_id INT,                       
    sku VARCHAR(50) UNIQUE NOT NULL,      
    unit_name VARCHAR(50),                
    exchange_value DECIMAL(15, 3) DEFAULT 1,
    sale_price DECIMAL(15, 2) DEFAULT 0,  
    cost_price DECIMAL(15, 2) DEFAULT 0,  
    is_base_unit TINYINT DEFAULT 0,       
    image_url TEXT,                       
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);



CREATE TABLE customer_groups (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL, 
    discount_percent DECIMAL(5,2) DEFAULT 0, 
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE customers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    group_id INT,
    customer_code VARCHAR(20) UNIQUE,
    name VARCHAR(150) NOT NULL,
    phone VARCHAR(15) UNIQUE NOT NULL,
    email VARCHAR(100),
    address TEXT,
    birthday DATE,
    gender ENUM('male', 'female', 'other'),
    total_debt DECIMAL(15,2) DEFAULT 0, 
    total_spent DECIMAL(15,2) DEFAULT 0, 
    note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (group_id) REFERENCES customer_groups(id)
);

INSERT INTO customer_groups (id, name, discount_percent) VALUES (1, 'Khách lẻ', 0);
INSERT INTO customer_groups (id, name, discount_percent) VALUES (2, 'Khách VIP', 5.0);
INSERT INTO customer_groups (id, name, discount_percent) VALUES (3, 'Đại lý', 8.0);



CREATE TABLE invoices (
    id INT PRIMARY KEY AUTO_INCREMENT,
    invoice_code VARCHAR(20) UNIQUE, 
    customer_id INT,
    total_amount DECIMAL(15,2), 
    discount_value DECIMAL(15,2) DEFAULT 0,
    discount_type ENUM('VND', '%') DEFAULT 'VND',
    final_amount DECIMAL(15,2), 
    customer_pay DECIMAL(15,2), 
    change_amount DECIMAL(15,2),
    note TEXT,
    status ENUM('completed', 'draft', 'cancelled') DEFAULT 'completed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id)
);


CREATE TABLE invoice_details (
    id INT PRIMARY KEY AUTO_INCREMENT,
    invoice_id INT,
    product_sku VARCHAR(50),
    quantity DECIMAL(10,2),
    sale_price DECIMAL(15,2), 
    line_discount_value DECIMAL(15,2) DEFAULT 0,
    line_discount_type ENUM('VND', '%') DEFAULT 'VND',
    line_total DECIMAL(15,2),
    FOREIGN KEY (invoice_id) REFERENCES invoices(id)
);


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



CREATE TABLE suppliers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    supplier_name VARCHAR(255) NOT NULL,   
    supplier_code VARCHAR(50) UNIQUE,      
    phone VARCHAR(15),                     
    address TEXT,                          
    email VARCHAR(100),                    
    current_debt DECIMAL(15, 2) DEFAULT 0, 
    is_active TINYINT DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE purchase_orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    po_code VARCHAR(20) UNIQUE, 
    supplier_id INT,
    total_amount DECIMAL(15,2), 
    discount_value DECIMAL(15,2),
    discount_type ENUM('VND', '%'),
    final_amount DECIMAL(15,2), 
    note TEXT,
    status ENUM('draft', 'completed'), 
    created_by VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
);


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
    
    
    reference_id INT,               
    reference_code VARCHAR(50),     
    
    
    type ENUM('PURCHASE', 'PAYMENT', 'RETURN', 'ADJUSTMENT') NOT NULL, 
    

    
    before_debt DECIMAL(15, 2),    
    change_amount DECIMAL(15, 2),  
    after_debt DECIMAL(15, 2),     
    
    note TEXT,                      
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_debt_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE
);


CREATE TABLE payment_vouchers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    
    
    payment_code VARCHAR(50) NOT NULL UNIQUE,
    
    
    supplier_id INT NOT NULL,
    
    
    amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
    
   
    payment_method ENUM('cash', 'transfer') NOT NULL DEFAULT 'cash',
    
   
    payment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    
   
    note TEXT,
    
    
    created_by INT, 
    
    
    status ENUM('completed', 'cancelled') DEFAULT 'completed',

    
    CONSTRAINT fk_payment_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE INDEX idx_payment_code ON payment_vouchers(payment_code);
CREATE INDEX idx_payment_date ON payment_vouchers(payment_date);


CREATE TABLE return_invoices (
    id INT PRIMARY KEY AUTO_INCREMENT,
    return_code VARCHAR(20) UNIQUE,        
    invoice_id INT,                       
    customer_id INT,
    total_amount DECIMAL(15,2),           
    discount_value DECIMAL(15,2) DEFAULT 0,
    return_fee DECIMAL(15,2) DEFAULT 0,    
    final_refund DECIMAL(15,2),           
    payment_method ENUM('cash', 'transfer', 'debt') DEFAULT 'cash',
    note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id)
);


CREATE TABLE return_invoice_details (
    id INT PRIMARY KEY AUTO_INCREMENT,
    return_id INT,
    product_sku VARCHAR(50),             
    quantity DECIMAL(10,2),              
    return_price DECIMAL(15,2),          
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
    system_stock_at_time DECIMAL(15,3),
    actual_stock_at_time DECIMAL(15,3),
    adjustment_qty DECIMAL(15,3),      
    unit_name_checked VARCHAR(50),     
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