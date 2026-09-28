import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { View } from 'react-native';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded] = useFonts({
    JakartaRegular: require('@/assets/fonts/PlusJakartaSans-Regular.ttf'),
    JakartaMedium: require('@/assets/fonts/PlusJakartaSans-Medium.ttf'),
    JakartaSemiBold: require('@/assets/fonts/PlusJakartaSans-SemiBold.ttf'),
    JakartaBold: require('@/assets/fonts/PlusJakartaSans-Bold.ttf'),
    JakartaExtraBold: require('@/assets/fonts/PlusJakartaSans-ExtraBold.ttf'),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return <View style={{ flex: 1, backgroundColor: '#231A2B' }} />;
  }

  return (
    <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
      <Stack.Screen name="index" />
    </Stack>
  );
}
