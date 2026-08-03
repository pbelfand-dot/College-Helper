import {
  Award,
  CalendarDays,
  FileText,
  GraduationCap,
  LayoutDashboard,
  ListChecks,
  MessageSquareText,
  Settings,
  Sparkles,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Shown in the mobile bottom bar (space is limited to five). */
  primary?: boolean;
}

export const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, primary: true },
  { href: '/colleges', label: 'Colleges', icon: GraduationCap, primary: true },
  { href: '/applications', label: 'Applications', icon: ListChecks, primary: true },
  { href: '/essays', label: 'Essays', icon: FileText, primary: true },
  { href: '/activities', label: 'Activities', icon: Sparkles },
  { href: '/recommendations', label: 'Recommendations', icon: Users },
  { href: '/scholarships', label: 'Scholarships', icon: Award },
  { href: '/calendar', label: 'Calendar', icon: CalendarDays, primary: true },
  { href: '/coach', label: 'Coach', icon: MessageSquareText },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export const primaryNavItems = navItems.filter((item) => item.primary);

/** `/colleges/abc` should light up the `/colleges` link, but `/` should not. */
export function isActivePath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
