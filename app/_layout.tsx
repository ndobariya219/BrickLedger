import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, usePathname } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/components/useColorScheme';
import { getStyles } from '@/styles/GlobalStyles';
import { getCurrentUser } from '@/lib/supabase/auth';
import { useRouter } from 'expo-router';
import { Logger } from '@/lib/logger';
import { EntityProvider } from '@/components/EntityContext';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <EntityProvider><RootLayoutNav /></EntityProvider>;
}

function RootLayoutNav() {
  const colorScheme = 'light'; //useColorScheme();
  const router = useRouter();
  const pathname = usePathname();

  // Log the current pathname for debugging
  Logger.debug('[RootLayoutNav] Current pathname', { pathname });

  useEffect(() => {
    async function checkAuth() {
      const user = await getCurrentUser();
      Logger.debug('[RootLayoutNav] checkAuth user', { user });
      if (!user && pathname !== '/auth') {
        router.replace('/auth');
      }
    }
    checkAuth();
  }, [router, pathname]);

  // Use Material You background color from GlobalStyles
  const styles = getStyles(colorScheme ?? 'light');
  const backgroundColor = styles.container.backgroundColor;
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor,
          },
        }}
      >
        <Stack.Screen name="auth" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="properties/PropertyDetailsScreen" options={{ headerShown: false }} />
      </Stack>
    </ThemeProvider>
  );
}
