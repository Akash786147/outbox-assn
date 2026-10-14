import type { ReactNode } from "react";
import type { Email } from "@/types";
import { Button } from "@/components/ui/Button";
import { PageLoader } from "@/components/ui/Spinner";
import { EmailRow } from "./EmailRow";

interface EmailListProps {
  emails: Email[];
  loading: boolean;
  error: string | null;
  empty: ReactNode;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  onRetry: () => void;
}

export function EmailList({ emails, loading, error, empty, hasMore, loadingMore, onLoadMore, onRetry }: EmailListProps) {
  if (loading) return <PageLoader />;

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 py-24 text-center">
        <p className="text-sm text-red-600">{error}</p>
        <Button variant="outline" onClick={onRetry}>
          Try again
        </Button>
      </div>
    );
  }

  if (emails.length === 0) return <>{empty}</>;

  return (
    <div className="pb-6">
      <ul>
        {emails.map((email) => (
          <EmailRow key={email.id} email={email} />
        ))}
      </ul>
      {hasMore && (
        <div className="flex justify-center pt-4">
          <Button variant="ghost" loading={loadingMore} onClick={onLoadMore}>
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}
