import * as React from 'react';
import { cn } from '@/lib/utils/cn';

/**
 * Form field wrapper.
 *
 * Wires the label, description and error message to the control with real ids
 * and `aria-describedby` / `aria-invalid`, so keyboard and screen-reader users
 * get the same information sighted users do. Every input in the product goes
 * through this rather than a bare `<label>` next to a bare `<input>`.
 */
export interface FieldProps {
  /** The control's `id`. Passed to children through a render prop. */
  id: string;
  label: string;
  description?: string;
  error?: string | string[];
  required?: boolean;
  /** Right-aligned content on the label row, e.g. a character counter. */
  aside?: React.ReactNode;
  className?: string;
  children: (props: {
    id: string;
    'aria-describedby': string | undefined;
    'aria-invalid': boolean | undefined;
    required: boolean | undefined;
  }) => React.ReactNode;
}

export function Field({
  id,
  label,
  description,
  error,
  required,
  aside,
  className,
  children,
}: FieldProps) {
  const messages = Array.isArray(error) ? error : error ? [error] : [];
  const hasError = messages.length > 0;
  const descriptionId = description ? `${id}-description` : undefined;
  const errorId = hasError ? `${id}-error` : undefined;
  const describedBy = [descriptionId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-medium text-ink">
          {label}
          {required ? (
            <span className="ml-1 text-danger" aria-hidden="true">
              *
            </span>
          ) : null}
          {required ? <span className="sr-only"> (required)</span> : null}
        </label>
        {aside}
      </div>

      {description ? (
        <p id={descriptionId} className="text-xs text-ink-muted">
          {description}
        </p>
      ) : null}

      {children({
        id,
        'aria-describedby': describedBy,
        'aria-invalid': hasError || undefined,
        required: required || undefined,
      })}

      {hasError ? (
        <p id={errorId} className="text-xs font-medium text-danger" role="alert">
          {messages.join(' ')}
        </p>
      ) : null}
    </div>
  );
}

/** A group of related fields with a visible legend. */
export function FieldSet({
  legend,
  description,
  children,
  className,
}: {
  legend: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <fieldset className={cn('flex flex-col gap-4', className)}>
      <legend className="text-sm font-semibold text-ink">{legend}</legend>
      {description ? <p className="-mt-2 text-xs text-ink-muted">{description}</p> : null}
      {children}
    </fieldset>
  );
}
