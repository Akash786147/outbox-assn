import { memo } from "react";
import { useNavigate } from "react-router-dom";
import type { Email } from "@/types";
import { formatDateTime, stripHtml } from "@/utils/format";
import { StarButton } from "./StarButton";
import { StatusChip } from "./StatusChip";

function EmailRowComponent({ email }: { email: Email }) {
  const navigate = useNavigate();
  const preview = stripHtml(email.body);

  return (
    <li
      onClick={() => navigate(`/emails/${email.id}`)}
      className="flex cursor-pointer items-center gap-4 border-b border-line px-6 py-4 transition-colors hover:bg-neutral-50"
    >
      <p className="w-56 shrink-0 truncate text-[15px]">To: {email.toEmail}</p>

      <div className="flex min-w-0 flex-1 items-center gap-2">
        <StatusChip email={email} />
        <p className="truncate text-[15px]">
          <span className="font-medium">{email.subject}</span>
          {preview && <span className="text-muted"> - {preview}</span>}
        </p>
      </div>

      {email.sentAt && <span className="shrink-0 text-xs text-neutral-500">{formatDateTime(email.sentAt)}</span>}
      <StarButton id={email.id} starred={email.starred} />
    </li>
  );
}

export const EmailRow = memo(EmailRowComponent);
