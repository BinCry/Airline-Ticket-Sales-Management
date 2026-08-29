import Link from "next/link";
import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
  ReactNode
} from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ControlSize = "sm" | "md" | "lg";
type BadgeTone = "neutral" | "success" | "warning" | "danger" | "info";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ControlSize;
  loading?: boolean;
};

export function Button({
  children,
  className,
  disabled,
  loading = false,
  size = "md",
  type = "button",
  variant = "primary",
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      type={type}
      className={cx("button", `button-${variant}`, `control-${size}`, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
    >
      {loading ? <span className="control-spinner" aria-hidden="true" /> : null}
      <span>{loading ? "Đang xử lý…" : children}</span>
    </button>
  );
}

type ActionLinkProps = {
  href: string;
  children: ReactNode;
  className?: string;
  variant?: Exclude<ButtonVariant, "danger">;
  size?: ControlSize;
  prefetch?: boolean;
};

export function ActionLink({
  children,
  className,
  href,
  prefetch,
  size = "md",
  variant = "primary"
}: ActionLinkProps) {
  return (
    <Link
      href={href}
      prefetch={prefetch}
      className={cx("button", `button-${variant}`, `control-${size}`, className)}
    >
      {children}
    </Link>
  );
}

type CardProps = HTMLAttributes<HTMLElement> & {
  as?: "article" | "section" | "div";
  padding?: "sm" | "md" | "lg";
};

export function Card({
  as: Element = "div",
  children,
  className,
  padding = "md",
  ...props
}: CardProps) {
  return (
    <Element {...props} className={cx("ui-card", className)} data-padding={padding}>
      {children}
    </Element>
  );
}

export function Badge({
  children,
  className,
  tone = "neutral"
}: {
  children: ReactNode;
  className?: string;
  tone?: BadgeTone;
}) {
  return (
    <span className={cx("ui-badge", className)} data-tone={tone}>
      {children}
    </span>
  );
}

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  hint?: string;
  inputClassName?: string;
};

export function Field({
  className,
  error,
  hint,
  id,
  inputClassName,
  label,
  ...props
}: FieldProps) {
  const fieldId = id ?? props.name;
  const messageId = fieldId ? `${fieldId}-message` : undefined;

  return (
    <label className={cx("field", className)} htmlFor={fieldId}>
      <span>{label}</span>
      <input
        {...props}
        id={fieldId}
        className={inputClassName}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={error || hint ? messageId : undefined}
      />
      {error ? (
        <small id={messageId} className="field-error" role="alert">
          {error}
        </small>
      ) : hint ? (
        <small id={messageId}>{hint}</small>
      ) : null}
    </label>
  );
}

export type StepItem = {
  id: string;
  label: string;
};

export function Stepper({ current, items }: { current: number; items: StepItem[] }) {
  return (
    <ol
      className="ui-stepper"
      aria-label="Tiến trình"
      style={{ "--step-count": items.length } as React.CSSProperties}
    >
      {items.map((item, index) => (
        <li
          key={item.id}
          aria-current={index === current ? "step" : undefined}
          data-complete={index < current || undefined}
        >
          <span>{item.label}</span>
        </li>
      ))}
    </ol>
  );
}

export function Skeleton({
  height = 16,
  label = "Đang tải nội dung"
}: {
  height?: number | string;
  label?: string;
}) {
  return (
    <span className="ui-skeleton" style={{ height }} role="status">
      <span className="ui-visually-hidden">{label}</span>
    </span>
  );
}

export function StatePanel({
  action,
  description,
  title,
  tone = "neutral"
}: {
  action?: ReactNode;
  description: string;
  title: string;
  tone?: "neutral" | "danger";
}) {
  return (
    <section className="ui-state" data-tone={tone} aria-live={tone === "danger" ? "assertive" : "polite"}>
      <h2>{title}</h2>
      <p>{description}</p>
      {action}
    </section>
  );
}

export type DataColumn<Row> = {
  key: string;
  header: string;
  render: (row: Row) => ReactNode;
  mobileLabel?: string;
};

export function DataTable<Row>({
  caption,
  columns,
  getRowKey,
  rows
}: {
  caption: string;
  columns: Array<DataColumn<Row>>;
  getRowKey: (row: Row) => string;
  rows: Row[];
}) {
  return (
    <div className="ui-table-region">
      <table data-mobile-stack="true">
        <caption className="ui-visually-hidden">{caption}</caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} scope="col">{column.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={getRowKey(row)}>
              {columns.map((column) => (
                <td key={column.key} data-label={column.mobileLabel ?? column.header}>
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

