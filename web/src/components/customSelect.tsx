import { useEffect, useRef, useState } from "react";
import "../styles/customSelect.css";

interface Option {
  label: string;
  value: string;
}

interface CustomSelectProps {
  options: Option[];
  placeholder?: string;
  onChange?: (value: string) => void;
}

export default function CustomSelect({
  options,
  placeholder = "Selecione...",
  onChange,
}: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Option | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSelect(option: Option) {
    setSelected(option);
    setOpen(false);
    onChange?.(option.value);
  }

  return (
    <div className={`custom-select ${open ? "open" : ""}`} ref={ref}>
      <button
        type="button"
        className="select-trigger"
        onClick={() => setOpen(!open)}
      >
        {selected ? selected.label : placeholder}
        <span className="arrow" />
      </button>

      <ul className="select-options">
        {options.map((option) => (
          <li
            key={option.value}
            onClick={() => handleSelect(option)}
            className={selected?.value === option.value ? "selected" : ""}
          >
            {option.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
