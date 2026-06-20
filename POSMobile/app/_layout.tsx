import { Stack } from 'expo-router';
import { PaperProvider } from 'react-native-paper';
import { CartProvider } from '../context/CartContext'; // Import cái vừa tạo

export default function Layout() {
  return (
    <CartProvider>
      <PaperProvider>
        <Stack screenOptions={{
          headerStyle: { backgroundColor: '#133470' },
          headerTintColor: '#FFF',
          headerTitleStyle: { fontWeight: 'bold' },
          headerShadowVisible: false, // Xóa đường kẻ ngang dưới header
        }}>
          <Stack.Screen name="index" options={{ title: 'Bán hàng' }} />
          <Stack.Screen name="cart" options={{ title: 'Giỏ hàng' }} />
        </Stack>
      </PaperProvider>
    </CartProvider>
  );
}