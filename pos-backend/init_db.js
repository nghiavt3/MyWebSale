const fs = require('fs');
const path = require('path');

async function initializeDatabase(pool) {
    const connection = await pool.getConnection();
    try {
        // 1. Tạo Database nếu chưa có
        await connection.query("CREATE DATABASE IF NOT EXISTS my_pos_kiotviet");

        // 2. Chuyển sang sử dụng database vừa tạo
        await connection.query("USE my_pos_kiotviet");
        // Kiểm tra xem đã có bảng 'products' chưa để tránh chạy lại không cần thiết
        const [rows] = await connection.query("SHOW TABLES LIKE 'products'");

        if (rows.length === 0) {
            console.log("🛠️ Phát hiện hệ thống mới. Đang khởi tạo Schema...");

            const sqlPath = path.join(__dirname, 'schema.sql');
            const sql = fs.readFileSync(sqlPath, 'utf8');

            // Tách các câu lệnh SQL bằng dấu chấm phẩy (;) 
            // Regex này giúp tránh tách nhầm các dấu ; nằm trong chuỗi hoặc trigger
            const queries = sql.split(/;(?=(?:[^']*'[^']*')*[^']*$)/);

            for (let query of queries) {
                const trimmedQuery = query.trim();
                if (trimmedQuery) {
                    await connection.query(trimmedQuery);
                }
            }
            console.log("✅ Khởi tạo các bảng và Triggers thành công.");
        } else {
            console.log("ℹ️ Database đã tồn tại, bỏ qua bước khởi tạo.");
        }
    } catch (err) {
        throw new Error("Lỗi khi chạy Schema: " + err.message);
    }
    finally {
        connection.release();
    }
}

module.exports = initializeDatabase;