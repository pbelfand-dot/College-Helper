'use client';

import { Search, X } from 'lucide-react';
import * as React from 'react';
import { cn } from '@/lib/utils/cn';
import { Button } from './button';
import { Input, Select } from './input';

/**
 * Search + filter row shared by every list page.
 *
 * State lives in the parent so filtering stays synchronous and testable; this
 * component is presentation plus accessible labelling.
 */

export function FilterBar({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'border-line bg-surface flex flex-col gap-3 rounded-[var(--radius-lg)] border px-4 py-3 sm:flex-row sm:flex-wrap sm:items-end',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function SearchField({
  value,
  onChange,
  label = 'Search',
  placeholder = 'Search…',
  id = 'search',
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  id?: string;
  className?: string;
}) {
  return (
    <div className={cn('flex min-w-0 flex-1 flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-ink-muted text-xs font-medium">
        {label}
      </label>
      <div className="relative">
        <Search
          className="text-ink-subtle pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
          aria-hidden="true"
        />
        <Input
          id={id}
          type="search"
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          className="pl-9"
        />
        {value ? (
          <button
            type="button"
            onClick={() => onChange('')}
            aria-label="Clear search"
            className="text-ink-subtle hover:bg-surface-muted hover:text-ink absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 transition-colors"
          >
            <X className="size-3.5" aria-hidden="true" />
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function FilterSelect<T extends string>({
  id,
  label,
  value,
  onChange,
  options,
  allLabel = 'All',
  className,
}: {
  id: string;
  label: string;
  value: T | 'all';
  onChange: (value: T | 'all') => void;
  options: { value: T; label: string }[];
  allLabel?: string;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-1.5 sm:w-48', className)}>
      <label htmlFor={id} className="text-ink-muted text-xs font-medium">
        {label}
      </label>
      <Select id={id} value={value} onChange={(event) => onChange(event.target.value as T | 'all')}>
        <option value="all">{allLabel}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
    </div>
  );
}

/** Shown when filters are active, so "no results" never looks like data loss. */
export function ActiveFilterNotice({
  shown,
  total,
  onClear,
}: {
  shown: number;
  total: number;
  onClear: () => void;
}) {
  if (shown === total) return null;
  return (
    <p className="text-ink-muted flex items-center gap-2 text-xs">
      <span>
        Showing {shown} of {total}
      </span>
      <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={onClear}>
        Clear filters
      </Button>
    </p>
  );
}
