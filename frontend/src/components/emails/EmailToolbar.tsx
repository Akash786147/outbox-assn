import { useCallback, useRef, useState } from "react";
import { Check, Funnel, RotateCw, Search } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";
import { useClickOutside } from "@/hooks/useClickOutside";
import { useInboxStore } from "@/store/inboxStore";
import type { EmailStatus, EmailTab } from "@/types";
import { cn } from "@/utils/cn";

const FILTERS: Record<EmailTab, { label: string; value: EmailStatus | null }[]> = {
  scheduled: [
    { label: "All", value: null },
    { label: "Scheduled", value: "scheduled" },
    { label: "Sending", value: "sending" },
  ],
  sent: [
    { label: "All", value: null },
    { label: "Sent", value: "sent" },
    { label: "Failed", value: "failed" },
  ],
};

interface EmailToolbarProps {
  tab: EmailTab;
  onRefresh: () => void;
  refreshing: boolean;
}

export function EmailToolbar({ tab, onRefresh, refreshing }: EmailToolbarProps) {
  const { search, setSearch, statusFilter, setStatusFilter } = useInboxStore();
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  const closeFilter = useCallback(() => setFilterOpen(false), []);
  useClickOutside(filterRef, closeFilter, filterOpen);

  return (
    <div className="flex items-center gap-3 px-6 py-5">
      <label className="flex max-w-3xl flex-1 items-center gap-2 rounded-full bg-surface px-4 py-2.5">
        <Search className="h-4 w-4 text-neutral-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search"
          className="w-full bg-transparent text-[15px] outline-none placeholder:text-neutral-400"
        />
      </label>

      <div ref={filterRef} className="relative">
        <IconButton label="Filter" onClick={() => setFilterOpen((o) => !o)} className={cn(statusFilter && "text-brand")}>
          <Funnel className="h-5 w-5" />
        </IconButton>
        {filterOpen && (
          <div className="absolute right-0 z-20 mt-2 w-40 rounded-xl border border-line bg-white p-1.5 shadow-lg">
            {FILTERS[tab].map((f) => (
              <button
                key={f.label}
                onClick={() => {
                  setStatusFilter(f.value);
                  closeFilter();
                }}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-surface"
              >
                {f.label}
                {statusFilter === f.value && <Check className="h-4 w-4 text-brand" />}
              </button>
            ))}
          </div>
        )}
      </div>

      <IconButton label="Refresh" onClick={onRefresh}>
        <RotateCw className={cn("h-5 w-5", refreshing && "animate-spin")} />
      </IconButton>
    </div>
  );
}
