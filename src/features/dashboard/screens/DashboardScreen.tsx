import React, { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { DrawerNavigationProp } from '@react-navigation/drawer';
import { useAppTheme } from '@shared/theme';
import { radius } from '@shared/theme/spacing';
import { Skeleton } from '@shared/components/ui/Skeleton';
import { navigationGroups } from '../../../navigation/navigation-config';
import type { DrawerParamList } from '../../../navigation/AppNavigator';
import { DashboardSnapshot } from '../types';
import { fetchDashboardSnapshot } from '../services';

import type { LucideIcon } from 'lucide-react-native';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

/** Outer list padding and the gap between the two columns. */
const LIST_PADDING = 16;
const COLUMN_GAP = 12;

interface CardData {
  route: string;
  title: string;
  blurb: string;
  group: string;
  icon: LucideIcon;
}

/**
 * Flatten nav groups into card data, skipping Dashboard itself. The icon comes
 * straight off the nav item, so a new nav entry gets its real icon here with no
 * second list to update.
 */
const CARDS: CardData[] = navigationGroups.flatMap((group) =>
  group.items
    .filter((item) => item.route !== 'Dashboard')
    .map((item) => ({
      route: item.route,
      title: item.title,
      blurb: item.blurb,
      group: group.title,
      icon: item.icon,
    })),
);

// ---------------------------------------------------------------------------
// Stat resolver
// ---------------------------------------------------------------------------

function getStatForRoute(
  route: string,
  snap: DashboardSnapshot | null,
): { value: string; label: string } | null {
  if (!snap) return null;
  switch (route) {
    case 'Transactions':
      return { value: String(snap.transactions.totalCount), label: 'total entries' };
    case 'Investments':
      return null; // no dedicated stat
    case 'Tasks':
      return { value: String(snap.tasks.incompleteCount), label: 'open tasks' };
    case 'Notes':
      return { value: String(snap.notes.totalCount), label: 'notes' };
    case 'Calendar':
      return { value: String(snap.calendar.upcomingCount), label: 'upcoming' };
    case 'Workout':
      return { value: String(snap.workout.totalCompletedWorkouts), label: 'workouts' };
    case 'WTRegistry':
      return { value: String(snap.wtRegistry.activeStudents), label: 'students' };
    case 'History':
      return { value: String(snap.history.total), label: 'records' };
    case 'Muninn':
      return null; // no stat
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

function DashboardCard({
  card,
  snapshot,
  loading,
  width,
  onPress,
}: {
  card: CardData;
  snapshot: DashboardSnapshot | null;
  loading: boolean;
  width: number;
  onPress: () => void;
}) {
  const { colors } = useAppTheme();
  const Icon = card.icon;
  const stat = getStatForRoute(card.route, snapshot);

  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: colors.border }}
      // A plain array, not a ({pressed}) => [...] function: the function form
      // was dropped here, so the card rendered with no width, padding, border
      // or background and each row sized its two cards to their own text.
      style={[
        styles.card,
        { width, backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      {/* Icon */}
      <View style={[styles.iconContainer, { backgroundColor: colors.cardIconBg }]}>
        <Icon size={22} color={colors.foregroundMuted} strokeWidth={1.8} />
      </View>

      {/* Group */}
      <Text style={[styles.groupLabel, { color: colors.foregroundMuted }]}>
        {card.group}
      </Text>

      {/* Title */}
      <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={1}>
        {card.title}
      </Text>

      {/* Blurb */}
      <Text style={[styles.blurb, { color: colors.foregroundMuted }]} numberOfLines={2}>
        {card.blurb}
      </Text>

      {/* Stat area */}
      {loading ? (
        <View style={[styles.statBox, { backgroundColor: colors.cardIconBg }]}>
          <Skeleton width={40} height={18} borderRadius={6} />
          <Skeleton width={60} height={11} borderRadius={4} style={{ marginTop: 4 }} />
        </View>
      ) : stat ? (
        <View style={[styles.statBox, { backgroundColor: colors.cardIconBg }]}>
          <Text style={[styles.statValue, { color: colors.foreground }]}>{stat.value}</Text>
          <Text style={[styles.statLabel, { color: colors.foregroundMuted }]}>{stat.label}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export function DashboardScreen() {
  const { colors } = useAppTheme();
  const navigation = useNavigation<DrawerNavigationProp<DrawerParamList>>();
  const { width: screenWidth } = useWindowDimensions();
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  const cardWidth = (screenWidth - LIST_PADDING * 2 - COLUMN_GAP) / 2;

  const loadSnapshot = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await fetchDashboardSnapshot();
      setSnapshot(snap);
    } catch {
      // Keep whatever we had before
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSnapshot();
  }, [loadSnapshot]);

  const renderCard = useCallback(
    ({ item }: { item: CardData }) => (
      <DashboardCard
        card={item}
        snapshot={snapshot}
        loading={loading}
        width={cardWidth}
        onPress={() => navigation.navigate(item.route as keyof DrawerParamList)}
      />
    ),
    [snapshot, loading, navigation, cardWidth],
  );

  return (
    <FlatList
      data={CARDS}
      renderItem={renderCard}
      keyExtractor={(item) => item.route}
      numColumns={2}
      contentContainerStyle={[styles.list, { backgroundColor: colors.background }]}
      style={{ backgroundColor: colors.background }}
      columnWrapperStyle={styles.row}
      showsVerticalScrollIndicator={false}
    />
  );
}

export default DashboardScreen;

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  list: {
    padding: LIST_PADDING,
    paddingBottom: 32,
  },
  row: {
    gap: COLUMN_GAP,
    marginBottom: COLUMN_GAP,
    // Keeps a lone card on the last row at half width instead of stretching it.
    justifyContent: 'flex-start',
  },
  card: {
    borderRadius: radius.card, // 28
    borderWidth: 1,
    padding: 16,
    gap: 6,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: radius.icon, // 18
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  groupLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  blurb: {
    fontSize: 12,
    lineHeight: 16,
    // Always two lines tall, so a one-line blurb and a two-line blurb put the
    // stat box of both cards in a row at the same y.
    height: 32,
  },
  statBox: {
    // Pushed to the bottom of the card; cards in a row stretch to the tallest,
    // so this keeps the stat boxes on one line.
    marginTop: 'auto',
    borderRadius: 22,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 11,
    marginTop: 2,
  },
});
