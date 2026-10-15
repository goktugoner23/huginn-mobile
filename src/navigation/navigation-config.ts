import type { LucideIcon } from 'lucide-react-native';
import {
  AlertTriangle,
  Bird,
  BookOpen,
  CalendarDays,
  CheckSquare,
  Clock,
  Dumbbell,
  FileCode2,
  GitFork,
  HeartPulse,
  Home,
  Server,
  Sigma,
  StickyNote,
  Telescope,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react-native';

export interface NavigationItem {
  title: string;
  route: string;
  icon: LucideIcon;
  blurb: string;
}

export interface NavigationGroup {
  id: string;
  title: string;
  items: NavigationItem[];
}

// Mirrors huginn-webapp's src/shared/config/dashboard-navigation.ts — same
// groups, same order, same titles, blurbs and icons. Manifest is deliberately
// left out of the mobile app.
export const navigationGroups: NavigationGroup[] = [
  {
    id: 'workspace',
    title: 'Workspace',
    items: [
      {
        title: 'Dashboard',
        route: 'Dashboard',
        icon: Home,
        blurb: 'Cross-module overview and launchpad',
      },
      {
        title: 'Transactions',
        route: 'Transactions',
        icon: Wallet,
        blurb: 'Money flow, budgets, and reports',
      },
      {
        title: 'Insights',
        route: 'Insights',
        icon: BookOpen,
        blurb: 'Monthly magazine — where the money went',
      },
      {
        title: 'Investments',
        route: 'Investments',
        icon: TrendingUp,
        blurb: 'Trades, thesis, and portfolio workspace',
      },
      {
        title: 'Tasks',
        route: 'Tasks',
        icon: CheckSquare,
        blurb: 'Action queue with focus views',
      },
      {
        title: 'Artifacts',
        route: 'Artifacts',
        icon: FileCode2,
        blurb: 'HTML artifacts from the vault',
      },
      {
        title: 'Notes',
        route: 'Notes',
        icon: StickyNote,
        blurb: 'Second brain and attachment library',
      },
      {
        title: 'Calendar',
        route: 'Calendar',
        icon: CalendarDays,
        blurb: 'Events, reminders, and planning rhythm',
      },
      {
        title: 'Workout',
        route: 'Workout',
        icon: Dumbbell,
        blurb: 'Programs, sessions, and progression',
      },
      {
        title: 'Health',
        route: 'Health',
        icon: HeartPulse,
        blurb: 'Apple Watch and iPhone health data',
      },
      {
        title: 'WT Registry',
        route: 'WTRegistry',
        icon: Users,
        blurb: 'Students, registrations, and seminars',
      },
    ],
  },
  {
    id: 'systems',
    title: 'Systems',
    items: [
      {
        title: 'History',
        route: 'History',
        icon: Clock,
        blurb: 'Unified timeline across the system',
      },
      {
        title: 'Repositories',
        route: 'Repositories',
        icon: GitFork,
        blurb: 'Forge and GitHub repository overview',
      },
      {
        title: 'Huginn Server',
        route: 'ServerScreen',
        icon: Server,
        blurb: 'Docker containers, resources, and server health',
      },
      {
        title: 'Diagnostics',
        route: 'Diagnostics',
        icon: AlertTriangle,
        blurb: 'Centralised error log across all services',
      },
    ],
  },
  {
    id: 'intelligence',
    title: 'Intelligence',
    items: [
      {
        title: 'Muninn',
        route: 'Muninn',
        icon: Bird,
        blurb: 'AI agent, memory, and conversation archive',
      },
      {
        title: 'Xikipedia',
        route: 'Xikipedia',
        icon: Telescope,
        blurb: 'Wikipedia as a discovery feed',
      },
      {
        title: 'Xikipedia CS',
        route: 'XikipediaCs',
        icon: Sigma,
        blurb: 'Computer science & mathematics feed',
      },
    ],
  },
];

export function findNavigationItem(routeName: string) {
  for (const group of navigationGroups) {
    for (const item of group.items) {
      if (item.route === routeName) {
        return { group, item };
      }
    }
  }
  return null;
}
