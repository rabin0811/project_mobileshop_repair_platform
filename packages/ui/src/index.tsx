import {
  forwardRef,
  type ButtonHTMLAttributes,
  type ElementType,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import {
  REPAIR_STAGE_LABELS,
  REPAIR_STAGES,
  type RepairStage,
} from '@mobileshop/shared';

/** Merge conditional class names without pulling in another dependency. */
export function cn(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ');
}

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

const buttonVariants: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-white hover:bg-accent-hover',
  secondary: 'border border-line bg-raised text-ink hover:bg-surface',
  ghost: 'text-ink-muted hover:bg-surface hover:text-ink',
  danger: 'bg-danger text-white hover:bg-red-700',
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-11 px-4 text-sm',
  lg: 'h-12 px-5 text-base',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading = false, className, children, disabled, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-md font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60',
        buttonVariants[variant],
        buttonSizes[size],
        className,
      )}
      {...rest}
    >
      {loading && (
        <span
          aria-hidden
          className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      )}
      {children}
    </button>
  );
});

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
}

export function Card({ interactive = false, className, ...rest }: CardProps) {
  const hasPadding = /(^|\s)p[trblxy]?-/.test(className ?? '');
  return (
    <div
      className={cn(
        'rounded-lg border border-line bg-surface shadow-card',
        !hasPadding && 'p-6',
        interactive && 'transition-shadow hover:shadow-lg',
        className,
      )}
      {...rest}
    />
  );
}

export function Container({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8', className)} {...rest} />;
}

export type BadgeTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info';

const badgeTones: Record<BadgeTone, string> = {
  neutral: 'bg-surface text-ink-muted',
  accent: 'bg-accent-soft text-accent',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
  info: 'bg-info-soft text-info',
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  dot?: boolean;
}

export function Badge({ tone = 'neutral', dot = false, className, children, ...rest }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold',
        badgeTones[tone],
        className,
      )}
      {...rest}
    >
      {dot && <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export function Skeleton({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div aria-hidden className={cn('animate-pulse rounded-md bg-line/70', className)} {...rest} />;
}

interface FieldChromeProps {
  id?: string;
  label?: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}

function FieldChrome({ id, label, error, hint, children }: FieldChromeProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-ink">
          {label}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-xs text-danger">{error}</p>
      ) : hint ? (
        <p className="text-xs text-ink-muted">{hint}</p>
      ) : null}
    </div>
  );
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, id, name, className, ...rest },
  ref,
) {
  const inputId = id ?? name;
  return (
    <FieldChrome id={inputId} label={label} error={error} hint={hint}>
      <input
        ref={ref}
        id={inputId}
        name={name}
        aria-invalid={error ? true : undefined}
        className={cn(
          'h-11 w-full rounded-md border bg-raised px-3 text-sm text-ink placeholder:text-ink-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20',
          error ? 'border-danger' : 'border-line',
          className,
        )}
        {...rest}
      />
    </FieldChrome>
  );
});

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, error, hint, id, name, className, children, ...rest },
  ref,
) {
  const selectId = id ?? name;
  return (
    <FieldChrome id={selectId} label={label} error={error} hint={hint}>
      <select
        ref={ref}
        id={selectId}
        name={name}
        aria-invalid={error ? true : undefined}
        className={cn(
          'h-11 w-full rounded-md border bg-raised px-3 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20',
          error ? 'border-danger' : 'border-line',
          className,
        )}
        {...rest}
      >
        {children}
      </select>
    </FieldChrome>
  );
});

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, hint, id, name, className, ...rest },
  ref,
) {
  const textareaId = id ?? name;
  return (
    <FieldChrome id={textareaId} label={label} error={error} hint={hint}>
      <textarea
        ref={ref}
        id={textareaId}
        name={name}
        aria-invalid={error ? true : undefined}
        className={cn(
          'min-h-28 w-full rounded-md border bg-raised px-3 py-2 text-sm text-ink placeholder:text-ink-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20',
          error ? 'border-danger' : 'border-line',
          className,
        )}
        {...rest}
      />
    </FieldChrome>
  );
});

export interface EmptyStateProps extends HTMLAttributes<HTMLDivElement> {
  icon?: ElementType;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action, className, ...rest }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-line bg-surface px-6 py-12 text-center',
        className,
      )}
      {...rest}
    >
      {Icon ? (
        <Icon className="h-8 w-8 text-ink-muted" aria-hidden />
      ) : (
        <span aria-hidden className="h-8 w-8 rounded-full border-2 border-line" />
      )}
      <div>
        <p className="text-base font-semibold text-ink">{title}</p>
        {description && <p className="mt-1 text-sm text-ink-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export interface StatTileProps {
  label: string;
  value: string;
  icon?: ElementType;
  className?: string;
}

export function StatTile({ label, value, icon: Icon, className }: StatTileProps) {
  return (
    <Card className={cn('flex items-start justify-between gap-4', className)}>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">{label}</p>
        <p className="mt-2 text-2xl font-bold tabular-nums text-ink">{value}</p>
      </div>
      {Icon && (
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-soft text-accent">
          <Icon className="h-5 w-5" aria-hidden />
        </span>
      )}
    </Card>
  );
}

export interface StageTrackerProps {
  current: RepairStage | null;
  className?: string;
}

export function StageTracker({ current, className }: StageTrackerProps) {
  const currentIndex = current ? REPAIR_STAGES.indexOf(current) : -1;
  return (
    <ol className={cn('flex w-full gap-1 overflow-x-auto pb-1', className)} aria-label="Repair progress">
      {REPAIR_STAGES.map((stage, index) => {
        const done = currentIndex >= 0 && index < currentIndex;
        const active = index === currentIndex;
        return (
          <li key={stage} className="flex min-w-24 flex-1 flex-col items-center gap-2 text-center">
            <span
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-full border text-xs font-bold',
                done && 'border-accent bg-accent text-white',
                active && 'border-accent bg-accent-soft text-accent ring-2 ring-accent/20',
                !done && !active && 'border-line bg-raised text-ink-muted',
              )}
            >
              {done ? '✓' : index + 1}
            </span>
            <span className={cn('text-[11px] leading-tight', active ? 'font-semibold text-ink' : 'text-ink-muted')}>
              {REPAIR_STAGE_LABELS[stage]}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export interface BookingStepperProps {
  steps: string[];
  current: number;
  className?: string;
}

export function BookingStepper({ steps, current, className }: BookingStepperProps) {
  return (
    <ol className={cn('flex items-center gap-2', className)} aria-label="Booking steps">
      {steps.map((step, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <li key={step} className="flex flex-1 items-center gap-2">
            <span
              className={cn(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                done && 'bg-accent text-white',
                active && 'bg-accent-soft text-accent ring-2 ring-accent/20',
                !done && !active && 'border border-line bg-raised text-ink-muted',
              )}
            >
              {done ? '✓' : index + 1}
            </span>
            <span className={cn('hidden text-xs font-medium sm:inline', active ? 'text-ink' : 'text-ink-muted')}>
              {step}
            </span>
            {index < steps.length - 1 && (
              <span aria-hidden className={cn('h-px flex-1', done ? 'bg-accent' : 'bg-line')} />
            )}
          </li>
        );
      })}
    </ol>
  );
}
