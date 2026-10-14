import { Clock } from "lucide-react";
import type { Email } from "@/types";
import { cn } from "@/utils/cn";
import { formatChipTime } from "@/utils/format";

const base = "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[13px] font-medium";

export function StatusChip({ email }: { email: Email }) {
  switch (email.status) {
    case "scheduled":
      return (
        <span className={cn(base, "border-orange-200 bg-orange-50 text-orange-600")}>
          <Clock className="h-3.5 w-3.5" />
          {formatChipTime(email.scheduledAt)}
        </span>
      );
    case "sending":
      return <span className={cn(base, "border-blue-200 bg-blue-50 text-blue-600")}>Sending</span>;
    case "sent":
      return <span className={cn(base, "border-neutral-200 bg-neutral-100 text-neutral-600")}>Sent</span>;
    case "failed":
      return <span className={cn(base, "border-red-200 bg-red-50 text-red-600")}>Failed</span>;
  }
}
