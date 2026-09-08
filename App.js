import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import axios from 'axios';

// Disable iOS HTTP caching globally so pull-to-refresh always gets fresh data
axios.defaults.headers.common['Cache-Control'] = 'no-cache';
axios.defaults.headers.common['Pragma'] = 'no-cache';
import DashboardScreen from './screens/DashboardScreen';
import TradesScreen from './screens/TradesScreen';
import HistoryScreen from './screens/HistoryScreen';
import RunsScreen from './screens/RunsScreen';

const Tab = createBottomTabNavigator();

export const API_URL = 'http://44.223.36.122:8001';

function TabIcon({ emoji, focused }) {
  return (
    <View style={{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: 18, opacity: focused ? 1 : 0.3 }}>{emoji}</Text>
    </View>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={{
            headerShown: false,
            tabBarStyle: {
              backgroundColor: '#0d1117',
              borderTopColor: '#21262d',
            },
            tabBarActiveTintColor: '#58a6ff',
            tabBarInactiveTintColor: '#8b949e',
            tabBarLabelStyle: { fontSize: 10 },
          }}
        >
          <Tab.Screen
            name="Dashboard"
            component={DashboardScreen}
            options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="📡" focused={focused} /> }}
          />
          <Tab.Screen
            name="Trades"
            component={TradesScreen}
            options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="📈" focused={focused} /> }}
          />
          <Tab.Screen
            name="History"
            component={HistoryScreen}
            options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="📊" focused={focused} /> }}
          />
          <Tab.Screen
            name="Runs"
            component={RunsScreen}
            options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="⚙️" focused={focused} /> }}
          />
        </Tab.Navigator>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}
