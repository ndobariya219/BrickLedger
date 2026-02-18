import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getStyles } from '@/styles/GlobalStyles';
import { useColorScheme } from '@/components/useColorScheme';
import { EntityProvider } from '@/components/EntityContext';
import { UserInitialTabIcon } from '@/components/UserInitialTabIcon';

export default function TabLayout() {
  const colorScheme = 'light'; //useColorScheme() ?? 'light';
  const styles = getStyles(colorScheme);
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: styles.button.backgroundColor,
        tabBarInactiveTintColor: '#aaa',
        tabBarStyle: { backgroundColor: styles.card.backgroundColor, borderTopWidth: 0, height: 60 },
        tabBarLabelStyle: { fontSize: 13, marginBottom: 6 },
        tabBarIcon: ({ color, size, focused }) => {
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
  );
}
