"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";

export function Modal({ title, open, onClose, children }: { title: string; open: boolean; onClose: () => void; children: ReactNode }) {
  const headingId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog ref={dialogRef} className="detail-dialog" aria-labelledby={headingId} onCancel={onClose} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="dialog-heading"><h2 id={headingId}>{title}</h2><button className="icon-button" onClick={onClose} aria-label="Close dialog"><X size={22} /></button></div>
      <div className="dialog-body">{children}</div>
    </dialog>
  );
}
