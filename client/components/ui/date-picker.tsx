import React, { useEffect, useRef, useState } from "react";
import { Input } from "./input";
import { DayPicker } from "react-day-picker";
import { CalendarDays } from "lucide-react";
import "react-day-picker/dist/style.css";

function fmt(d: Date | undefined) {
  if (!d) return "";
  return d.toISOString().slice(0, 10);
}

function parseDate(s?: string) {
  if (!s) return undefined;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return undefined;
  return d;
}

export interface DatePickerProps {
  id?: string;
  name?: string;
  value?: string; // yyyy-mm-dd
  defaultValue?: string;
  onChange?: (v: string) => void;
  className?: string;
  required?: boolean;
  min?: string; // yyyy-mm-dd
  max?: string;
  placeholder?: string;
}

export default function DatePicker({
  id,
  name,
  value,
  defaultValue,
  onChange,
  className,
  required,
  min,
  max,
  placeholder,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Date | undefined>(
    parseDate(value ?? defaultValue),
  );
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (value !== undefined) setSelected(parseDate(value));
  }, [value]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const handleSelect = (d?: Date) => {
    setSelected(d);
    setOpen(false);
    const s = fmt(d);
    if (onChange) onChange(s);
  };

  const disabled: any = {};
  if (min) disabled.before = parseDate(min);
  if (max) disabled.after = parseDate(max);

  return (
    <div className={className} ref={ref} style={{ position: "relative" }}>
      <div className="relative">
        <Input
          id={id}
          readOnly
          value={selected ? fmt(selected) : ""}
          placeholder={placeholder || "YYYY-MM-DD"}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          required={required}
          className="pr-9"
        />
        <button
          type="button"
          aria-label="Open calendar"
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setOpen((v) => !v);
          }}
        >
          <CalendarDays className="h-4 w-4" />
        </button>
      </div>
      {name && (
        <input
          type="hidden"
          name={name}
          value={selected ? fmt(selected) : ""}
        />
      )}
      {open && (
        <div
          className="absolute z-40 mt-1 rounded-md border bg-popover p-2 shadow-md"
          style={{ minWidth: 0 }}
        >
          <DayPicker
            mode="single"
            selected={selected}
            onSelect={handleSelect}
            disabled={disabled}
          />
        </div>
      )}
    </div>
  );
}
