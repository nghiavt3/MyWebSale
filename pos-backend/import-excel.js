const xlsx = require('xlsx');
const db = require('./database');

async function processExcel(filePath) {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    console.log(`🚀 Bắt đầu xử lý ${rows.length} dòng...`);

        for (let row of rows) {
        // Sử dụng toán tử || để đảm bảo nếu dữ liệu trống (undefined) thì sẽ chuyển về null hoặc chuỗi rỗng
        const sku = String(row['Mã hàng'] || '').trim();
        const tenHang = row['Tên hàng'] || 'Không tên'; // Tránh để tên trống
        const dvt = row['ĐVT'] || null;
        const maCoBan = String(row['Mã ĐVT Cơ bản'] || '').trim();
        const quyDoi = parseFloat(row['Quy đổi']) || 1;
        const hinhAnh = row['Hình ảnh (url1,url2...)'] || null; // Nếu trống thì truyền NULL vào SQL
        const thuongHieu = row['Thương hiệu'] || null;
        const nhomHang = row['Nhóm hàng(3 Cấp)'] || null;
        
        // Làm sạch số
        const giaBan = parseFloat(String(row['Giá bán'] || 0).replace(/,/g, '')) || 0;
        const giaVon = parseFloat(String(row['Giá vốn'] || 0).replace(/,/g, '')) || 0;
        const tonKho = parseFloat(String(row['Tồn kho'] || 0).replace(/,/g, '')) || 0;
        const trongLuong = parseFloat(String(row['Trọng lượng'] || 0).replace(/,/g, '')) || 0;

        try {
        if (!maCoBan || maCoBan === "" || quyDoi === 1) {
            // INSERT cho sản phẩm gốc
            const [res] = await db.execute(
                `INSERT INTO products 
                (category_name, master_name, brand, base_unit, total_stock, weight) 
                VALUES (?, ?, ?, ?, ?, ?)`,
                [nhomHang, tenHang, thuongHieu, dvt, tonKho, trongLuong]
            );

            const productId = res.insertId;

            await db.execute(
                `INSERT INTO product_units 
                (product_id, sku, unit_name, exchange_value, sale_price, cost_price, is_base_unit, image_url) 
                VALUES (?, ?, ?, ?, ?, ?, 1, ?)`,
                [productId, sku, dvt, 1, giaBan, giaVon, hinhAnh]
            );

            console.log(`✅ OK: ${sku}`);

            } else {
                // ĐÂY LÀ ĐƠN VỊ QUY ĐỔI (Ví dụ: Cuộn)
                // Tìm product_id của sản phẩm gốc thông qua Mã ĐVT Cơ bản
                const [parents] = await db.execute(
                    "SELECT product_id FROM product_units WHERE sku = ?", 
                    [maCoBan]
                );

                if (parents.length > 0) {
                    const productId = parents[0].product_id;
                    
                    await db.execute(
                        `INSERT INTO product_units 
                        (product_id, sku, unit_name, exchange_value, sale_price, cost_price, is_base_unit, image_url) 
                        VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
                        [productId, sku, dvt, quyDoi, giaBan, giaVon, hinhAnh]
                    );
                    console.log(`   📦 Đã thêm quy đổi: ${dvt} cho ${tenHang}`);
                } else {
                    console.warn(`⚠️ Bỏ qua ${sku}: Chưa thấy mã gốc ${maCoBan} trong DB`);
                }
            }
        } catch (err) {
            if (err.code === 'ER_DUP_ENTRY') {
                console.error(`❌ Trùng mã SKU: ${sku}`);
            } else {
                console.error(`❌ Lỗi dòng ${sku}:`, err.message);
            }
        }
    }
    console.log("✨ HOÀN THÀNH CÔNG VIỆC!");
}

processExcel('./DanhSachSanPham_KV28022026-103330-676.xlsx');