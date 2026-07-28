import React, { useEffect, useState } from 'react';
import { Tabs, usePathname, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { getStyles } from '@/styles/GlobalStyles';

const tabNavItems = [
  { name: 'dashboard', label: 'Dashboard', icon: 'pie-chart-outline', focusedIcon: 'pie-chart' },
  { name: 'askai', label: 'Ask AI', icon: 'chatbubble-ellipses-outline', focusedIcon: 'chatbubble-ellipses' },
  { name: 'properties', label: 'Properties', icon: 'home-outline', focusedIcon: 'home' },
  { name: 'transactions', label: 'Transactions', icon: 'swap-horizontal-outline', focusedIcon: 'swap-horizontal' },
  { name: 'accounts', label: 'Accounts', icon: 'wallet-outline', focusedIcon: 'wallet' },
  { name: 'entities', label: 'Entities', icon: 'people-outline', focusedIcon: 'people' },
  { name: 'useraccount', label: 'Settings', icon: 'person-outline', focusedIcon: 'person' },
] as const;

export default function TabLayout() {
  const colorScheme = 'light'; //useColorScheme() ?? 'light';
  const styles = getStyles(colorScheme);
  const router = useRouter();
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const isCompactWebNav = isWeb && width < 980;
  const [isWebMenuOpen, setIsWebMenuOpen] = useState(false);
  const webNavTheme = {
    pageBg: '#f3f6fa',
    shellBg: '#ffffff',
    shellBorder: '#d8e1eb',
    shellInset: '#eef3f8',
    title: '#0f172a',
    subtitle: '#64748b',
    text: '#334155',
    textMuted: '#64748b',
    activeBg: '#ecfdf3',
    activeBorder: '#b7ebcf',
    activeText: '#15803d',
  } as const;

  const isActiveTab = (name: string) => pathname === `/${name}` || pathname.endsWith(`/${name}`);

  useEffect(() => {
    setIsWebMenuOpen(false);
  }, [pathname]);

  return (
    <View style={{ flex: 1 }}>
      {isWeb && (
        <View
          style={{
            backgroundColor: webNavTheme.pageBg,
            borderBottomWidth: 1,
            borderBottomColor: webNavTheme.shellInset,
            paddingHorizontal: 18,
            paddingVertical: 12,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
              backgroundColor: webNavTheme.shellBg,
              borderWidth: 1,
              borderColor: webNavTheme.shellBorder,
              borderRadius: 14,
              paddingHorizontal: 14,
              paddingVertical: 10,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  backgroundColor: '#e8f5ee',
                  borderWidth: 1,
                  borderColor: '#cfe9da',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 10,
                }}
              >
                <Ionicons name="layers-outline" size={15} color="#15803d" />
              </View>
              <View>
                <Text style={{ fontSize: 18, fontWeight: '800', color: webNavTheme.title }}>BrickLedger</Text>
                {!isCompactWebNav && <Text style={{ fontSize: 11, color: webNavTheme.subtitle, marginTop: 1 }}>Portfolio Intelligence</Text>}
              </View>
            </View>
            {isCompactWebNav ? (
              <TouchableOpacity
                onPress={() => setIsWebMenuOpen((prev) => !prev)}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 11,
                  borderWidth: 1,
                  borderColor: isWebMenuOpen ? webNavTheme.activeBorder : webNavTheme.shellBorder,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: isWebMenuOpen ? webNavTheme.activeBg : webNavTheme.shellBg,
                }}
                accessibilityLabel="Toggle navigation menu"
              >
                <Ionicons name={isWebMenuOpen ? 'close' : 'menu'} size={19} color={isWebMenuOpen ? webNavTheme.activeText : webNavTheme.text} />
              </TouchableOpacity>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                {tabNavItems.map((item) => {
                  const active = isActiveTab(item.name);
                  return (
                    <TouchableOpacity
                      key={item.name}
                      onPress={() => router.push(`/${item.name}`)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingHorizontal: 11,
                        paddingVertical: 8,
                        borderRadius: 9,
                        backgroundColor: active ? webNavTheme.activeBg : 'transparent',
                        borderWidth: active ? 1 : 0,
                        borderColor: webNavTheme.activeBorder,
                      }}
                    >
                      <Ionicons
                        name={(active ? item.focusedIcon : item.icon) as any}
                        size={16}
                        color={active ? webNavTheme.activeText : webNavTheme.textMuted}
                        style={{ marginRight: 6 }}
                      />
                      <Text style={{ fontSize: 13, fontWeight: active ? '700' : '500', color: active ? webNavTheme.activeText : webNavTheme.text }}>
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
          {isCompactWebNav && isWebMenuOpen && (
            <View
              style={{
                marginTop: 10,
                borderWidth: 1,
                borderColor: webNavTheme.shellBorder,
                borderRadius: 12,
                backgroundColor: webNavTheme.shellBg,
                overflow: 'hidden',
              }}
            >
              {tabNavItems.map((item) => {
                const active = isActiveTab(item.name);
                return (
                  <TouchableOpacity
                    key={item.name}
                    onPress={() => router.push(`/${item.name}`)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: 13,
                      paddingVertical: 11,
                      backgroundColor: active ? webNavTheme.activeBg : webNavTheme.shellBg,
                      borderBottomWidth: item.name === tabNavItems[tabNavItems.length - 1].name ? 0 : 1,
                      borderBottomColor: webNavTheme.shellInset,
                    }}
                  >
                    <Ionicons
                      name={(active ? item.focusedIcon : item.icon) as any}
                      size={16}
                      color={active ? webNavTheme.activeText : webNavTheme.textMuted}
                      style={{ marginRight: 8 }}
                    />
                    <Text style={{ fontSize: 14, fontWeight: active ? '700' : '500', color: active ? webNavTheme.activeText : webNavTheme.text }}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      )}

      <Tabs
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: styles.button.backgroundColor,
          tabBarInactiveTintColor: '#aaa',
          tabBarStyle: isWeb
            ? { display: 'none' }
            : { backgroundColor: styles.card.backgroundColor, borderTopWidth: 0, height: 60 },
          tabBarLabelStyle: { fontSize: 13, marginBottom: 6 },
          tabBarIcon: ({ color, focused }) => {
            if (route.name === 'dashboard') {
              return <Ionicons name={focused ? 'pie-chart' : 'pie-chart-outline'} size={24} color={color} />;
            }
            if (route.name === 'askai') {
              return <Ionicons name={focused ? 'chatbubble-ellipses' : 'chatbubble-ellipses-outline'} size={24} color={color} />;
            }
            if (route.name === 'properties') {
              return <Ionicons name={focused ? 'home' : 'home-outline'} size={24} color={color} />;
            }
            if (route.name === 'accounts') {
              return <Ionicons name={focused ? 'wallet' : 'wallet-outline'} size={24} color={color} />;
            }
            if (route.name === 'transactions') {
              return <Ionicons name={focused ? 'swap-horizontal' : 'swap-horizontal-outline'} size={24} color={color} />;
            }
            if (route.name === 'entities') {
              return <Ionicons name={focused ? 'people' : 'people-outline'} size={24} color={color} />;
            }
            if (route.name === 'useraccount') {
              return <Ionicons name={focused ? 'person' : 'person-outline'} size={24} color={color} />;
            }
            return null;
          },
        })}
      >
        <Tabs.Screen name="dashboard" options={{ tabBarLabel: 'Dashboard' }} />
        <Tabs.Screen name="askai" options={{ tabBarLabel: 'Ask AI' }} />
        <Tabs.Screen name="properties" options={{ tabBarLabel: 'Properties' }} />
        <Tabs.Screen name="transactions" options={{ tabBarLabel: 'Transactions' }} />
        <Tabs.Screen name="accounts" options={{ tabBarLabel: 'Accounts' }} />
        <Tabs.Screen name="entities" options={{ tabBarLabel: 'Entities' }} />
        <Tabs.Screen name="useraccount" options={{ tabBarLabel: 'Settings' }} />
      </Tabs>
    </View>
  );
}
