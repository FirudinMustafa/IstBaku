import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Accessible Field wrapper that auto-wires Label + Input + error message.
 * Use whenever an input has a visible label.
 */
interface FieldProps {
  id?: string;
  label?: React.ReactNode;
  error?: string;
  hint?: React.ReactNode;
  required?: boolean;
  labelClassName?: string;
  className?: string;
  children: (props: { id: string; 'aria-invalid'?: 'true'; 'aria-describedby'?: string }) => React.ReactNode;
}

export function Field({ id, label, error, hint, required, labelClassName, className, children }: FieldProps) {
  const reactId = React.useId();
  const fieldId = id ?? `f-${reactId}`;
  const errorId = `${fieldId}-error`;
  const hintId = `${fieldId}-hint`;
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined;
  return (
    <div className={className}>
      {label && (
        <label htmlFor={fieldId} className={cn('block text-xs font-medium text-[color:var(--fg-muted)] mb-1.5', labelClassName)}>
          {label}{required && <span aria-hidden="true" className="text-danger ml-0.5">*</span>}
        </label>
      )}
      {children({
        id: fieldId,
        ...(error ? { 'aria-invalid': 'true' as const } : {}),
        ...(describedBy ? { 'aria-describedby': describedBy } : {}),
      })}
      {hint && !error && (
        <p id={hintId} className="text-[11px] text-[color:var(--fg-muted)] mt-1">{hint}</p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-[11px] text-danger mt-1">{error}</p>
      )}
    </div>
  );
}

interface InputBaseProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** When provided alongside `label`, automatically renders a wired-up <label htmlFor=id>. */
  label?: React.ReactNode;
  /** Inline error text — sets aria-invalid and aria-describedby on the input, renders <p role="alert">. */
  error?: string;
  /** Optional hint text shown below the input when there is no error. */
  hint?: React.ReactNode;
  /** Class on the outer wrapper when label/error/hint is used. */
  wrapperClassName?: string;
  labelClassName?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputBaseProps>(
  ({ className, label, error, hint, wrapperClassName, labelClassName, id, required, ...props }, ref) => {
    const reactId = React.useId();
    const useWrapper = Boolean(label || error || hint);
    const inputId = id ?? (useWrapper ? undefined : `inp-${reactId}`);

    const inputEl = (idResolved: string | undefined, ariaInvalid?: 'true', ariaDescribedBy?: string) => (
      <input
        ref={ref}
        id={idResolved}
        required={required}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
        className={cn(
          'h-10 px-3.5 w-full rounded-xl bg-[color:var(--bg-elev)]',
          'border border-[color:var(--border)] hover:border-[color:var(--border-strong)]',
          'placeholder:text-[color:var(--fg-faint)]',
          'focus:outline-none focus:ring-2 focus:ring-[color:var(--ring)] focus:border-transparent',
          'transition-colors',
          error && 'border-danger focus:ring-danger/40',
          className,
        )}
        {...props}
      />
    );

    if (useWrapper) {
      return (
        <Field id={id} label={label} error={error} hint={hint} required={required} className={wrapperClassName} labelClassName={labelClassName}>
          {({ id: idResolved, ['aria-invalid']: ai, ['aria-describedby']: ad }) => inputEl(idResolved, ai, ad)}
        </Field>
      );
    }
    return inputEl(inputId);
  },
);
Input.displayName = 'Input';

interface TextareaBaseProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: React.ReactNode;
  error?: string;
  hint?: React.ReactNode;
  wrapperClassName?: string;
  labelClassName?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaBaseProps>(
  ({ className, label, error, hint, wrapperClassName, labelClassName, id, required, ...props }, ref) => {
    const reactId = React.useId();
    const useWrapper = Boolean(label || error || hint);
    const taId = id ?? (useWrapper ? undefined : `ta-${reactId}`);

    const el = (idResolved: string | undefined, ariaInvalid?: 'true', ariaDescribedBy?: string) => (
      <textarea
        ref={ref}
        id={idResolved}
        required={required}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
        className={cn(
          'min-h-[96px] p-3.5 w-full rounded-xl bg-[color:var(--bg-elev)] resize-y',
          'border border-[color:var(--border)] hover:border-[color:var(--border-strong)]',
          'placeholder:text-[color:var(--fg-faint)]',
          'focus:outline-none focus:ring-2 focus:ring-[color:var(--ring)] focus:border-transparent',
          error && 'border-danger focus:ring-danger/40',
          className,
        )}
        {...props}
      />
    );

    if (useWrapper) {
      return (
        <Field id={id} label={label} error={error} hint={hint} required={required} className={wrapperClassName} labelClassName={labelClassName}>
          {({ id: idResolved, ['aria-invalid']: ai, ['aria-describedby']: ad }) => el(idResolved, ai, ad)}
        </Field>
      );
    }
    return el(taId);
  },
);
Textarea.displayName = 'Textarea';

interface SelectBaseProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: React.ReactNode;
  error?: string;
  hint?: React.ReactNode;
  wrapperClassName?: string;
  labelClassName?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectBaseProps>(
  ({ className, label, error, hint, wrapperClassName, labelClassName, id, required, children, ...props }, ref) => {
    const reactId = React.useId();
    const useWrapper = Boolean(label || error || hint);
    const selId = id ?? (useWrapper ? undefined : `sel-${reactId}`);

    const el = (idResolved: string | undefined, ariaInvalid?: 'true', ariaDescribedBy?: string) => (
      <select
        ref={ref}
        id={idResolved}
        required={required}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
        className={cn(
          'h-10 px-3 pr-8 w-full rounded-xl bg-[color:var(--bg-elev)] appearance-none',
          'border border-[color:var(--border)] hover:border-[color:var(--border-strong)]',
          'focus:outline-none focus:ring-2 focus:ring-[color:var(--ring)] focus:border-transparent',
          'bg-no-repeat bg-[length:14px] bg-[position:right_10px_center]',
          'bg-[image:url("data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 fill=%22none%22 stroke=%22%2393a4bf%22 stroke-width=%222%22 viewBox=%220 0 24 24%22><path d=%22M6 9l6 6 6-6%22/></svg>")]',
          error && 'border-danger focus:ring-danger/40',
          className,
        )}
        {...props}
      >
        {children}
      </select>
    );

    if (useWrapper) {
      return (
        <Field id={id} label={label} error={error} hint={hint} required={required} className={wrapperClassName} labelClassName={labelClassName}>
          {({ id: idResolved, ['aria-invalid']: ai, ['aria-describedby']: ad }) => el(idResolved, ai, ad)}
        </Field>
      );
    }
    return el(selId);
  },
);
Select.displayName = 'Select';

/**
 * Standalone Label — accepts htmlFor (recommended). Kept for backward compatibility
 * with consumers that render `<Label>X</Label>` next to an `<Input id="x" />`.
 * NEW: pass `htmlFor` to wire it up properly.
 */
export const Label = ({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) => (
  <label
    className={cn('block text-xs font-medium text-[color:var(--fg-muted)] mb-1.5', className)}
    {...props}
  />
);
