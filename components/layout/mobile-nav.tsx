'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import * as React from 'react';
import { cn } from '@/lib/utils/cn';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { isActivePath, navItems, primaryNavItems } from './nav-items';
import { Logo } from './logo';

/** Top bar shown below `lg`, with a full menu behind the button. */
export function MobileTopBar() {
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();

  // Close the menu when navigation actually happens. Adjusting state during
  // render on a changed prop is the documented alternative to an effect here.
  const [lastPath, setLastPath] = React.useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(false);
  }

  return (
    <header className="border-line bg-surface sticky top-0 z-40 flex items-center justify-between border-b px-4 py-2.5 lg:hidden">
      <Logo />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <button
            type="button"
            className="border-line-strong text-ink hover:bg-surface-muted inline-flex items-center gap-1.5 rounded-[var(--radius)] border px-3 py-1.5 text-sm transition-colors"
          >
            <Menu className="size-4" aria-hidden="true" />
            Menu
          </button>
        </DialogTrigger>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Go to</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <nav aria-label="All pages">
              <ul className="flex flex-col gap-0.5">
                {navItems.map((item) => {
                  const active = isActivePath(pathname, item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={active ? 'page' : undefined}
                        className={cn(
                          'flex items-center gap-2.5 rounded-[var(--radius)] px-3 py-2.5 text-sm transition-colors',
                          active
                            ? 'bg-accent-soft text-accent-text font-medium'
                            : 'text-ink hover:bg-surface-muted',
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
          </DialogBody>
        </DialogContent>
      </Dialog>
    </header>
  );
}

/** Bottom bar with the five most-used destinations. */
export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="border-line bg-surface sticky bottom-0 z-40 border-t pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <ul className="flex">
        {primaryNavItems.map((item) => {
          const active = isActivePath(pathname, item.href);
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex flex-col items-center gap-0.5 px-1 py-2 text-[11px] transition-colors',
                  active ? 'text-accent-text font-medium' : 'text-ink-muted',
                )}
              >
                <item.icon className="size-5" aria-hidden="true" />
                <span className="truncate">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
