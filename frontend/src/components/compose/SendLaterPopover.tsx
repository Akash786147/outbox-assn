import { useState } from "react";
import { Button } from "@/components/ui/Button";

interface SendLaterPopoverProps {
  value: Date | null;
  onDone: (date: Date) => void;
  onCancel: () => void;
}

// datetime-local wants "yyyy-MM-ddTHH:mm" in local time
function toInputValue(date: Date) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function tomorrowAt(hour?: number) {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  if (hour !== undefined) date.setHours(hour, 0, 0, 0);
  return date;
}

const PRESETS = [
  { label: "Tomorrow", getDate: () => tomorrowAt() },
  { label: "Tomorrow, 10:00 AM", getDate: () => tomorrowAt(10) },
  { label: "Tomorrow, 11:00 AM", getDate: () => tomorrowAt(11) },
  { label: "Tomorrow, 3:00 PM", getDate: () => tomorrowAt(15) },
];

export function SendLaterPopover({ value, onDone, onCancel }: SendLaterPopoverProps) {
  const [input, setInput] = useState(value ? toInputValue(value) : "");
  const [error, setError] = useState("");
  const [minValue] = useState(() => toInputValue(new Date()));

  const done = () => {
    const date = new Date(input);
    if (!input || Number.isNaN(date.getTime())) return setError("Pick a date and time");
    if (date.getTime() < Date.now()) return setError("Time must be in the future");
    onDone(date);
  };

  return (
    <div className="absolute top-full right-0 z-30 mt-2 w-[360px] rounded-xl border border-line bg-white p-5 shadow-xl">
      <h3 className="mb-5 text-[17px] font-medium">Send Later</h3>

      <input
        type="datetime-local"
        value={input}
        min={minValue}
        onChange={(e) => {
          setInput(e.target.value);
          setError("");
        }}
        className="w-full border-b border-line pb-2 text-[15px] text-neutral-700 outline-none"
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}

      <ul className="mt-4 flex flex-col">
        {PRESETS.map((preset) => (
          <li key={preset.label}>
            <button
              type="button"
              onClick={() => setInput(toInputValue(preset.getDate()))}
              className="w-full rounded-lg py-2.5 text-left text-[15px] text-neutral-700 hover:text-brand"
            >
              {preset.label}
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-8 flex items-center justify-end gap-4">
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="outline" className="rounded-full px-7" onClick={done}>
          Done
        </Button>
      </div>
    </div>
  );
}
