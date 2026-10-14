import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Clock, Send } from "lucide-react";
import { getErrorMessage } from "@/api/client";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { EmailList } from "@/components/emails/EmailList";
import { EmailToolbar } from "@/components/emails/EmailToolbar";
import { useDebounce } from "@/hooks/useDebounce";
import { emailKeys, useEmails } from "@/hooks/useEmails";
import { useInboxStore } from "@/store/inboxStore";
import type { EmailTab } from "@/types";

const EMPTY_COPY: Record<EmailTab, { title: string; description: string }> = {
  scheduled: { title: "No scheduled emails", description: "Emails you schedule will show up here until they are sent." },
  sent: { title: "No sent emails yet", description: "Once your scheduled emails go out, you'll see them here." },
};

export default function InboxPage({ tab }: { tab: EmailTab }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { search, statusFilter, reset } = useInboxStore();
  const debouncedSearch = useDebounce(search.trim());

  useEffect(() => reset(), [tab, reset]);

  const query = useEmails({ tab, status: statusFilter ?? undefined, q: debouncedSearch || undefined });
  const emails = useMemo(() => query.data?.pages.flatMap((p) => p.items) ?? [], [query.data]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: emailKeys.all });
  const isSearching = Boolean(debouncedSearch || statusFilter);

  const empty = isSearching ? (
    <EmptyState icon={<Clock className="h-6 w-6" />} title="No matching emails" description="Try a different search or filter." />
  ) : (
    <EmptyState
      icon={tab === "scheduled" ? <Clock className="h-6 w-6" /> : <Send className="h-6 w-6" />}
      {...EMPTY_COPY[tab]}
      action={
        <Button variant="outline" className="mt-2 rounded-full" onClick={() => navigate("/compose")}>
          Compose new email
        </Button>
      }
    />
  );

  return (
    <>
      <EmailToolbar tab={tab} onRefresh={refresh} refreshing={query.isFetching && !query.isFetchingNextPage} />
      <div className="flex-1 overflow-y-auto">
        <EmailList
          emails={emails}
          loading={query.isPending}
          error={query.isError ? getErrorMessage(query.error) : null}
          empty={empty}
          hasMore={Boolean(query.hasNextPage)}
          loadingMore={query.isFetchingNextPage}
          onLoadMore={() => query.fetchNextPage()}
          onRetry={() => query.refetch()}
        />
      </div>
    </>
  );
}
