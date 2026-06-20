const mysql = require('mysql2/promise');

// 1. Tạo Pool không gắn với database nào (để tạo DB động sau)
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '123456', 
    waitForConnections: true,
    connectionLimit: 10
});

// 2. Tạo hàm wrapper để đảm bảo mọi truy vấn luôn dùng đúng database
async function safeQuery(sql, params) {
    const connection = await pool.getConnection();
    try {
        await connection.query("USE my_pos_kiotviet"); // Ép kết nối dùng database
        const [results] = await connection.execute(sql, params);
        return results;
    } finally {
        connection.release();
    }
}

module.exports = { pool, safeQuery };