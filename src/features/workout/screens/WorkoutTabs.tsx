import React from 'react';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import WorkoutPrograms from './tabs/WorkoutPrograms';
import WorkoutExercise from './tabs/WorkoutExercise';
import WorkoutStats from './tabs/WorkoutStats';
import WorkoutHistory from './tabs/WorkoutHistory';
import WorkoutNotes from './tabs/WorkoutNotes';
import WorkoutTyr from './tabs/WorkoutTyr';
import { DietLogScreen } from '@features/diet';
import { useColors, textStyles } from '@shared/theme';

// The web workspace puts its workout tabs in one horizontal pill row
// (History / Programs / Notes / Statistics / Diet / Tyr). Mobile adds Exercise,
// the live-session screen the web has no equivalent for, so seven tabs have to
// fit: a scrollable top bar does that and matches the web layout. A bottom bar
// would squeeze all seven labels into the screen width.
const TopTab = createMaterialTopTabNavigator();

export default function WorkoutTabs() {
  const colors = useColors();

  return (
    <TopTab.Navigator
      initialRouteName="Exercise"
      screenOptions={{
        tabBarScrollEnabled: true,
        tabBarStyle: { backgroundColor: colors.background },
        tabBarActiveTintColor: colors.foreground,
        tabBarInactiveTintColor: colors.foregroundMuted,
        tabBarIndicatorStyle: { backgroundColor: colors.primary, height: 2 },
        tabBarLabelStyle: { ...textStyles.bodySmall, textTransform: 'none' },
        tabBarItemStyle: { width: 'auto', paddingHorizontal: 16 },
      }}
    >
      <TopTab.Screen name="Exercise" component={WorkoutExercise} />
      <TopTab.Screen name="History" component={WorkoutHistory} />
      <TopTab.Screen name="Programs" component={WorkoutPrograms} />
      <TopTab.Screen name="Notes" component={WorkoutNotes} />
      <TopTab.Screen name="Statistics" component={WorkoutStats} />
      <TopTab.Screen name="Diet" component={DietLogScreen} />
      <TopTab.Screen name="Tyr" component={WorkoutTyr} />
    </TopTab.Navigator>
  );
}
