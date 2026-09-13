"use client";

import Link from "next/link";

/* ------------------------------------------------------------------ layout */

export function AccountCard({
  title,
  hint,
  action,
  children,
  id,
}: {
  title?: string;
  hint?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  id?: string;
}) {
  return (
    <section className="acc-card" id={id}>
      {(title || action) && (
        <header className="acc-card-head">
          <div className="min-w-0">
            {title && <h2 className="acc-card-title">{title}</h2>}
            {hint && <p className="acc-card-hint">{hint}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </header>
      )}
      <div className="acc-card-body">{children}</div>
    </section>
  );
}

export function Row({
  label,
  hint,
  children,
  htmlFor,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  htmlFor?: string;
}) {
  return (
    <div className="acc-row">
      <div className="acc-row-label">
        <label htmlFor={htmlFor} className="acc-label">
          {label}
        </label>
        {hint && <p className="acc-hint">{hint}</p>}
      </div>
      <div className="acc-row-control">{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ inputs */

export function Chip({
  on,
  onClick,
  children,
  disabled,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      disabled={disabled}
      onClick={onClick}
      className={`acc-chip ${on ? "is-on" : ""}`}
    >
      {on && (
        <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.6" aria-hidden>
          <path d="M3.5 8.4 6.5 11.3 12.5 5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      {children}
    </button>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  name,
}: {
  value: T;
  options: { value: T; label: string; hint?: string }[];
  onChange: (v: T) => void;
  name: string;
}) {
  return (
    <div className="acc-seg" role="radiogroup" aria-label={name}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          title={o.hint}
          onClick={() => onChange(o.value)}
          className={`acc-seg-btn ${value === o.value ? "is-on" : ""}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  hint,
  id,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
  id: string;
}) {
  return (
    <div className="acc-toggle-row">
      <div className="min-w-0">
        <label htmlFor={id} className="acc-toggle-label">
          {label}
        </label>
        {hint && <p className="acc-hint">{hint}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`acc-switch ${checked ? "is-on" : ""}`}
      >
        <span className="acc-switch-knob" />
      </button>
    </div>
  );
}

export function TextInput({
  id,
  value,
  onChange,
  placeholder,
  type = "text",
  disabled,
  autoComplete,
  error,
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
  autoComplete?: string;
  error?: string;
}) {
  return (
    <>
      <input
        id={id}
        className={`auth-input ${error ? "has-error" : ""}`}
        value={value}
        type={type}
        disabled={disabled}
        autoComplete={autoComplete}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
      {error && <span className="auth-error">{error}</span>}
    </>
  );
}

export function SelectInput<T extends string>({
  id,
  value,
  onChange,
  options,
  disabled,
}: {
  id?: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  disabled?: boolean;
}) {
  return (
    <select
      id={id}
      className="auth-input acc-select"
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value as T)}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

/* ------------------------------------------------------------ empty states */

export function EmptyState({
  icon,
  title,
  body,
  ctaLabel,
  ctaHref,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  ctaLabel?: string;
  ctaHref?: string;
}) {
  return (
    <div className="acc-empty">
      <span className="acc-empty-icon" aria-hidden>
        {icon}
      </span>
      <p className="acc-empty-title">{title}</p>
      <p className="acc-empty-body">{body}</p>
      {ctaLabel && ctaHref && (
        <Link href={ctaHref} className="btn btn-brand btn-sm mt-4">
          {ctaLabel}
        </Link>
      )}
    </div>
  );
}

/* ----------------------------------------------------------------- assorted */

export function StatTile({
  value,
  label,
  href,
}: {
  value: number | string;
  label: string;
  href?: string;
}) {
  const inner = (
    <>
      <span className="acc-stat-value">{value}</span>
      <span className="acc-stat-label">{label}</span>
    </>
  );
  return href ? (
    <Link href={href} className="acc-stat is-link">
      {inner}
    </Link>
  ) : (
    <div className="acc-stat">{inner}</div>
  );
}

export function DangerRow({
  title,
  body,
  actionLabel,
  onAction,
}: {
  title: string;
  body: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="acc-danger-row">
      <div className="min-w-0">
        <p className="acc-toggle-label">{title}</p>
        <p className="acc-hint">{body}</p>
      </div>
      <button type="button" className="acc-danger-btn" onClick={onAction}>
        {actionLabel}
      </button>
    </div>
  );
}
