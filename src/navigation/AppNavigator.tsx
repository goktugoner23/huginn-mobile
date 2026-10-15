import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '@shared/theme';
import { DrawerContent } from './DrawerContent';
import { findNavigationItem } from './navigation-config';
import { DashboardScreen } from '@features/dashboard';
import TasksScreen from '@features/tasks/screens/TasksScreen';
import TransactionTabs from '@features/transactions/screens/TransactionTabs';
import NotesStack from '@features/notes/screens/NotesStack';
import { CalendarScreen } from '@features/calendar/screens/CalendarScreen';
import WorkoutStack from '@features/workout/screens/WorkoutStack';
import { WTRegistryScreen } from '@features/wtregistry/screens/WTRegistryScreen';
import { HistoryScreen } from '@features/history/screens/HistoryScreen';
import MuninnScreen from '@features/muninn/screens/MuninnScreen';
import ServerScreen from '@features/server/screens/ServerScreen';
import ArtifactsScreen from '@features/artifacts/screens/ArtifactsScreen';
import DiagnosticsScreen from '@features/diagnostics/screens/DiagnosticsScreen';
import RepositoriesScreen from '@features/repositories/screens/RepositoriesScreen';
// Web exposes Investments as its own nav entry; mobile keeps the Transactions
// tab too, so both routes reach the same screen.
import { InvestmentsTab } from '@features/transactions/screens/InvestmentsTab';
import InsightsScreen from '@features/insights/screens/InsightsScreen';
import HealthScreen from '@features/health/screens/HealthScreen';

export type DrawerParamList = {
  Dashboard: undefined;
  Transactions: undefined;
  Tasks: undefined;
  Notes: undefined;
  Calendar: undefined;
  Workout: undefined;
  WTRegistry: undefined;
  History: undefined;
  Muninn: undefined;
  ServerScreen: undefined;
  Artifacts: undefined;
  Diagnostics: undefined;
  Repositories: undefined;
  Investments: undefined;
  Insights: undefined;
  Health: undefined;
};

const Drawer = createDrawerNavigator<DrawerParamList>();

const SCREENS: Array<{
  name: keyof DrawerParamList;
  component: React.ComponentType<any>;
}> = [
  { name: 'Dashboard', component: DashboardScreen },
  { name: 'Transactions', component: TransactionTabs },
  { name: 'Tasks', component: TasksScreen },
  { name: 'Notes', component: NotesStack },
  { name: 'Calendar', component: CalendarScreen },
  { name: 'Workout', component: WorkoutStack },
  { name: 'WTRegistry', component: WTRegistryScreen },
  { name: 'History', component: HistoryScreen },
  { name: 'Muninn', component: MuninnScreen },
  { name: 'ServerScreen', component: ServerScreen },
  { name: 'Artifacts', component: ArtifactsScreen },
  { name: 'Diagnostics', component: DiagnosticsScreen },
  { name: 'Repositories', component: RepositoriesScreen },
  { name: 'Investments', component: InvestmentsTab },
  { name: 'Insights', component: InsightsScreen },
  { name: 'Health', component: HealthScreen },
];

export function AppNavigator() {
  const { colors, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();

  return (
    <NavigationContainer
      documentTitle={{ enabled: false }}
      theme={{
        dark: isDark,
        colors: {
          background: colors.background,
          card: colors.sidebar,
          text: colors.foreground,
          border: colors.border,
          primary: colors.primary,
          notification: colors.accent,
        },
        fonts: {
          regular: { fontFamily: 'System', fontWeight: '400' },
          medium: { fontFamily: 'System', fontWeight: '500' },
          bold: { fontFamily: 'System', fontWeight: '700' },
          heavy: { fontFamily: 'System', fontWeight: '900' },
        },
      }}
    >
      <Drawer.Navigator
        initialRouteName="Dashboard"
        drawerContent={(props) => <DrawerContent {...props} />}
        screenOptions={{
          drawerStyle: {
            backgroundColor: colors.sidebar,
            width: 292,
          },
          headerShown: true,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.foreground,
          headerShadowVisible: false,
          sceneStyle: {},
        }}
      >
        {SCREENS.map(({ name, component }) => (
          <Drawer.Screen
            key={name}
            name={name}
            component={component}
            // Without this the header shows the route name, so "Huginn Server"
            // read "ServerScreen" and "WT Registry" read "WTRegistry".
            options={{ title: findNavigationItem(name)?.item.title ?? name }}
          />
        ))}
      </Drawer.Navigator>
    </NavigationContainer>
  );
}
