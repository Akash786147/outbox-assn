import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { getErrorMessage } from "@/api/client";
import { Avatar } from "@/components/ui/Avatar";
import { IconButton } from "@/components/ui/IconButton";
import { PageLoader } from "@/components/ui/Spinner";
import { StarButton } from "@/components/emails/StarButton";
import { StatusChip } from "@/components/emails/StatusChip";
import { RemoteAttachment } from "@/components/attachments/RemoteAttachment";
import { useEmail } from "@/hooks/useEmails";
import { useAuthStore } from "@/store/authStore";
import { formatDateTime } from "@/utils/format";

export default function EmailDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { data: email, isPending, isError, error } = useEmail(Number(id));

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center gap-3 px-6 py-5">
        <IconButton label="Back" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-6 w-6 text-neutral-900" />
        </IconButton>
        <h1 className="min-w-0 flex-1 truncate text-3xl">{email?.subject}</h1>
        {email && <StarButton id={email.id} starred={email.starred} />}
        {user && <Avatar name={user.name} src={user.avatar} />}
      </header>

      {isPending && <PageLoader />}
      {isError && <p className="py-24 text-center text-sm text-red-600">{getErrorMessage(error)}</p>}

      {email && (
        <article className="mx-auto w-full max-w-5xl px-6 py-4">
          <div className="flex gap-4">
            <Avatar name={email.senderName} className="h-12 w-12" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[17px]">
                  <span className="font-semibold">{email.senderName}</span>{" "}
                  <span className="text-sm text-neutral-500">&lt;{email.senderEmail}&gt;</span>
                </p>
                <span className="text-sm text-neutral-500">{formatDateTime(email.sentAt ?? email.scheduledAt)}</span>
              </div>
              <div className="mt-1 flex items-center gap-2 text-sm text-neutral-500">
                to {email.toEmail} <StatusChip email={email} />
              </div>

              <div className="rich-content mt-6" dangerouslySetInnerHTML={{ __html: email.body }} />

              {email.attachments.length > 0 && (
                <div className="mt-6 flex flex-wrap gap-4">
                  {email.attachments.map((attachment) => (
                    <RemoteAttachment key={attachment.id} attachment={attachment} />
                  ))}
                </div>
              )}

              {email.error && email.status === "failed" && (
                <p className="mt-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">Error: {email.error}</p>
              )}
              {email.previewUrl && (
                <a
                  href={email.previewUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-6 inline-flex items-center gap-1.5 text-sm text-brand hover:underline"
                >
                  View on Ethereal <ExternalLink className="h-4 w-4" />
                </a>
              )}
            </div>
          </div>
        </article>
      )}
    </div>
  );
}
