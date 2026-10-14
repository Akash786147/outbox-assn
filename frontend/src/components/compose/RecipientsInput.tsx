import { useState, type ClipboardEvent, type KeyboardEvent } from "react";
import toast from "react-hot-toast";
import { Upload, X } from "lucide-react";
import { extractEmails, isValidEmail, mergeEmails } from "@/utils/emails";

const VISIBLE_CHIPS = 3;

interface RecipientsInputProps {
  value: string[];
  onChange: (emails: string[]) => void;
  onUploadClick: () => void;
}

export function RecipientsInput({ value, onChange, onUploadClick }: RecipientsInputProps) {
  const [draft, setDraft] = useState("");
  const [expanded, setExpanded] = useState(false);

  const add = (emails: string[]) => onChange(mergeEmails(value, emails));
  const remove = (email: string) => onChange(value.filter((e) => e !== email));

  const commitDraft = () => {
    const email = draft.trim().replace(/,$/, "").toLowerCase();
    if (!email) return;
    if (!isValidEmail(email)) {
      toast.error(`"${email}" is not a valid email`);
      return;
    }
    add([email]);
    setDraft("");
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (["Enter", ",", " ", "Tab"].includes(e.key) && draft) {
      e.preventDefault();
      commitDraft();
    }
    if (e.key === "Backspace" && !draft && value.length) remove(value[value.length - 1]);
  };

  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const emails = extractEmails(e.clipboardData.getData("text"));
    if (emails.length > 1) {
      e.preventDefault();
      add(emails);
    }
  };

  const visible = expanded ? value : value.slice(0, VISIBLE_CHIPS);
  const hidden = value.length - visible.length;

  return (
    <div className="flex items-center gap-4 border-b border-line py-2">
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
        {visible.map((email) => (
          <span
            key={email}
            className="group inline-flex items-center gap-1 rounded-full border border-brand bg-brand-soft px-3 py-0.5 text-sm"
          >
            {email}
            <button type="button" onClick={() => remove(email)} className="hidden group-hover:block" aria-label={`Remove ${email}`}>
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        ))}
        {hidden > 0 && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="rounded-full border border-brand bg-brand-soft px-2.5 py-0.5 text-sm"
          >
            +{hidden}
          </button>
        )}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          onBlur={commitDraft}
          placeholder={value.length ? "" : "recipient@example.com"}
          className="min-w-48 flex-1 py-1 text-[17px] outline-none placeholder:text-neutral-400"
        />
      </div>

      <button type="button" onClick={onUploadClick} className="flex shrink-0 items-center gap-2 text-[17px] text-brand">
        <Upload className="h-4 w-4" /> Upload List
      </button>
    </div>
  );
}
