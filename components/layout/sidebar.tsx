'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils/cn';
import { isActivePath, navItems } from './nav-items';
import { Logo } from './logo';

/** Desktop navigation. Hidden below `lg`, where the mobile bar takes over. */
export function Sidebar({ displayName }: { displayName: string | null }) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 border-r border-line bg-surface lg:flex lg:flex-col">
      <div className="px-5 py-5">
        <Logo />
      </div>

      <nav aria-label="Main" className="flex-1 overflow-y-auto px-3 pb-4">
        <ul className="flex flex-col gap-0.5">
          {navItems.map((item) => {
            const active = isActivePath(pathname, item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-2.5 rounded-[var(--radius)] px-3 py-2 text-sm transition-colors',
                    active
                      ? 'bg-accent-soft font-medium text-accent-text'
                      : 'text-ink-muted hover:bg-surface-muted hover:text-ink',
                  )}
                >
                  <item.icon className="size-4 shrink-0" aria-hidden="true" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {displayName ? (
        <div className="border-t border-line px-5 py-3.5">
          <p className="text-xs text-ink-subtle">Signed in as</p>
          <p className="truncate text-sm font-medium text-ink">{displayName}</p>
        </div>
      ) : null}
    </aside>
  );
}
