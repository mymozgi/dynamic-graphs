import { useState, type ReactNode } from "react";
import { ChevronIcon } from "./icons";

export function Section({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className={`insp-section ${open ? "is-open" : ""}`}>
      <button type="button" className="insp-section__head" onClick={() => setOpen((o) => !o)}>
        <span>{title}</span>
        <ChevronIcon size={16} className="insp-section__chev" />
      </button>
      {open && <div className="insp-section__body">{children}</div>}
    </section>
  );
}
