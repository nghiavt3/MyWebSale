import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, FlatList, StyleSheet, ActivityIndicator, Alert, RefreshControl, TouchableOpacity } from 'react-native';
import { Searchbar, List, FAB, Text, Avatar, Divider } from 'react-native-paper';
import { useRouter } from 'expo-router';
import Fuse from 'fuse.js'; // 1. Import Fuse.js
import axiosClient from '../src/api/axiosClient';
import { useCart } from '../context/CartContext';
import { formatVND } from '../src/utils/calculator';

interface Product {
    product_id: number;
    master_name: string;
    category_name: string;
    sku: string;
    total_stock: string; 
    sale_price: string;  
    image_url: string | null;
}

export default function POSScreen() {
    const router = useRouter();
    const { addToCart, selectedItems } = useCart();

    const [searchQuery, setSearchQuery] = useState('');
    const [products, setProducts] = useState<Product[]>([]);
    const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [lastSelectedSku, setLastSelectedSku] = useState<string | null>(null);

    // 2. Cấu hình Fuzzy Search bằng useMemo để không khởi tạo lại khi render
    const fuse = useMemo(() => {
        return new Fuse(products, {
            keys: [
                { name: 'sku', weight: 0.7 },         // SKU cực kỳ quan trọng
                { name: 'master_name', weight: 0.3 } // Tên sản phẩm quan trọng vừa
            ],
            threshold: 0.3,           // Độ nhạy (0.0: khớp tuyệt đối, 1.0: khớp mọi thứ)
            includeMatches: true,
            findAllMatches: true,
            useExtendedSearch: true,  // Cho phép tìm kiếm nâng cao
        });
    }, [products]);

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            const response = await axiosClient.get('/api/products');
            const data = Array.isArray(response.data) ? response.data : [];
            setProducts(data);
            setFilteredProducts(data);
        } catch (error) {
            console.error("Lỗi lấy sản phẩm:", error);
            Alert.alert("Lỗi kết nối", "Không thể lấy dữ liệu từ server.");
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchProducts();
        setRefreshing(false);
    }, []);

    // 3. Hàm tìm kiếm Fuzzy mới
    const onChangeSearch = (query: string) => {
        setSearchQuery(query);
        if (!query.trim()) {
            setFilteredProducts(products);
            return;
        }

        const results = fuse.search(query);
        setFilteredProducts(results.map(result => result.item));
    };

    const handleProductPress = (item: Product) => {
        setLastSelectedSku(item.sku);
        const priceNumber = parseFloat(item.sale_price) || 0;
        addToCart({ ...item, name: item.master_name, sale_price: priceNumber });
        setTimeout(() => setLastSelectedSku(null), 600);
    };

    const renderItem = ({ item }: { item: Product }) => {
        const priceNumber = parseFloat(item.sale_price) || 0;
        const isSelected = item.sku === lastSelectedSku;

        return (
            <TouchableOpacity activeOpacity={0.8} onPress={() => handleProductPress(item)}>
                <View style={[styles.cardItem, isSelected && styles.selectedCard]}>
                    {isSelected && <View style={styles.selectedIndicator} />}
                    <List.Item
                        title={item.master_name}
                        titleStyle={[styles.productTitle, isSelected && { color: '#0066FF' }]}
                        description={() => (
                            <View style={styles.descContainer}>
                                <Text style={[styles.priceText, isSelected && { color: '#0066FF' }]}>
                                    {formatVND(priceNumber)}
                                </Text>
                                <Text style={styles.stockText}>Tồn: {item.total_stock}</Text>
                            </View>
                        )}
                        left={props => (
                            item.image_url ?
                                <Avatar.Image {...props} size={56} source={{ uri: item.image_url }} style={styles.avatar} /> :
                                <Avatar.Icon 
                                    {...props} 
                                    size={56} 
                                    icon={isSelected ? "check" : "package-variant"} 
                                    color={isSelected ? "#FFF" : "#0066FF"} 
                                    style={[styles.avatarPlaceholder, isSelected && { backgroundColor: '#0066FF' }]} 
                                />
                        )}
                        right={props => (
                            <List.Icon 
                                {...props} 
                                icon={isSelected ? "check-circle" : "plus-circle"} 
                                color="#0066FF" 
                            />
                        )}
                        style={{ padding: 0 }}
                    />
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <Searchbar
                placeholder="Tìm tên hoặc mã SKU (gõ gần đúng...)"
                onChangeText={onChangeSearch}
                value={searchQuery}
                style={styles.searchBar}
                elevation={1}
                clearIcon="close-circle"
            />

            {loading && !refreshing ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#133470" />
                    <Text style={{ marginTop: 10 }}>Đang tải sản phẩm...</Text>
                </View>
            ) : (
                <FlatList
                    data={filteredProducts}
                    keyExtractor={(item, index) => `${item.product_id}-${index}`}
                    renderItem={renderItem}
                    ItemSeparatorComponent={() => <View style={{ height: 2 }} />}
                    contentContainerStyle={{ paddingBottom: 100, paddingTop: 4 }}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0066FF']} />
                    }
                    ListEmptyComponent={
                        <Text style={styles.emptyText}>Không tìm thấy sản phẩm nào</Text>
                    }
                />
            )}

            <FAB
                icon="cart"
                label={`Giỏ hàng (${selectedItems.length})`}
                style={styles.fab}
                color="white"
                onPress={() => router.push('/cart')}
                visible={selectedItems.length > 0}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F1F5F9' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyText: { textAlign: 'center', marginTop: 50, color: '#888' },
    searchBar: {
        margin: 16,
        borderRadius: 12,
        backgroundColor: '#FFF',
    },
    cardItem: {
        backgroundColor: '#FFF',
        marginHorizontal: 16,
        marginVertical: 4,
        borderRadius: 12,
        padding: 8,
        elevation: 1,
        position: 'relative',
        overflow: 'hidden',
    },
    selectedCard: {
        backgroundColor: '#E6F7FF',
        borderColor: '#BAE7FF',
        borderWidth: 0.5,
    },
    selectedIndicator: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 5,
        backgroundColor: '#0066FF',
    },
    productTitle: { fontSize: 16, fontWeight: '600', color: '#1E293B' },
    descContainer: { flexDirection: 'row', marginTop: 4 },
    priceText: { color: '#52C41A', fontWeight: '700', marginRight: 12 },
    stockText: { color: '#64748B', fontSize: 13 },
    avatar: { borderRadius: 8 },
    avatarPlaceholder: { backgroundColor: '#F1F5F9', borderRadius: 8 },
    fab: {
        position: 'absolute',
        margin: 16,
        right: 0,
        bottom: 0,
        backgroundColor: '#0066FF',
        borderRadius: 28,
    },
});