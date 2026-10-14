interface NumberFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  suffix?: string;
}

export function NumberField({ label, value, onChange, suffix }: NumberFieldProps) {
  return (
    <label className="flex items-center gap-3 text-[15px]">
      {label}
      <input
        type="number"
        min={0}
        inputMode="numeric"
        value={value}
        placeholder="00"
        onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))}
        className="w-20 rounded-lg border border-line px-3 py-2 outline-none placeholder:text-neutral-300 focus:border-brand"
      />
      {suffix && <span className="-ml-1 text-sm text-muted">{suffix}</span>}
    </label>
  );
}
