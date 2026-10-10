"use client";

import { useEffect, useRef, type ReactNode, type RefObject } from "react";

type OverlayProps = {
  children: ReactNode;
  descriptionId?: string;
  labelId: string;
  onClose: () => void;
  open: boolean;
  returnFocusRef?: RefObject<HTMLElement | null>;
};

function ModalSurface({
  children,
  descriptionId,
  labelId,
  onClose,
  open,
  returnFocusRef,
  variant
}: OverlayProps & { variant: "dialog" | "drawer" }) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) {
      dialog.close();
      // Safari không focus nút khi bấm nên dialog không tự trả focus; trả về nút mở sau khi đóng.
      returnFocusRef?.current?.focus();
    }
  }, [open, returnFocusRef]);

  return (
    <dialog
      ref={dialogRef}
      className={`ui-overlay ui-overlay-${variant}`}
      aria-labelledby={labelId}
      aria-describedby={descriptionId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="ui-overlay-surface">{children}</div>
    </dialog>
  );
}

export function Dialog(props: OverlayProps) {
  return <ModalSurface {...props} variant="dialog" />;
}

export function Drawer(props: OverlayProps) {
  return <ModalSurface {...props} variant="drawer" />;
}

export function Tabs({
  activeId,
  ariaLabel,
  items,
  onChange
}: {
  activeId: string;
  ariaLabel: string;
  items: Array<{ id: string; label: string }>;
  onChange: (id: string) => void;
}) {
  return (
    <div className="ui-tabs" role="tablist" aria-label={ariaLabel}>
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          role="tab"
          aria-selected={item.id === activeId}
          tabIndex={item.id === activeId ? 0 : -1}
          onClick={() => onChange(item.id)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

