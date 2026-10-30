import React, { lazy, Suspense, useId, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
const DayPicker = lazy(() =>
  import("react-day-picker").then((m) => ({ default: m.DayPicker })),
);
import { CalendarDays, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "./api.js";
import { calendarDate } from "../../shared/travel.js";
export const send = (path, body, method = "POST", headers) =>
  api(path, { method, body: JSON.stringify(body), headers });
export const useApi = (path, options = {}) =>
  useQuery({
    queryKey: [path],
    queryFn: ({ signal }) =>
      api(path, { signal }).then((r) =>
        r.meta?.serverTime && !Array.isArray(r.data)
          ? { ...r.data, serverTime: r.meta.serverTime }
          : r.data,
      ),
    ...options,
  });
export function ErrorMessage({ error }) {
  if (!error) return null;
  return (
    <div className="alert" role="alert">
      <strong>{error.message || String(error)}</strong>
      {error.details?.map((d, i) => (
        <p key={i}>
          {d.field}: {d.message}
        </p>
      ))}
      {error.requestId && <small>Support reference: {error.requestId}</small>}
    </div>
  );
}
export function Status({ children }) {
  return (
    <p className="status" role="status">
      {children}
    </p>
  );
}
export function Field({ label, error, children, ...props }) {
  const generated = useId(),
    id = props.id || generated;
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {children ? (
        children(id)
      ) : (
        <input
          {...props}
          id={id}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
        />
      )}
      {error && (
        <small id={`${id}-error`} className="field-error">
          {error}
        </small>
      )}
    </div>
  );
}
export function Modal({
  trigger,
  title,
  description,
  children,
  open,
  onOpenChange,
  variant = "",
  onCloseAutoFocus,
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      {trigger && <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>}
      <Dialog.Portal>
        <Dialog.Overlay className="overlay" />
        <Dialog.Content
          className={`modal ${variant}`}
          onCloseAutoFocus={onCloseAutoFocus}
        >
          <Dialog.Title>{title}</Dialog.Title>
          <Dialog.Description>{description}</Dialog.Description>
          {children}
          <Dialog.Close
            className="icon-button modal-close"
            aria-label="Close dialog"
          >
            <X size={20} />
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
export function DateField({ label, value, onChange, error, min, max, name }) {
  const [open, setOpen] = useState(false);
  let selected;
  try {
    calendarDate(value);
    selected = new Date(`${value}T12:00:00`);
  } catch {
    /* Invalid typing stays editable. */
  }
  return (
    <Field label={label} error={error}>
      {(id) => (
        <div className="date-control">
          <input
            id={id}
            name={name}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="YYYY-MM-DD"
            inputMode="numeric"
            aria-invalid={!!error}
            aria-describedby={error ? `${id}-error` : undefined}
          />
          <Modal
            open={open}
            onOpenChange={setOpen}
            title={label}
            description="Choose a date or type it in YYYY-MM-DD format."
            trigger={
              <button
                type="button"
                className="icon-button"
                aria-label={`Choose ${label.toLowerCase()}`}
              >
                <CalendarDays size={20} />
              </button>
            }
          >
            <Suspense fallback={<p role="status">Loading calendar…</p>}>
              <DayPicker
                mode="single"
                selected={selected}
                defaultMonth={selected}
                disabled={[
                  ...(min ? [{ before: new Date(`${min}T00:00:00`) }] : []),
                  ...(max ? [{ after: new Date(`${max}T23:59:59`) }] : []),
                ]}
                onSelect={(d) => {
                  if (d) {
                    onChange(
                      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
                    );
                    setOpen(false);
                  }
                }}
              />
            </Suspense>
          </Modal>
        </div>
      )}
    </Field>
  );
}
export function QueryState({ query, children }) {
  if (query.isPending) return <Status>Loading your journey…</Status>;
  if (query.error)
    return (
      <>
        <ErrorMessage error={query.error} />
        <button className="button secondary" onClick={() => query.refetch()}>
          Try again
        </button>
      </>
    );
  return children(query.data);
}
export function SearchField({
  value,
  onChange,
  label = "Search",
  placeholder,
  onCompositionChange,
}) {
  return (
    <Field label={label}>
      {(id) => (
        <div className="search-control">
          <input
            id={id}
            type="search"
            value={value}
            placeholder={placeholder}
            onCompositionStart={() => onCompositionChange?.(true)}
            onCompositionEnd={() => onCompositionChange?.(false)}
            onChange={(e) => onChange(e.target.value)}
          />
          {value && (
            <button
              className="icon-button"
              type="button"
              aria-label={`Clear ${label.toLowerCase()}`}
              onClick={() => {
                onChange("");
                document.getElementById(id)?.focus();
              }}
            >
              <X size={18} />
            </button>
          )}
        </div>
      )}
    </Field>
  );
}
export function storageRead(key) {
  try {
    return JSON.parse(localStorage.getItem(key));
  } catch {
    return null;
  }
}
export function storageWrite(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
