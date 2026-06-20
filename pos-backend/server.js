const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
// Import pool và hàm safeQuery từ file database.js
const { pool, safeQuery } = require('./database');
const initializeDatabase = require('./init_db');

const app = express();
app.use(cors());
app.use(express.json());
//app.use(express.static(path.join(__dirname, '../pos-web/build')));
app.use(express.static(path.join(__dirname, 'build')));

const multer = require('multer');
//const path = require('path');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'pos-backend/uploads/purchase_orders/'); // Đảm bảo thư mục này đã tồn tại
    },
    filename: function (req, file, cb) {
        // Lấy phần mở rộng gốc (vd: .png) từ file.originalname
        const ext = path.extname(file.originalname);
        // Tạo tên file duy nhất kết hợp với đuôi mở rộng
        cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + ext);
    }
});

const storageProduct = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'pos-backend/uploads/products/'); // Đảm bảo thư mục này đã tồn tại
    },
    filename: function (req, file, cb) {
        // Lấy phần mở rộng gốc (vd: .png) từ file.originalname
        const ext = path.extname(file.originalname);
        // Tạo tên file duy nhất kết hợp với đuôi mở rộng
        cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + ext);
    }
});

const upload = multer({ storage: storage });
const uploadProduct = multer({ storage: storageProduct });

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Middleware điều hướng cho React Router
app.use((req, res, next) => {
    if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(__dirname, 'build', 'index.html'));
    } else {
        next();
    }
});

// --- CÁC API SỬ DỤNG SAFEQUERY ---

app.get('/api/system/status', async (req, res) => {
    try {
        // Thay vì db.query, dùng safeQuery
        const rows = await safeQuery("SHOW TABLES LIKE 'products'");
        res.json({ isReady: rows.length > 0 });
    } catch (err) {
        res.json({ isReady: false });
    }
});

app.post('/api/system/init', async (req, res) => {
    try {
        await initializeDatabase(pool); // Truyền pool gốc vào để chạy init
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// API lấy danh sách sản phẩm kèm đơn vị tính
app.get('/api/products', async (req, res) => {
    try {
        // Lấy toàn bộ các đơn vị, không lọc WHERE ở đây để React có dữ liệu chuyển đổi
        const products = await safeQuery(`
            SELECT 
                p.id as product_id, 
                p.master_name, 
                p.category_name, 
                p.brand,
                p.total_stock, 
                u.sku, 
                u.unit_name, 
                u.sale_price, 
                u.cost_price, 
                u.image_url,
                u.exchange_value,
                u.is_base_unit, -- PHẢI CÓ CỘT NÀY
                p.weight
            FROM products p
            JOIN product_units u ON p.id = u.product_id
        `);
        res.json(products);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// 1. Lấy danh sách giá theo SKU
app.get('/api/price-management', async (req, res) => {
    try {
        const products = await safeQuery(`
            SELECT 
                u.sku, 
                p.master_name, 
                u.unit_name, 
                u.sale_price, 
                u.cost_price, 
                p.category_name,
                u.exchange_value
            FROM product_units u
            JOIN products p ON u.product_id = p.id
            ORDER BY p.master_name ASC
        `);
        res.json(products);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. Cập nhật giá hàng loạt
app.post('/api/price-management/update', async (req, res) => {
    const { updates } = req.body; // Mảng các object {sku, sale_price, cost_price}
    let connection;
    try {
        connection = await pool.getConnection();
        await connection.query("USE my_pos_kiotviet"); // Ép ngữ cảnh
        await connection.beginTransaction();
        for (const item of updates) {
            await connection.execute(
                "UPDATE product_units SET sale_price = ?, cost_price = ? WHERE sku = ?",
                [item.sale_price, item.cost_price, item.sku]
            );
        }
        await connection.commit();
        res.json({ success: true, message: "Cập nhật giá thành công" });
    } catch (err) {
        await connection.rollback();
        res.status(500).json({ error: err.message });
    } finally {
        connection.release();
    }
});

app.get('/api/dashboard/stats', async (req, res) => {
    const { startDate, endDate } = req.query;

    try {
        // 1. Tổng doanh thu (Doanh số bán ra chưa trừ trả hàng)
        const salesData = await safeQuery(`
            SELECT ROUND(IFNULL(SUM(final_amount), 0), 0) as total_sales 
            FROM invoices 
            WHERE status = 'completed' AND created_at BETWEEN ? AND ?`, [startDate, endDate]);

        // 2. Tổng giá trị hàng trả lại
        const returnsData = await safeQuery(`
            SELECT ROUND(IFNULL(SUM(final_refund), 0), 0) as total_returns 
            FROM return_invoices 
            WHERE created_at BETWEEN ? AND ?`, [startDate, endDate]);

        // 3. Tổng giá vốn hàng bán (COGS)
        // Dùng cost_price lưu trực tiếp trong invoice_details
        // Truy vấn này cực nhanh vì không cần JOIN với bảng sản phẩm/đơn vị nữa
        const costsData = await safeQuery(`
            SELECT ROUND(IFNULL(SUM(d.quantity * d.cost_price), 0), 0) as total_cost
            FROM invoice_details d
            JOIN invoices i ON d.invoice_id = i.id
            WHERE i.status = 'completed' AND i.created_at BETWEEN ? AND ?`, [startDate, endDate]);

        const totalSales = (salesData[0]?.total_sales || 0);
        const totalReturns = (returnsData[0]?.total_returns || 0);
        const totalCost = (costsData[0]?.total_cost || 0);

        // Revenue (Doanh thu thuần) = Doanh số - Hàng trả lại
        const netRevenue = totalSales - totalReturns;

        // Profit (Lợi nhuận gộp) = Doanh thu thuần - Giá vốn
        const grossProfit = netRevenue - totalCost;

        res.json({
            revenue: netRevenue,
            cost: totalCost,
            profit: grossProfit,
            returnAmount: totalReturns
        });
    } catch (err) {
        console.error("Lỗi API Dashboard:", err);
        res.status(500).json({ error: "Lỗi hệ thống khi thống kê dashboard" });
    }
});

app.post('/api/stock-audits', async (req, res) => {
    const { items, note } = req.body;
    let connection;
    try {
        connection = await pool.getConnection();
        await connection.query("USE my_pos_kiotviet"); // Ép ngữ cảnh
        await connection.beginTransaction();

        // 1. Tạo Header phiếu kiểm
        const auditCode = `PK${Date.now()}`;
        const [auditRes] = await connection.execute(
            "INSERT INTO stock_audits (audit_code, note) VALUES (?, ?)",
            [auditCode, note || '']
        );
        const auditId = auditRes.insertId;

        for (const item of items) {
            // QUY ĐỔI VỀ ĐƠN VỊ GỐC TRƯỚC KHI LƯU
            // actual_qty_input là số lượng nhân viên đếm được (ví dụ: 2 cuộn)
            // exchange_value là hệ số (ví dụ: 100)
            const actualStockBase = item.actual_qty_input * item.exchange_value;
            const systemStockBase = item.total_stock; // total_stock này đã là đơn vị gốc
            const adjustment = actualStockBase - systemStockBase;

            // 2. Lưu chi tiết phiếu kiểm để tra cứu sau này
            await connection.execute(
                `INSERT INTO stock_audit_details 
                (audit_id, product_id, sku, system_stock_at_time, actual_stock_at_time, adjustment_qty, unit_name_checked) 
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [auditId, item.product_id, item.sku, systemStockBase, actualStockBase, adjustment, item.unit_name]
            );

            // 3. Cập nhật lại bảng products (Kho thực tế luôn ghi đè lên kho máy)
            await connection.execute(
                "UPDATE products SET total_stock = ? WHERE id = ?",
                [actualStockBase, item.product_id]
            );
        }

        await connection.commit();
        res.json({ success: true, code: auditCode });
    } catch (err) {
        await connection.rollback();
        res.status(500).json({ error: err.message });
    } finally {
        connection.release();
    }
});
app.put('/api/suppliers/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { supplier_name, supplier_code, phone, address, email, is_active } = req.body;

        // 1. Kiểm tra Nhà cung cấp có tồn tại không
        const existing = await safeQuery('SELECT id FROM suppliers WHERE id = ?', [id]);
        if (existing.length === 0) {
            return res.status(404).json({ success: false, error: "Không tìm thấy nhà cung cấp" });
        }

        // 2. Kiểm tra trùng mã NCC (nếu người dùng thay đổi mã)
        if (supplier_code) {
            const codeCheck = await safeQuery(
                'SELECT id FROM suppliers WHERE supplier_code = ? AND id != ?',
                [supplier_code, id]
            );
            if (codeCheck.length > 0) {
                return res.status(400).json({ success: false, error: "Mã nhà cung cấp này đã tồn tại" });
            }
        }

        // 3. Thực thi cập nhật
        // Sử dụng COALESCE để giữ lại giá trị cũ nếu trường đó không được gửi lên từ React
        const sql = `
            UPDATE suppliers 
            SET 
                supplier_name = ?, 
                supplier_code = ?, 
                phone = ?, 
                address = ?, 
                email = ?, 
                is_active = ?
            WHERE id = ?
        `;

        const params = [
            supplier_name,
            supplier_code || null,
            phone || null,
            address || null,
            email || null,
            is_active !== undefined ? is_active : 1,
            id
        ];

        await safeQuery(sql, params);

        // 4. Lấy lại dữ liệu sau khi cập nhật để trả về cho Frontend (giúp UI cập nhật ngay)
        const updatedSupplier = await safeQuery('SELECT * FROM suppliers WHERE id = ?', [id]);

        res.json({
            success: true,
            message: "Cập nhật thành công",
            data: updatedSupplier[0]
        });

    } catch (error) {
        console.error("Error updating supplier:", error);
        res.status(500).json({ success: false, error: "Lỗi hệ thống khi cập nhật" });
    }
});
// 2. API CHỈNH SỬA (UPDATE)
// API Cập nhật (PUT)
// --- CẬP NHẬT SẢN PHẨM ---
app.put('/api/products/:id', uploadProduct.any(), async (req, res) => {
    const productId = req.params.id;
    const data = JSON.parse(req.body.data);
    const { master_name, category_name, brand, total_stock, units } = data;
    const files = req.files;

    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        // 1. Update thông tin chung
        await connection.execute(
            "UPDATE products SET master_name = ?, category_name = ?, brand = ?, total_stock = ? WHERE id = ?",
            [master_name, category_name, brand, total_stock, productId]
        );

        // 2. Update từng đơn vị tính
        for (let i = 0; i < units.length; i++) {
            const unit = units[i];
            const file = files.find(f => f.fieldname === `image_${unit.sku}`);

            if (file) {
                // Nếu có ảnh mới, update cả image_url
                const imageUrl = `/uploads/products/${file.filename}`;
                await connection.execute(
                    "UPDATE product_units SET sale_price = ?, cost_price = ?, image_url = ? WHERE sku = ?",
                    [unit.sale_price, unit.cost_price, imageUrl, unit.sku]
                );
            } else {
                // Chỉ update giá
                await connection.execute(
                    "UPDATE product_units SET sale_price = ?, cost_price = ? WHERE sku = ?",
                    [unit.sale_price, unit.cost_price, unit.sku]
                );
            }
        }

        await connection.commit();
        res.json({ message: "Cập nhật thành công" });
    } catch (err) {
        if (connection) await connection.rollback();
        res.status(500).json({ error: err.message });
    } finally {
        connection.release();
    }
});

// 3. API XÓA (DELETE)
app.delete('/api/products/:id', async (req, res) => {
    const productId = req.params.id;
    try {
        // Vì có khóa ngoại (Foreign Key), ta nên xóa ở bảng product_units trước 
        // hoặc để ON DELETE CASCADE trong database.
        await safeQuery("DELETE FROM product_units WHERE product_id = ?", [productId]);
        await safeQuery("DELETE FROM products WHERE id = ?", [productId]);

        res.json({ message: "Xóa sản phẩm thành công" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/products', uploadProduct.any(), async (req, res) => {
    const data = JSON.parse(req.body.data);
    const { master_name, category_name, brand, total_stock, units } = data;
    const files = req.files; // Danh sách file ảnh đã upload

    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        // 1. Chèn sản phẩm cha
        const [prodResult] = await connection.execute(
            "INSERT INTO products (master_name, category_name, brand, total_stock) VALUES (?, ?, ?, ?)",
            [master_name || '', category_name || '', brand || '', total_stock || 0]
        );
        const newProductId = prodResult.insertId;

        // 2. Chèn danh sách đơn vị
        for (let i = 0; i < units.length; i++) {
            const unit = units[i];
            const finalSku = unit.sku || `SP${newProductId}${Math.floor(Math.random() * 1000)}`;

            // Tìm file ảnh tương ứng với đơn vị này (nếu có)
            // Giả sử bạn gửi kèm key 'image_i' trong FormData
            const file = files.find(f => f.fieldname === `image_${unit.sku}`);
            if (file) {
                const imageUrl = `/uploads/products/${file.filename}`;
                // Thực hiện Update/Insert với imageUrl này
                // Đừng quên: Nếu là PUT, nhớ xóa file cũ tại đây như tôi đã hướng dẫn trước đó!
                await connection.execute(
                    `INSERT INTO product_units (product_id, sku, unit_name, sale_price, cost_price, is_base_unit, exchange_value, image_url) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    [newProductId, finalSku, unit.unit_name, unit.sale_price || 0, unit.cost_price || 0, unit.is_base_unit ? 1 : 0, unit.exchange_value || 1, imageUrl]
                );
            } else {
                await connection.execute(
                    `INSERT INTO product_units (product_id, sku, unit_name, sale_price, cost_price, is_base_unit, exchange_value, image_url) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    [newProductId, finalSku, unit.unit_name, unit.sale_price || 0, unit.cost_price || 0, unit.is_base_unit ? 1 : 0, unit.exchange_value || 1, '']
                );
            }



        }

        await connection.commit();
        res.status(201).json({ message: "Thêm thành công" });
    } catch (err) {
        if (connection) await connection.rollback();
        res.status(500).json({ error: err.message });
    } finally {
        if (connection) connection.release();
    }
});


app.get('/api/suppliers', async (req, res) => {
    try {
        const suppliers = await safeQuery(`
            SELECT id, supplier_name, supplier_code, phone, address, email, current_debt 
            FROM suppliers WHERE is_active = 1
        `);
        res.json(suppliers);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/customers', async (req, res) => {
    try {
        const query = `
            SELECT c.*, g.name as group_name 
            FROM customers c
            LEFT JOIN customer_groups g ON c.group_id = g.id
            ORDER BY c.created_at DESC
        `;
        const customers = await safeQuery(query);
        res.status(200).json(customers);
    } catch (err) {
        console.error("Lỗi lấy danh sách khách hàng:", err);
        res.status(500).json({ message: "Lỗi hệ thống khi tải khách hàng" });
    }
});

app.post('/api/customers', async (req, res) => {
    const { name, phone, email, address, birthday, group_id, note } = req.body;

    if (!name || !phone) {
        return res.status(400).json({ message: "Tên và Số điện thoại là bắt buộc" });
    }

    try {
        // 1. Kiểm tra tồn tại
        const existing = await safeQuery('SELECT id FROM customers WHERE phone = ?', [phone]);
        if (existing && existing.length > 0) {
            return res.status(400).json({ message: "Số điện thoại này đã được đăng ký" });
        }

        // 2. Insert trước để lấy ID (Cách này an toàn hơn)
        const insertQuery = `
            INSERT INTO customers (name, phone, email, address, birthday, group_id, note)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        const values = [name, phone, email || null, address || null, birthday || null, group_id || 1, note || null];

        const result = await safeQuery(insertQuery, values);
        const newId = result.insertId;

        // 3. Cập nhật mã khách hàng dựa trên ID mới tạo
        const customer_code = `KH${newId.toString().padStart(4, '0')}`;
        await safeQuery('UPDATE customers SET customer_code = ? WHERE id = ?', [customer_code, newId]);

        // 4. Lấy lại thông tin khách hàng đã tạo
        const newCustomerList = await safeQuery('SELECT * FROM customers WHERE id = ?', [newId]);

        res.status(201).json(newCustomerList[0]);

    } catch (err) {
        console.error("Lỗi khi thêm khách hàng:", err);
        res.status(500).json({ message: "Lỗi hệ thống khi lưu khách hàng" });
    }
});
app.put('/api/customers/:id', async (req, res) => {
    const { id } = req.params;
    const { name, phone, email, address, birthday, group_id, note } = req.body;

    if (!name || !phone) {
        return res.status(400).json({ message: "Tên và Số điện thoại là bắt buộc" });
    }

    try {
        // 1. Kiểm tra khách hàng có tồn tại không
        const existingCustomer = await safeQuery('SELECT id FROM customers WHERE id = ?', [id]);
        if (!existingCustomer || existingCustomer.length === 0) {
            return res.status(404).json({ message: "Không tìm thấy khách hàng" });
        }

        // 2. Kiểm tra xem số điện thoại mới có bị trùng với khách hàng khác không
        // (loại trừ chính khách hàng đang cập nhật bằng id)
        const duplicatePhone = await safeQuery(
            'SELECT id FROM customers WHERE phone = ? AND id != ?',
            [phone, id]
        );
        if (duplicatePhone && duplicatePhone.length > 0) {
            return res.status(400).json({ message: "Số điện thoại này đã được sử dụng bởi khách hàng khác" });
        }

        // 3. Thực hiện cập nhật
        const updateQuery = `
            UPDATE customers 
            SET name = ?, phone = ?, email = ?, address = ?, 
                birthday = ?, group_id = ?, note = ?
            WHERE id = ?
        `;
        const values = [name, phone, email || null, address || null, birthday || null, group_id, note || null, id];

        await safeQuery(updateQuery, values);

        // 4. Lấy lại thông tin đã cập nhật để trả về cho Client
        const updatedCustomerList = await safeQuery('SELECT * FROM customers WHERE id = ?', [id]);

        res.status(200).json(updatedCustomerList[0]);

    } catch (err) {
        console.error("Lỗi khi cập nhật khách hàng:", err);
        res.status(500).json({ message: "Lỗi hệ thống khi cập nhật khách hàng" });
    }
});
app.get('/api/suppliers/time_interval', async (req, res) => {
    // 1. Nhận query params và đặt giá trị mặc định
    const startDate = req.query.startDate || '2000-01-01 00:00:00';
    const endDate = req.query.endDate || '2099-12-31 23:59:59';

    // 2. Câu lệnh SQL
    const query = `
        SELECT 
            s.*, 
            COALESCE(SUM(po.final_amount), 0) as total_buy
        FROM suppliers s
        LEFT JOIN purchase_orders po ON s.id = po.supplier_id 
            AND po.status = 'completed'
            AND po.created_at BETWEEN ? AND ?
        WHERE s.is_active = 1
        GROUP BY s.id
    `;

    try {
        // 3. Gọi safeQuery (không dùng destructuring [rows] vì safeQuery đã trả về kết quả)
        const suppliers = await safeQuery(query, [startDate, endDate]);

        res.json(suppliers);
    } catch (err) {
        console.error("Lỗi truy vấn nhà cung cấp:", err.message);
        res.status(500).json({ error: "Lỗi hệ thống khi truy vấn dữ liệu nhà cung cấp" });
    }
});

app.post('/api/suppliers', async (req, res) => {
    const { supplier_name, supplier_code, phone, address } = req.body;
    // Logic tạo mã tự động nếu trống
    const finalCode = supplier_code || `NCC${Date.now().toString().slice(-6)}`;

    try {
        const result = await safeQuery(
            'INSERT INTO suppliers (supplier_name, supplier_code, phone, address) VALUES (?, ?, ?, ?)',
            [supplier_name, finalCode || '', phone || '', address || '']
        );

        // Trả về object NCC để React chọn ngay lập tức
        res.json({
            id: result.insertId,
            supplier_name,
            supplier_code: finalCode,
            phone,
            address,
            current_debt: 0
        });
    } catch (err) {
        console.error("Dữ liệu gửi lên bị lỗi:", err.message);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/products/stock-history/:sku', async (req, res) => {
    const { sku } = req.params;
    let connection;
    try {
        connection = await pool.getConnection();
        await connection.query("USE my_pos_kiotviet");

        // BƯỚC 1: Tìm tất cả các SKU thuộc cùng một sản phẩm gốc với SKU đầu vào
        const [relatedSkus] = await connection.execute(`
            SELECT sku FROM product_units 
            WHERE product_id = (SELECT product_id FROM product_units WHERE sku = ?)
        `, [sku]);

        if (relatedSkus.length === 0) {
            return res.status(404).json({ error: "Không tìm thấy sản phẩm hoặc SKU này." });
        }

        const skuList = relatedSkus.map(item => item.sku);
        // Tạo chuỗi placeholders (?, ?, ?) cho câu query IN
        const placeholders = skuList.map(() => '?').join(',');

        // BƯỚC 2: Truy vấn UNION ALL sử dụng danh sách SKU đã tìm được
        // Chúng ta lặp lại skuList 4 lần cho 4 bảng trong UNION
        const queryParams = [...skuList, ...skuList, ...skuList, ...skuList];

        const query = `
            SELECT * FROM (
                -- 1. Nhập hàng (Dựa trên danh sách SKU liên quan)
                SELECT po.created_at, po.po_code AS reference_code, 'Nhập hàng' AS transaction_type, 
                       pod.quantity AS change_qty, pu.unit_name, po.note
                FROM purchase_orders po
                JOIN purchase_order_details pod ON po.id = pod.po_id
                JOIN product_units pu ON pod.product_sku = pu.sku
                WHERE pod.product_sku IN (${placeholders}) AND po.status = 'completed'

                UNION ALL

                -- 2. Bán hàng
                SELECT i.created_at, i.invoice_code AS reference_code, 'Bán hàng' AS transaction_type, 
                       -id.quantity AS change_qty, pu.unit_name, i.note
                FROM invoices i
                JOIN invoice_details id ON i.id = id.invoice_id
                JOIN product_units pu ON id.product_sku = pu.sku
                WHERE id.product_sku IN (${placeholders}) AND i.status = 'completed'

                UNION ALL

                -- 3. Trả hàng khách
                SELECT ri.created_at, ri.return_code AS reference_code, 'Trả hàng' AS transaction_type, 
                       rid.quantity AS change_qty, pu.unit_name, ri.note
                FROM return_invoices ri
                JOIN return_invoice_details rid ON ri.id = rid.return_id
                JOIN product_units pu ON rid.product_sku = pu.sku
                WHERE rid.product_sku IN (${placeholders})

                UNION ALL

                -- 4. Kiểm kho
                SELECT sa.created_at, sa.audit_code AS reference_code, 'Kiểm kho' AS transaction_type, 
                       sad.adjustment_qty AS change_qty, sad.unit_name_checked AS unit_name, sa.note
                FROM stock_audits sa
                JOIN stock_audit_details sad ON sa.id = sad.audit_id
                WHERE sad.sku IN (${placeholders})
            ) AS stock_history
            ORDER BY created_at DESC;
        `;

        const [history] = await connection.execute(query, queryParams);
        res.json(history);

    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        if (connection) connection.release();
    }
});

// Lấy chi tiết đơn bán hàng
app.get('/api/invoices/code/:code', async (req, res) => {
    try {
        // 1. Lấy thông tin hóa đơn và khách hàng
        const [rows] = await pool.execute(`
            SELECT i.*, c.name as customer_name 
            FROM invoices i 
            LEFT JOIN customers c ON i.customer_id = c.id 
            WHERE i.invoice_code = ?`, [req.params.code]);

        if (rows.length === 0) return res.status(404).json({ error: "Không tìm thấy hóa đơn" });
        const invoice = rows[0];
        // Xử lý dữ liệu trực tiếp trên object invoice
        const result = {
            ...invoice,
            total_amount: Number(invoice.total_amount) || 0,
            discount_value: Number(invoice.discount_value) || 0,
            final_amount: Number(invoice.final_amount) || 0,
        };
        // 2. Lấy chi tiết hóa đơn, JOIN qua product_units rồi tới products để lấy tên
        const [details] = await pool.execute(`
            SELECT id.*, p.master_name as product_name 
            FROM invoice_details id 
            JOIN product_units u ON id.product_sku = u.sku 
            JOIN products p ON u.product_id = p.id 
            WHERE id.invoice_id = ?`, [rows[0].id]);

        const formattedDetails = details.map(item => ({
            ...item,
            quantity: Number(item.quantity) || 0,
            sale_price: Number(item.sale_price) || 0,
            line_discount_value: Number(item.line_discount_value) || 0,
            line_discount_type: Number(item.line_discount_type) || 0,
            line_total: Number(item.line_total) || 0
        }));

        res.json({ ...result, details: formattedDetails });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Lấy chi tiết đơn nhập hàng
app.get('/api/purchase-orders/code/:code', async (req, res) => {
    const [rows] = await pool.execute(`
        SELECT po.*, s.supplier_name, s.address 
        FROM purchase_orders po 
        JOIN suppliers s ON po.supplier_id = s.id 
        WHERE po.po_code = ?`, [req.params.code]);

    if (rows.length === 0) return res.status(404).json({ error: "Không tìm thấy" });

    const [details] = await pool.execute(`
        SELECT pod.*, p.master_name as name, u.cost_price 
        FROM purchase_order_details pod 
        JOIN product_units u ON pod.product_sku = u.sku 
        JOIN products p ON u.product_id = p.id 
        WHERE pod.po_id = ?`, [rows[0].id]);
    const formattedDetails = details.map(item => ({
        ...item,
        quantity: Number(item.quantity) || 0,
        import_price: Number(item.import_price) || 0,
        cost_price: Number(item.import_price) || 0,
        lineDiscountValue: Number(item.line_discount_value) || 0,
        lineDiscountType: Number(item.line_discount_type) || 0,
        total: Number(item.line_total) || 0
    }));
    const [images] = await pool.execute('SELECT image_url FROM purchase_order_images WHERE po_id = ?', [rows[0].id]);

    res.json({ ...rows[0], details: formattedDetails, images: images.map(i => i.image_url) });
});
//fix giá
app.post('/api/import-stock', upload.any(), async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        await connection.query("USE my_pos_kiotviet"); // Ép ngữ cảnh
        await connection.beginTransaction();

        const data = JSON.parse(req.body.data);
        const { po_id, supplier_id, total_amount, discount_value, discount_type, final_amount, note, status, created_at, items } = data;

        const files = req.files;

        let currentPoId = po_id;
        let currentPocode = `PN${Date.now()}`;
        let finalStatus = status;

        if (currentPoId) {
            // 1. Lấy dữ liệu cũ để phục hồi (TRƯỚC KHI XÓA)
            const [oldItems] = await connection.execute('SELECT product_sku, quantity FROM purchase_order_details WHERE po_id = ?', [currentPoId]);
            const [oldPo] = await connection.execute('SELECT final_amount, status FROM purchase_orders WHERE id = ?', [currentPoId]);

            // Nếu phiếu cũ đã hoàn thành, phải hoàn tác kho và nợ
            if (oldPo[0].status === 'completed') {
                for (const item of oldItems) {
                    const [unit] = await connection.execute('SELECT product_id, exchange_value FROM product_units WHERE sku = ?', [item.product_sku]);
                    if (unit.length > 0) {
                        const actualQty = Math.round(item.quantity * unit[0].exchange_value);
                        await connection.execute('UPDATE products SET total_stock = total_stock - ? WHERE id = ?', [actualQty, unit[0].product_id]);
                    }
                }
                await connection.execute('UPDATE suppliers SET current_debt = current_debt - ? WHERE id = ?', [Math.round(oldPo[0].final_amount), supplier_id]);
            }

            // 2. Xóa chi tiết cũ
            await connection.execute('DELETE FROM purchase_order_details WHERE po_id = ?', [currentPoId]);

            // 3. Cập nhật header
            await connection.execute(
                `UPDATE purchase_orders SET supplier_id = ?, total_amount = ?, discount_value = ?, discount_type = ?, final_amount = ?, note = ?, status = ? WHERE id = ?`,
                [supplier_id, Math.round(total_amount), discount_value, discount_type, Math.round(final_amount), note, status, currentPoId]
            );
        } else {
            // Tạo mới
            const [poResult] = await connection.execute(
                `INSERT INTO purchase_orders (po_code, supplier_id, total_amount, discount_value, discount_type, final_amount, note, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?,?)`,
                [currentPocode, supplier_id, Math.round(total_amount), discount_value, discount_type, Math.round(final_amount), note, status, created_at]
            );
            currentPoId = poResult.insertId;

        }

        // 4. Ghi chi tiết và cộng kho/nợ mới
        for (const item of items) {
            await connection.execute(
                `INSERT INTO purchase_order_details (po_id, product_sku, quantity, import_price, line_discount_value, line_discount_type, line_total) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [currentPoId, item.sku, item.quantity, item.cost_price, item.lineDiscountValue || 0, item.lineDiscountType || 'VND', Math.round(item.total)]
            );

            if (status === 'completed') {
                // 1. Lấy thông tin đơn vị, giá vốn hiện tại và tồn kho hiện tại
                const [unitData] = await connection.execute(`
        SELECT u.product_id, u.exchange_value, u.cost_price as current_unit_cost, p.total_stock 
        FROM product_units u
        JOIN products p ON u.product_id = p.id
        WHERE u.sku = ?`, [item.sku]);

                if (unitData.length > 0) {
                    const { product_id, exchange_value, current_unit_cost, total_stock } = unitData[0];

                    const importQtyBase = item.quantity * exchange_value;

                    // TÍNH TOÁN GIÁ NHẬP THỰC TẾ (Phân bổ giảm giá HD nếu có)
                    // Giả sử: item.total là giá trị TRƯỚC khi giảm giá tổng hóa đơn

                    const totalBeforeTax = parseFloat(data.total_amount) || 1;
                    let discountRatio = 0
                    if (data.discount_type === '%') {

                        discountRatio = parseFloat(data.discount_value) / 100;

                    }
                    else {

                        discountRatio = parseFloat(data.discount_value || 0) / totalBeforeTax;
                    }


                    // Giá trị nhập thực tế của dòng này sau khi phân bổ giảm giá tổng

                    const realImportTotalValue = item.total * (1 - discountRatio);

                    const importPricePerUnit = realImportTotalValue / item.quantity;

                    let newCostPrice = importPricePerUnit;
                    let newBaseCost = 0;
                    // Chỉ tính trung bình nếu tồn kho hiện tại > 0
                    if (Number(total_stock) > 0) {
                        // Tổng giá trị kho hiện tại
                        const currentInventoryValue = Number(total_stock) * (Number(current_unit_cost) / Number(exchange_value));

                        // Tổng số lượng sau khi nhập
                        const finalQtyBase = Number(total_stock) + importQtyBase;

                        // Công thức trung bình chuẩn
                        newBaseCost = (currentInventoryValue + realImportTotalValue) / finalQtyBase;

                        newCostPrice = newBaseCost * Number(exchange_value);

                    } else {
                        // Nếu kho âm hoặc bằng 0, lấy luôn giá nhập mới làm giá vốn
                        newCostPrice = importPricePerUnit;
                        newBaseCost = newCostPrice / Number(exchange_value);
                    }

                    // Làm tròn giá vốn để tránh số lẻ thập phân vô tận
                    newCostPrice = Math.round(newCostPrice * 100) / 100;

                    // 2. Cập nhật tồn kho (như cũ)
                    await connection.execute(
                        'UPDATE products SET total_stock = total_stock + ? WHERE id = ?',
                        [importQtyBase, product_id]
                    );

                    // 3. Cập nhật GIÁ VỐN cho SKU này
                    // await connection.execute(
                    //     'UPDATE product_units SET cost_price = ? WHERE sku = ?',
                    //     [newCostPrice, item.sku]
                    // );

                    await connection.execute(
                        `UPDATE product_units 
     SET cost_price = ? * exchange_value 
     WHERE product_id = ?`,
                        [newBaseCost, product_id]
                    );

                    // Gợi ý: Nếu bạn muốn tất cả các SKU cùng một sản phẩm đều cập nhật giá vốn theo tỷ lệ quy đổi
                    // bạn có thể chạy thêm 1 câu update cho tất cả units thuộc product_id này dựa trên newBaseCost
                }
            }
        }

        if (status === 'completed') {
            // Cập nhật nợ mới và Ghi log nợ
            const [supplier] = await connection.execute('SELECT current_debt FROM suppliers WHERE id = ?', [supplier_id]);
            const beforeDebt = supplier[0].current_debt;
            const afterDebt = parseFloat(beforeDebt) + parseFloat(final_amount);

            await connection.execute('UPDATE suppliers SET current_debt = ? WHERE id = ?', [afterDebt, supplier_id]);

            await connection.execute(
                `INSERT INTO debt_logs (supplier_id, reference_id, reference_code, type, before_debt, change_amount, after_debt, note) 
                 VALUES (?, ?, ?, 'PURCHASE', ?, ?, ?, ?)`,
                [supplier_id, currentPoId, req.body.po_code || currentPocode, beforeDebt, final_amount, afterDebt, note]
            );
        }

        // 5. LƯU ẢNH VÀO DB
        if (files && files.length > 0) {
            for (const file of files) {
                const imageUrl = `/uploads/purchase_orders/${file.filename}`;
                await connection.execute(
                    `INSERT INTO purchase_order_images (po_id, image_url) VALUES (?, ?)`,
                    [currentPoId, imageUrl]
                );
            }
        }


        await connection.commit();
        res.status(200).json({ success: true, message: "Xử lý thành công" });
    } catch (error) {
        if (connection) await connection.rollback();
        res.status(500).json({ success: false, error: error.message });
    } finally {
        if (connection) connection.release();
    }
});

app.post('/api/purchase-orders/:id/images', upload.any(), async (req, res) => {
    let connection;
    const poId = req.params.id;
    const files = req.files;

    if (!files || files.length === 0) {
        return res.status(400).json({ success: false, error: "Không có file nào được tải lên" });
    }

    try {
        connection = await pool.getConnection();
        await connection.query("USE my_pos_kiotviet"); // Ép ngữ cảnh
        await connection.beginTransaction();

        // Kiểm tra xem đơn hàng có tồn tại không (Optional nhưng nên có)
        const [order] = await connection.execute('SELECT id FROM purchase_orders WHERE id = ?', [poId]);
        if (order.length === 0) {
            throw new Error("Đơn hàng không tồn tại");
        }

        // Duyệt qua các file và lưu vào bảng purchase_order_images
        for (const file of files) {
            // Đảm bảo đường dẫn khớp với cấu trúc thư mục tĩnh của bạn
            const imageUrl = `/uploads/purchase_orders/${file.filename}`;

            await connection.execute(
                `INSERT INTO purchase_order_images (po_id, image_url) VALUES (?, ?)`,
                [poId, imageUrl]
            );
        }

        await connection.commit();
        res.status(200).json({
            success: true,
            message: `Đã tải lên ${files.length} ảnh chứng từ thành công`
        });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error("Upload Error:", error);
        res.status(500).json({ success: false, error: error.message });
    } finally {
        if (connection) connection.release();
    }
});
app.post('/api/sell-products', async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        await connection.query("USE my_pos_kiotviet"); // Ép ngữ cảnh
        await connection.beginTransaction();

        const {
            invoice_id, // Nếu có ID này thì là UPDATE, không có là INSERT
            customer_id,
            current_customer_debt,
            total_amount,
            discount_value,
            discount_type,
            final_amount,
            customer_pay,
            note,
            status, // 'completed' hoặc 'draft'
            items,
            created_at
        } = req.body;

        let finalInvoiceId = invoice_id;
        let currentInvoiceCode;

        const change_amount = (customer_pay || 0) - Math.round(final_amount);

        if (invoice_id) {
            // === TRƯỜNG HỢP 1: CẬP NHẬT HÓA ĐƠN ĐÃ CÓ (DRAFT) ===

            // 1. Lấy mã hóa đơn cũ để ghi log nợ nếu cần
            const [oldInv] = await connection.execute('SELECT invoice_code FROM invoices WHERE id = ?', [invoice_id]);
            currentInvoiceCode = oldInv[0].invoice_code;

            // 2. Cập nhật thông tin chính của hóa đơn
            await connection.execute(
                `UPDATE invoices SET 
                    customer_id = ?, total_amount = ?, discount_value = ?, 
                    discount_type = ?, final_amount = ?, customer_pay = ?, 
                    change_amount = ?, note = ?, status = ?, created_at  = ?
                WHERE id = ?`,
                [
                    customer_id || null, Math.round(total_amount), discount_value || 0,
                    discount_type || 'VND', Math.round(final_amount), customer_pay || 0,
                    change_amount > 0 ? change_amount : 0, note, status, created_at, invoice_id
                ]
            );

            // 3. Xóa các chi tiết cũ để ghi đè chi tiết mới (Tránh trùng lặp hoặc sót hàng)
            await connection.execute('DELETE FROM invoice_details WHERE invoice_id = ?', [invoice_id]);

        } else {
            // === TRƯỜNG HỢP 2: TẠO MỚI HOÀN TOÀN ===
            currentInvoiceCode = `HD${Date.now()}`;
            const [invResult] = await connection.execute(
                `INSERT INTO invoices 
                (invoice_code, customer_id, total_amount, discount_value, discount_type, final_amount, customer_pay, change_amount, note, status,created_at) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    currentInvoiceCode, customer_id || null, Math.round(total_amount),
                    discount_value || 0, discount_type || 'VND', Math.round(final_amount),
                    customer_pay || 0, change_amount > 0 ? change_amount : 0, note, status, created_at
                ]
            );
            finalInvoiceId = invResult.insertId;
        }

        // === XỬ LÝ CHI TIẾT SẢN PHẨM & KHO (Dùng chung cho cả 2 trường hợp) ===
        for (const item of items) {
            // A. Lưu chi tiết hóa đơn mới
            // 1. Lấy giá vốn hiện tại của SKU
            const [unit] = await connection.execute('SELECT cost_price FROM product_units WHERE sku = ?', [item.sku]);
            const currentCost = unit[0]?.cost_price || 0;

            await connection.execute(
                `INSERT INTO invoice_details 
                (invoice_id, product_sku, quantity, sale_price, line_discount_value, line_discount_type, line_total,cost_price) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    finalInvoiceId, item.sku, item.quantity, item.sale_price,
                    item.lineDiscountValue || 0, item.lineDiscountType || 'VND', Math.round(item.total), currentCost
                ]
            );

            // B. Trừ kho (Chỉ thực hiện khi trạng thái chuyển sang 'completed')
            if (status === 'completed') {
                const [productUnit] = await connection.execute(
                    'SELECT product_id, exchange_value FROM product_units WHERE sku = ?',
                    [item.sku]
                );

                if (productUnit.length > 0) {
                    const { product_id, exchange_value } = productUnit[0];
                    const actualQty = Math.round(item.quantity * (exchange_value || 1));

                    await connection.execute(
                        'UPDATE products SET total_stock = total_stock - ? WHERE id = ?',
                        [actualQty, product_id]
                    );
                }
            }
        }

        // === XỬ LÝ CÔNG NỢ (Chỉ khi Hoàn thành & có Khách hàng) ===
        if (status === 'completed' && customer_id) {
            const unpaidAmount = Math.round(final_amount) - (customer_pay || 0);

            if (unpaidAmount > 0) {
                await connection.execute(
                    'UPDATE customers SET total_debt = total_debt + ? WHERE id = ?',
                    [unpaidAmount, customer_id]
                );

                await connection.execute(
                    `INSERT INTO customer_debt_logs 
                    (customer_id, invoice_id, before_debt, change_amount, after_debt, type, note) 
                    VALUES (?, ?, ?, ?, ?, 'SALE', ?)`,
                    [
                        customer_id, finalInvoiceId, current_customer_debt || 0,
                        unpaidAmount, (current_customer_debt || 0) + unpaidAmount,
                        `Bán hàng/Cập nhật hóa đơn ${currentInvoiceCode}`
                    ]
                );
            }
        }

        await connection.commit();
        res.status(200).json({
            success: true,
            message: invoice_id ? "Cập nhật hóa đơn thành công" : "Thanh toán thành công",
            invoice_code: currentInvoiceCode
        });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error("LỖI XỬ LÝ HÓA ĐƠN:", error);
        res.status(500).json({ success: false, error: error.message });
    } finally {
        connection.release();
    }
});
app.get('/api/invoices/:id/details', async (req, res) => {
    try {
        const { id } = req.params;

        // Thêm SELECT ... FROM và xóa chữ "anarchy" nếu nó không phải tên database của bạn
        const details = await safeQuery(`
            SELECT 
                d.*, 
                p.master_name , 
                u.sku as product_sku,
                u.exchange_value
            FROM invoice_details d
            JOIN product_units u ON d.product_sku = u.sku
            JOIN products p ON u.product_id = p.id
            WHERE d.invoice_id = ?
        `, [id]);

        // Trả về dữ liệu đã map lại cho Frontend dễ dùng
        const formattedDetails = details.map(item => ({
            product_sku: item.product_sku,
            product_name: item.master_name, // Để hiển thị tên sản phẩm trên dòng hàng
            quantity: Number(item.quantity),
            sale_price: Number(item.sale_price),
            lineDiscountValue: Number(item.line_discount_value || 0),
            lineDiscountType: item.line_discount_type || 'VND',
            total: Number(item.line_total)
        }));

        res.json(formattedDetails);
    } catch (error) {
        console.error("Lỗi lấy chi tiết hóa đơn:", error);
        res.status(500).json({ success: false, message: "Không thể lấy thông tin chi tiết" });
    }
});

// Route: GET /api/invoices
// GET /api/invoices
app.get('/api/invoices', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        // 1. Lấy danh sách hóa đơn
        let invoiceQuery = `
            SELECT i.*, c.name as customer_name, c.phone as customer_phone
            FROM invoices i
            LEFT JOIN customers c ON i.customer_id = c.id
        `;
        const queryParams = [];
        if (startDate && endDate) {
            invoiceQuery += " WHERE i.created_at BETWEEN ? AND ?";
            queryParams.push(`${startDate} 00:00:00`, `${endDate} 23:59:59`);
        }
        invoiceQuery += " ORDER BY i.created_at DESC";

        // Bỏ [ ] vì safeQuery đã trả về mảng kết quả
        const invoices = await safeQuery(invoiceQuery, queryParams);

        if (invoices.length === 0) return res.json([]);

        // 2. Lấy tất cả chi tiết hóa đơn trong 1 lần truy vấn duy nhất (JOIN)


        const invoiceIds = invoices.map(i => i.id);
        // 1. Tạo chuỗi các dấu ? tương ứng với số lượng ID
        const placeholders = invoiceIds.map(() => '?').join(',');
        const details = await safeQuery(`
            SELECT d.*, p.master_name as product_name
            FROM invoice_details d
            JOIN product_units pu ON d.product_sku = pu.sku
            JOIN products p ON pu.product_id = p.id
            WHERE d.invoice_id IN (${placeholders})
        `, invoiceIds);

        // 3. Tối ưu: Tạo Map để gán chi tiết vào hóa đơn với độ phức tạp O(N)
        const detailsMap = {};
        details.forEach(d => {
            if (!detailsMap[d.invoice_id]) detailsMap[d.invoice_id] = [];
            detailsMap[d.invoice_id].push({
                ...d,
                quantity: parseFloat(d.quantity),
                sale_price: parseFloat(d.sale_price),
                line_total: parseFloat(d.line_total)
            });
        });

        // 4. Kết hợp dữ liệu
        const result = invoices.map(inv => ({
            ...inv,
            total_amount: parseFloat(inv.total_amount),
            final_amount: parseFloat(inv.final_amount),
            details: detailsMap[inv.id] || []
        }));

        res.json(result);
    } catch (err) {
        console.error("Lỗi API Invoices:", err);
        res.status(500).json({ message: "Lỗi Server", error: err.message });
    }
});
// DELETE /api/invoices/:id
app.delete('/api/invoices/:id', async (req, res) => {
    const { id } = req.params;
    let connection;

    try {
        connection = await pool.getConnection();
        await connection.query("USE my_pos_kiotviet"); // Ép ngữ cảnh
        await connection.beginTransaction();

        // 1. Lấy danh sách sản phẩm trong đơn hàng trước khi xóa
        const [items] = await connection.execute(
            'SELECT product_sku, quantity FROM invoice_details WHERE invoice_id = ?',
            [id]
        );

        // 2. Hoàn tồn kho (Quan trọng: Quy đổi về đơn vị gốc)
        for (const item of items) {
            // Lấy exchange_value của đơn vị đã bán và ID của sản phẩm gốc
            // Công thức: Số lượng hoàn kho = Số lượng bán * Giá trị quy đổi
            await connection.execute(`
                UPDATE products p
                JOIN product_units pu ON p.id = pu.product_id
                SET p.total_stock = p.total_stock + (? * pu.exchange_value)
                WHERE pu.sku = ?`,
                [item.quantity, item.product_sku]
            );
        }

        // 3. Xóa các dữ liệu liên quan (theo thứ tự để tránh lỗi khóa ngoại)
        await connection.execute('DELETE FROM invoice_details WHERE invoice_id = ?', [id]);
        await connection.execute('DELETE FROM customer_debt_logs WHERE invoice_id = ?', [id]);

        // 4. Xóa hóa đơn chính
        const [result] = await connection.execute('DELETE FROM invoices WHERE id = ?', [id]);

        if (result.affectedRows === 0) throw new Error("Hóa đơn không tồn tại");

        await connection.commit();
        res.json({ success: true, message: "Hủy đơn và hoàn kho thành công" });

    } catch (err) {
        await connection.rollback();
        console.error("Lỗi hoàn kho:", err);
        res.status(500).json({ message: "Lỗi hệ thống", error: err.message });
    } finally {
        connection.release();
    }
});
// API Lấy chi tiết sản phẩm của một phiếu nhập cụ thể
app.get('/api/purchase-orders/:id/details', async (req, res) => {
    const { id } = req.params;

    try {
        // 1. Lấy danh sách hàng hóa
        const details = await safeQuery(
            `SELECT 
                d.id,
                u.sku as product_sku,
                d.quantity,
                d.import_price as cost_price,
                d.line_discount_value as lineDiscountValue,
                d.line_discount_type as lineDiscountType,
                d.line_total as total,
                p.master_name as name,
                u.unit_name as unit_name
             FROM purchase_order_details d
             JOIN product_units u ON d.product_sku = u.sku
             JOIN products p ON u.product_id = p.id
             WHERE d.po_id = ?`,
            [id]
        );

        // 2. Lấy danh sách hình ảnh chứng từ
        const images = await safeQuery(
            `SELECT image_url FROM purchase_order_images WHERE po_id = ?`,
            [id]
        );

        // 3. Format dữ liệu hàng hóa (Number casting)
        const formattedDetails = details.map(item => ({
            ...item,
            quantity: Number(item.quantity) || 0,
            cost_price: Number(item.cost_price) || 0,
            lineDiscountValue: Number(item.lineDiscountValue) || 0,
            total: Number(item.total) || 0
        }));

        // 4. Trả về object bao gồm cả hàng hóa và ảnh
        res.json({
            success: true,
            details: formattedDetails,
            images: images.map(img => img.image_url) // Chỉ lấy mảng chuỗi ['/uploads/..', ..]
        });

    } catch (error) {
        console.error("Lỗi lấy chi tiết phiếu nhập:", error);
        res.status(500).json({
            success: false,
            message: "Lỗi hệ thống khi lấy chi tiết phiếu nhập"
        });
    }
});

app.get('/api/purchase-orders', async (req, res) => {
    try {
        // 1. Thêm poi.image_url vào câu SELECT và LEFT JOIN với bảng ảnh
        const rows = await safeQuery(`
            SELECT 
                po.id, po.po_code, po.created_at, po.status, po.total_amount, po.discount_type,
                po.discount_value, po.final_amount, po.note,
                s.id as supplier_id,
                s.supplier_name,
                pd.id as detail_id, 
                pd.product_sku, 
                pd.quantity, 
                pd.import_price as cost_price, 
                pd.line_total as total,
                p.master_name as name,
                u.unit_name,
                poi.image_url -- Lấy thêm đường dẫn ảnh
            FROM purchase_orders po
            LEFT JOIN suppliers s ON po.supplier_id = s.id
            LEFT JOIN purchase_order_details pd ON po.id = pd.po_id
            LEFT JOIN product_units u ON pd.product_sku = u.sku
            LEFT JOIN products p ON u.product_id = p.id
            LEFT JOIN purchase_order_images poi ON po.id = poi.po_id -- Join thêm bảng ảnh
            ORDER BY po.created_at DESC
        `);

        // 2. Nhóm dữ liệu
        const ordersMap = rows.reduce((acc, row) => {
            const {
                id, supplier_id, po_code, created_at, status, total_amount, discount_type,
                discount_value, final_amount, note, supplier_name,
                detail_id, product_sku, quantity, cost_price, total, name, unit_name,
                image_url
            } = row;

            if (!acc[id]) {
                acc[id] = {
                    id, supplier_id, po_code, created_at, status,
                    total_amount: parseFloat(total_amount),
                    discount_type,
                    discount_value: parseFloat(discount_value),
                    final_amount: parseFloat(final_amount),
                    note, supplier_name,
                    key: id,
                    details: [],
                    images: [] // Khởi tạo mảng chứa ảnh
                };
            }

            // Xử lý đẩy chi tiết sản phẩm (tránh trùng lặp do JOIN)
            if (detail_id && !acc[id].details.find(d => d.id === detail_id)) {
                acc[id].details.push({
                    id: detail_id,
                    product_sku,
                    name,
                    unit_name,
                    quantity: Number(quantity) || 0,
                    cost_price: Number(cost_price) || 0,
                    total: Number(total) || 0
                });
            }

            // Xử lý đẩy ảnh (tránh trùng lặp và chỉ đẩy nếu tồn tại url)
            if (image_url && !acc[id].images.includes(image_url)) {
                acc[id].images.push(image_url);
            }

            return acc;
        }, {});

        res.json(Object.values(ordersMap));

    } catch (error) {
        console.error("LỖI FETCH ORDERS:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// API: Lấy lịch sử nhập hàng của 1 nhà cung cấp
app.get('/api/suppliers/:id/purchase-history', async (req, res) => {
    const { id } = req.params;
    try {
        // 1. Bỏ dấu [ ] vì safeQuery đã trả về danh sách kết quả
        const history = await safeQuery(`
            SELECT 
                id,
                po_code, 
                created_at,
                supplier_id,
                total_amount,
                discount_value,
                discount_type,
                note,
                final_amount, 
                status,
                created_by
            FROM purchase_orders 
            WHERE supplier_id = ? 
            ORDER BY created_at DESC
        `, [id]);

        // 2. Chuyển đổi dữ liệu số để đảm bảo tính toán ở Frontend
        const formattedHistory = history.map(po => ({
            ...po,
            total_amount: parseFloat(po.total_amount) || 0,
            discount_value: parseFloat(po.discount_value) || 0,
            final_amount: parseFloat(po.final_amount) || 0
        }));

        res.json(formattedHistory);
    } catch (error) {
        console.error("Lỗi lấy lịch sử nhập hàng:", error);
        res.status(500).json({ error: "Lỗi hệ thống khi lấy lịch sử phiếu nhập" });
    }
});

app.get('/api/customers/:id/sale-history', async (req, res) => {
    const { id } = req.params;
    try {
        // Lấy danh sách các hóa đơn bán hàng của khách hàng này
        const history = await safeQuery(`
            SELECT 
                id,
                invoice_code, 
                created_at,
                customer_id,
                total_amount,
                discount_value,
                discount_type,
                final_amount,
                note,
                status
            FROM invoices 
            WHERE customer_id = ? 
            ORDER BY created_at DESC
        `, [id]);

        // Map lại dữ liệu để đảm bảo các giá trị số là kiểu Number
        // Điều này rất quan trọng để Frontend thực hiện các phép tính (tổng, trung bình...)
        const formattedHistory = history.map(inv => ({
            ...inv,
            total_amount: parseFloat(inv.total_amount) || 0,
            discount_value: parseFloat(inv.discount_value) || 0,
            final_amount: parseFloat(inv.final_amount) || 0
        }));

        res.json(formattedHistory);
    } catch (error) {
        console.error("Lỗi lấy lịch sử bán hàng của khách:", error);
        res.status(500).json({
            success: false,
            message: "Lỗi hệ thống khi lấy lịch sử bán hàng"
        });
    }
});

// GET: /api/suppliers/:id/debt-history
app.get('/api/suppliers/:id/debt-history', async (req, res) => {
    const supplierId = req.params.id;
    const query = `
        SELECT 
            id,
            reference_code,
            type,
            before_debt,
            change_amount,
            after_debt,
            note,
            created_at,
            (CASE 
                WHEN type = 'PURCHASE' THEN change_amount 
                ELSE -change_amount 
            END) as display_amount
        FROM debt_logs 
        WHERE supplier_id = ? 
        ORDER BY created_at DESC
    `;

    try {
        // 1. Loại bỏ [ ] để nhận đúng toàn bộ danh sách từ safeQuery
        const history = await safeQuery(query, [supplierId]);

        // 2. Ép kiểu dữ liệu số để tránh lỗi sai số trên Frontend
        const formattedHistory = history.map(item => ({
            ...item,
            before_debt: parseFloat(item.before_debt) || 0,
            change_amount: parseFloat(item.change_amount) || 0,
            after_debt: parseFloat(item.after_debt) || 0,
            display_amount: parseFloat(item.display_amount) || 0
        }));

        res.json(formattedHistory);
    } catch (error) {
        console.error("Lỗi lấy lịch sử công nợ:", error);
        res.status(500).json({ error: "Lỗi hệ thống khi lấy lịch sử công nợ" });
    }
});
app.get('/api/customers/:id/debt-history', async (req, res) => {
    const { id } = req.params;

    try {
        // Truy vấn nhật ký công nợ khách hàng
        // Join với bảng invoices để lấy mã hóa đơn làm mã chứng từ (reference_code)
        const history = await safeQuery(`
            SELECT 
                log.id,
                log.created_at,
                log.type,
                log.before_debt,
                log.change_amount,
                log.after_debt,
                log.note,
                COALESCE(inv.invoice_code, 'THU-NO') as reference_code
            FROM customer_debt_logs log
            LEFT JOIN invoices inv ON log.invoice_id = inv.id
            WHERE log.customer_id = ?
            ORDER BY log.created_at DESC
        `, [id]);

        // Map dữ liệu để đảm bảo các giá trị số là Number và định dạng hiển thị
        const formattedHistory = history.map(item => {
            const change = parseFloat(item.change_amount) || 0;

            return {
                ...item,
                before_debt: parseFloat(item.before_debt) || 0,
                change_amount: change,
                after_debt: parseFloat(item.after_debt) || 0,
                // display_amount: Phục vụ cột 'Giá trị' trong bảng UI
                // Nếu là SALE (Bán nợ) thì hiển thị số dương (tăng nợ)
                // Nếu là PAYMENT (Thu tiền) hoặc RETURN (Trả hàng) thì hiển thị số âm (giảm nợ)
                display_amount: item.type === 'SALE' ? change : -change
            };
        });

        res.json(formattedHistory);
    } catch (error) {
        console.error("Lỗi lấy nhật ký công nợ khách hàng:", error);
        res.status(500).json({
            success: false,
            message: "Lỗi hệ thống khi tải lịch sử công nợ"
        });
    }
});
// POST: /api/suppliers/:id/payments
app.post('/api/suppliers/:id/payments', async (req, res) => {
    const supplierId = req.params.id;
    // Sử dụng toán tử ?? (nullish coalescing) hoặc || 
    // để chuyển undefined thành null hoặc chuỗi rỗng
    const amount = req.body.amount;
    const payment_method = req.body.payment_method || 'cash';
    const note = req.body.note ?? null; // Nếu note là undefined, nó sẽ thành null

    // Kiểm tra dữ liệu đầu vào
    if (!amount) {
        return res.status(400).json({ error: "Số tiền không hợp lệ" });
    }
    // Tạo mã phiếu chi tự động (VD: PC171456789)
    const paymentCode = `PC${Date.now()}`;
    let connection;


    try {
        connection = await pool.getConnection();
        await connection.query("USE my_pos_kiotviet"); // Ép ngữ cảnh
        await connection.beginTransaction();
        // 1. Lấy nợ hiện tại của NCC và khóa dòng đó lại để tránh xung đột (SELECT FOR UPDATE)
        const [suppliers] = await connection.execute(
            'SELECT current_debt FROM suppliers WHERE id = ? FOR UPDATE',
            [supplierId]
        );

        if (suppliers.length === 0) throw new Error('Không tìm thấy nhà cung cấp');

        const beforeDebt = parseFloat(suppliers[0].current_debt);
        const afterDebt = beforeDebt - parseFloat(amount);

        // 2. Cập nhật nợ mới vào bảng suppliers
        await connection.execute(
            'UPDATE suppliers SET current_debt = ? WHERE id = ?',
            [afterDebt, supplierId]
        );

        // 3. Lưu vào bảng phiếu chi (payment_vouchers)
        await connection.execute(
            `INSERT INTO payment_vouchers (payment_code, supplier_id, amount, payment_method, note) 
             VALUES (?, ?, ?, ?, ?)`,
            [paymentCode, supplierId, amount, payment_method, note]
        );

        // 4. Ghi nhật ký công nợ (debt_logs)
        await connection.execute(
            `INSERT INTO debt_logs (supplier_id, reference_code, type, before_debt, change_amount, after_debt, note) 
             VALUES (?, ?, 'PAYMENT', ?, ?, ?, ?)`,
            [supplierId, paymentCode, beforeDebt, amount, afterDebt, note]
        );

        // Hoàn tất giao dịch
        await connection.commit();
        res.json({
            success: true,
            message: 'Thanh toán thành công',
            payment_code: paymentCode,
            new_debt: afterDebt
        });

    } catch (error) {
        // Nếu có bất kỳ lỗi nào, hủy bỏ toàn bộ các bước trên
        await connection.rollback();
        console.error("CHI TIẾT LỖI TẠI BACKEND:", error); // Xem tại terminal nodejs
        res.status(500).json({
            success: false,
            error: error.message,
            sqlMessage: error.sqlMessage // Trả về thông báo lỗi của MySQL
        });
    } finally {
        connection.release();
    }
});
app.post('/api/customers/:id/receipts', async (req, res) => {
    let connection;
    try {
        const { id } = req.params;
        const { amount, payment_method, note } = req.body;

        connection = await pool.getConnection();
        await connection.query("USE my_pos_kiotviet");
        await connection.beginTransaction();

        // 1. Lấy thông tin nợ hiện tại để ghi log
        const [customerRows] = await connection.execute(
            'SELECT total_debt FROM customers WHERE id = ? FOR UPDATE',
            [id]
        );

        if (customerRows.length === 0) {
            throw new Error("Khách hàng không tồn tại");
        }

        const beforeDebt = parseFloat(customerRows[0].total_debt) || 0;
        const paymentAmount = parseFloat(amount) || 0;
        const afterDebt = beforeDebt - paymentAmount;

        // 2. Cập nhật nợ mới vào bảng customers
        await connection.execute(
            'UPDATE customers SET total_debt = ? WHERE id = ?',
            [afterDebt, id]
        );

        // 3. Ghi vào nhật ký công nợ (customer_debt_logs)
        // Lưu ý: invoice_id để NULL vì đây là phiếu thu nợ trực tiếp
        await connection.execute(
            `INSERT INTO customer_debt_logs 
            (customer_id, invoice_id, before_debt, change_amount, after_debt, type, note) 
            VALUES (?, NULL, ?, ?, ?, 'PAYMENT', ?)`,
            [
                id,
                beforeDebt,
                paymentAmount,
                afterDebt,
                note || `Thu tiền nợ khách hàng - PT${Date.now()}`
            ]
        );

        // 4. (Tùy chọn) Lưu vào bảng phiếu thu nếu bạn có bảng receipts riêng
        // Hiện tại schema của bạn đang tập trung vào log công nợ nên ta ưu tiên log.

        await connection.commit();
        res.status(200).json({
            success: true,
            message: "Thu tiền nợ thành công",
            new_debt: afterDebt
        });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error("LỖI THU NỢ KHÁCH HÀNG:", error);
        res.status(500).json({ success: false, error: error.message });
    } finally {
        if (connection) connection.release();
    }
});

app.post('/api/returns', async (req, res) => {
    // Lưu ý: Destructuring đúng tên trường từ JSON gửi lên
    const {
        customer_id,
        invoice_id,      // Nếu khách trả theo hóa đơn cụ thể
        items,
        total_items_price,
        discount,        // Khớp với JSON: "discount"
        return_fee,
        final_refund,
        payment_method,
        note
    } = req.body;

    let connection;


    try {
        connection = await pool.getConnection();
        await connection.query("USE my_pos_kiotviet"); // Ép ngữ cảnh
        await connection.beginTransaction();
        const returnCode = `TH${Date.now()}`;

        // 1. Lưu Header - Sử dụng || null để tránh lỗi 'undefined'
        const [retResult] = await connection.execute(
            `INSERT INTO return_invoices 
            (return_code, invoice_id, customer_id, total_amount, discount_value, return_fee, final_refund, payment_method, note) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                returnCode,
                invoice_id || null,      // Sửa lỗi undefined ở đây
                customer_id || null,
                total_items_price || 0,
                discount || 0,
                return_fee || 0,
                final_refund || 0,
                payment_method || 'Tiền mặt',
                note || ""
            ]
        );

        const returnId = retResult.insertId;

        // 2. Xử lý Items
        for (const item of items) {
            // Lấy exchange_value để quy đổi tồn kho
            const [unitInfo] = await connection.execute(
                `SELECT product_id, exchange_value FROM product_units WHERE sku = ?`,
                [item.sku]
            );

            if (unitInfo.length === 0) throw new Error(`Mã hàng ${item.sku} không tồn tại trong hệ thống`);

            const { product_id, exchange_value } = unitInfo[0];
            const quantityInBaseUnit = Number(item.quantity) * Number(exchange_value);

            // Lưu chi tiết phiếu trả
            await connection.execute(
                `INSERT INTO return_invoice_details (return_id, product_sku, quantity, return_price, line_total) 
                 VALUES (?, ?, ?, ?, ?)`,
                [
                    returnId,
                    item.sku,
                    item.quantity,
                    item.return_price,
                    (item.quantity * item.return_price)
                ]
            );

            // Cập nhật tồn kho (Cộng lại vào kho tổng)
            await connection.execute(
                `UPDATE products SET total_stock = total_stock + ? WHERE id = ?`,
                [quantityInBaseUnit, product_id]
            );
        }

        await connection.commit();
        res.status(201).json({ success: true, returnCode });

    } catch (error) {
        await connection.rollback();
        console.error("Lỗi trả hàng:", error);
        res.status(500).json({ message: error.message });
    } finally {
        connection.release();
    }
});

//fix gia
app.delete('/api/purchase-orders/:id', async (req, res) => {
    const poId = req.params.id;
    let connection;

    try {
        connection = await pool.getConnection();
        await connection.query("USE my_pos_kiotviet");
        await connection.beginTransaction();

        // 1. Lấy thông tin phiếu nhập
        const [orders] = await connection.execute('SELECT * FROM purchase_orders WHERE id = ?', [poId]);
        const [images] = await connection.execute('SELECT image_url FROM purchase_order_images WHERE po_id = ?', [poId]);

        if (orders.length === 0) {
            return res.status(404).json({ message: "Không tìm thấy phiếu nhập" });
        }

        const order = orders[0];

        // 2. Nếu trạng thái là 'completed', thực hiện hoàn tác Kho và Giá vốn
        if (order.status === 'completed') {
            const [details] = await connection.execute(
                `SELECT pod.product_sku, pod.quantity, pod.line_total, pu.product_id, pu.exchange_value 
                 FROM purchase_order_details pod
                 JOIN product_units pu ON pod.product_sku = pu.sku
                 WHERE pod.po_id = ?`, [poId]
            );

            // Tính tỷ lệ chiết khấu tổng hóa đơn để hoàn tác chính xác giá trị thực nhập
            const totalBeforeTax = parseFloat(order.total_amount) || 1;
            let discountRatio = 0;
            if (order.discount_type === '%') {
                discountRatio = parseFloat(order.discount_value) / 100;
            } else {
                discountRatio = parseFloat(order.discount_value || 0) / totalBeforeTax;
            }

            for (const item of details) {
                // Lấy dữ liệu kho hiện tại
                const [unitData] = await connection.execute(
                    `SELECT u.cost_price, p.total_stock, u.exchange_value 
                     FROM product_units u 
                     JOIN products p ON u.product_id = p.id 
                     WHERE u.sku = ?`, [item.product_sku]
                );

                if (unitData.length > 0) {
                    const { cost_price, total_stock, exchange_value } = unitData[0];

                    // Số lượng quy đổi của dòng hàng sắp xóa
                    const deleteQtyBase = item.quantity * exchange_value;

                    // Giá trị thực tế của dòng hàng này (sau chiết khấu tổng HD)
                    const realDeleteTotalValue = item.line_total * (1 - discountRatio);

                    // Tổng giá trị kho hiện tại
                    const currentInventoryValue = Number(total_stock) * (Number(cost_price) / Number(exchange_value));

                    // Số lượng tồn sau khi xóa phiếu
                    const remainQtyBase = Number(total_stock) - deleteQtyBase;

                    let newBaseCost = 0;
                    if (remainQtyBase > 0) {
                        // Công thức hoàn tác: (Tổng giá trị kho hiện tại - Giá trị hàng xóa) / Số lượng còn lại
                        newBaseCost = (currentInventoryValue - realDeleteTotalValue) / remainQtyBase;
                    } else {
                        // Nếu xóa xong mà hết hàng, giữ nguyên giá vốn hiện tại hoặc xử lý theo chính sách kho
                        newBaseCost = cost_price / exchange_value;
                    }

                    // 2.1 Cập nhật tồn kho thực tế (trừ lại)
                    await connection.execute(
                        'UPDATE products SET total_stock = total_stock - ? WHERE id = ?',
                        [deleteQtyBase, item.product_id]
                    );

                    // 2.2 Cập nhật GIÁ VỐN ĐỒNG BỘ cho tất cả đơn vị của sản phẩm này
                    await connection.execute(
                        `UPDATE product_units 
                         SET cost_price = ROUND(? * exchange_value, 2) 
                         WHERE product_id = ?`,
                        [newBaseCost, item.product_id]
                    );
                }
            }

            // --- CẬP NHẬT CÔNG NỢ NHÀ CUNG CẤP ---
            await connection.execute(
                'UPDATE suppliers SET current_debt = current_debt - ? WHERE id = ?',
                [order.final_amount, order.supplier_id]
            );

            const [supplier] = await connection.execute(
                'SELECT current_debt FROM suppliers WHERE id = ?', [order.supplier_id]
            );

            await connection.execute(
                `INSERT INTO debt_logs (supplier_id, reference_id, reference_code, type, before_debt, change_amount, after_debt, note)
                 VALUES (?, ?, ?, 'ADJUSTMENT', ?, ?, ?, ?)`,
                [
                    order.supplier_id, order.id, order.po_code,
                    Number(supplier[0].current_debt) + Number(order.final_amount),
                    order.final_amount,
                    supplier[0].current_debt,
                    `Xóa phiếu nhập hàng ${order.po_code}`
                ]
            );
        }

        // 3. XÓA DỮ LIỆU PHIẾU
        await connection.execute('DELETE FROM purchase_order_images WHERE po_id = ?', [poId]);
        await connection.execute('DELETE FROM purchase_order_details WHERE po_id = ?', [poId]);
        await connection.execute('DELETE FROM purchase_orders WHERE id = ?', [poId]);

        // 4. XÓA FILE ẢNH VẬT LÝ
        for (const img of images) {
            try {
                const filePath = path.join(__dirname, '..', img.image_url); // Điều chỉnh lại .. tùy cấu trúc folder
                await fs.unlink(filePath);
            } catch (err) {
                console.warn(`File không tồn tại hoặc không xóa được: ${img.image_url}`);
            }
        }

        await connection.commit();
        res.json({ success: true, message: "Đã xóa phiếu nhập và hoàn tác dữ liệu kho/giá vốn thành công" });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error("Lỗi xóa phiếu nhập:", error);
        res.status(500).json({ success: false, message: "Lỗi hệ thống", error: error.message });
    } finally {
        if (connection) connection.release();
    }
});
// GET /api/return-invoices
app.get('/api/return-invoices', async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        await connection.query("USE my_pos_kiotviet"); // Ép ngữ cảnh
        const [rows] = await connection.execute(`
            SELECT 
                ri.*, 
                c.name AS customer_name, 
                c.phone AS customer_phone,
                i.invoice_code
            FROM return_invoices ri
            LEFT JOIN customers c ON ri.customer_id = c.id
            LEFT JOIN invoices i ON ri.invoice_id = i.id
            ORDER BY ri.created_at DESC
        `);
        res.json(rows);
    } catch (error) {
        console.error("CHI TIẾT LỖI TẠI BACKEND:", error); // Xem tại terminal nodejs
        res.status(500).json({
            success: false,
            error: error.message,
            sqlMessage: error.sqlMessage // Trả về thông báo lỗi của MySQL
        });
    }
});
app.delete('/api/return-invoices/:id', async (req, res) => {
    const returnId = req.params.id;
    let connection;

    try {
        connection = await pool.getConnection();
        await connection.query("USE my_pos_kiotviet");
        await connection.beginTransaction();

        // 1. Lấy chi tiết trả hàng và thông tin quy đổi của từng SKU
        const [details] = await connection.execute(`
            SELECT rid.product_sku, rid.quantity, pu.product_id, pu.exchange_value 
            FROM return_invoice_details rid
            JOIN product_units pu ON rid.product_sku = pu.sku
            WHERE rid.return_id = ?`,
            [returnId]
        );

        // 2. Hoàn kho: Cập nhật bảng products dựa trên giá trị quy đổi
        for (const item of details) {
            const quantityToRestore = item.quantity * item.exchange_value;
            await connection.execute(
                "UPDATE products SET total_stock = total_stock + ? WHERE id = ?",
                [quantityToRestore, item.product_id]
            );
        }

        // 3. Xóa chi tiết trả hàng
        await connection.execute("DELETE FROM return_invoice_details WHERE return_id = ?", [returnId]);

        // 4. Xóa phiếu trả hàng chính
        const [result] = await connection.execute("DELETE FROM return_invoices WHERE id = ?", [returnId]);

        if (result.affectedRows === 0) throw new Error("Không tìm thấy phiếu trả hàng");

        await connection.commit();
        res.json({ success: true, message: "Đã xóa phiếu và hoàn kho thành công" });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error("LỖI XÓA PHIẾU VÀ HOÀN KHO:", error);
        res.status(500).json({ success: false, message: error.message });
    } finally {
        if (connection) connection.release();
    }
});
// GET /api/return-invoices/:id/details
app.get('/api/return-invoices/:id/details', async (req, res) => {
    let connection;
    const returnId = req.params.id;
    try {
        connection = await pool.getConnection();
        await connection.query("USE my_pos_kiotviet"); // Ép ngữ cảnh
        const [rows] = await connection.execute(`
            SELECT 
                rid.*, 
                pu.unit_name, 
                p.master_name as product_name,
                pu.sku
            FROM return_invoice_details rid
            JOIN product_units pu ON rid.product_sku = pu.sku
            JOIN products p ON pu.product_id = p.id
            WHERE rid.return_id = ?
        `, [returnId]);

        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: "Lỗi lấy chi tiết phiếu trả", error: error.message });
    }
});
// API lấy chi tiết đơn vị chuyển đổi của 1 sản phẩm
app.get('/api/products/:id/units', async (req, res) => {
    try {
        // 1. Xóa dấu [ ] để nhận toàn bộ mảng dữ liệu từ safeQuery
        const units = await safeQuery(
            "SELECT * FROM product_units WHERE product_id = ? ORDER BY is_base_unit DESC",
            [req.params.id]
        );

        // 2. Kiểm tra nếu sản phẩm không có đơn vị nào
        if (!units || units.length === 0) {
            return res.status(404).json({ message: "Không tìm thấy đơn vị nào cho sản phẩm này" });
        }

        // 3. Map dữ liệu để đảm bảo các trường số là kiểu Number
        const formattedUnits = units.map(unit => ({
            ...unit,
            sale_price: parseFloat(unit.sale_price) || 0,
            cost_price: parseFloat(cost_price) || 0,
            exchange_value: parseFloat(unit.exchange_value) || 1
        }));

        res.json(formattedUnits);
    } catch (err) {
        console.error("Lỗi lấy đơn vị sản phẩm:", err);
        res.status(500).json({ error: "Lỗi hệ thống khi truy vấn đơn vị" });
    }
});

// API cập nhật giá bán theo SKU (có kiểm tra so với giá vốn)
app.put('/api/products/update-price/:sku', async (req, res) => {
    const { sku } = req.params;
    const { sale_price } = req.body;

    // 1. Kiểm tra đầu vào
    if (sale_price === undefined || sale_price === null || isNaN(sale_price)) {
        return res.status(400).json({ success: false, error: "Giá bán không hợp lệ" });
    }

    try {
        // 2. Lấy giá vốn hiện tại của SKU đó để kiểm tra
        const productData = await safeQuery(
            "SELECT cost_price FROM product_units WHERE sku = ?",
            [sku]
        );

        if (productData.length === 0) {
            return res.status(404).json({ success: false, error: "Không tìm thấy sản phẩm" });
        }

        const cost_price = productData[0].cost_price;

        // 3. Logic kiểm tra: Nếu giá bán < giá vốn thì chặn lại
        if (Number(sale_price) < Number(cost_price)) {
            return res.status(400).json({
                success: false,
                error: `Giá bán (${sale_price.toLocaleString()}) không được thấp hơn giá vốn (${cost_price.toLocaleString()})`
            });
        }

        // 4. Nếu hợp lệ, thực hiện cập nhật
        await safeQuery(
            "UPDATE product_units SET sale_price = ? WHERE sku = ?",
            [sale_price, sku]
        );

        res.json({ success: true, message: "Cập nhật giá thành công" });

    } catch (err) {
        console.error("Lỗi cập nhật giá:", err);
        res.status(500).json({ success: false, error: "Lỗi hệ thống khi cập nhật giá" });
    }
});
// --- PHẦN KHỞI ĐỘNG HỆ THỐNG ---
const PORT = process.env.PORT || 5000;

async function startServer() {
    try {
        console.log("⏳ Đang kiểm tra Database...");
        // Khởi tạo Database ngay khi app khởi động
        await initializeDatabase(pool);

        app.listen(PORT, () => {
            console.log(`🚀 Server đang chạy tại: http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error("❌ Không thể khởi động server:", error.message);
        process.exit(1);
    }
}
startServer();