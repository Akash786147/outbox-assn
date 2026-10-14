import { useCallback, useRef, useState, type ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { ArrowLeft, ChevronDown, Clock, Paperclip } from "lucide-react";
import { getErrorMessage } from "@/api/client";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { NumberField } from "@/components/compose/NumberField";
import { RecipientsInput } from "@/components/compose/RecipientsInput";
import { RichTextEditor } from "@/components/compose/RichTextEditor";
import { SendLaterPopover } from "@/components/compose/SendLaterPopover";
import { useClickOutside } from "@/hooks/useClickOutside";
import { useScheduleEmails, useSenders } from "@/hooks/useEmails";
import { extractEmails, mergeEmails } from "@/utils/emails";
import { formatDateTime } from "@/utils/format";

export default function ComposePage() {
  const navigate = useNavigate();
  const { data: senders = [], isPending: sendersLoading } = useSenders();
  const schedule = useScheduleEmails();

  const [pickedSenderId, setSenderId] = useState<number | null>(null);
  const [recipients, setRecipients] = useState<string[]>([]);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState({ html: "", isEmpty: true });
  const [delaySeconds, setDelaySeconds] = useState("");
  const [hourlyLimit, setHourlyLimit] = useState("");
  const [sendAt, setSendAt] = useState<Date | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [popoverOpen, setPopoverOpen] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const closePopover = useCallback(() => setPopoverOpen(false), []);
  useClickOutside(popoverRef, closePopover, popoverOpen);

  const senderId = pickedSenderId ?? senders[0]?.id ?? null;

  const onBodyChange = useCallback((html: string, isEmpty: boolean) => setBody({ html, isEmpty }), []);

  const onFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const emails = extractEmails(await file.text());
    if (emails.length === 0) {
      toast.error(`No email addresses found in ${file.name}`);
      return;
    }
    setRecipients((current) => mergeEmails(current, emails));
    setUploadedFiles((files) => [...files, file.name]);
    toast.success(`${emails.length} email addresses detected in ${file.name}`);
  };

  const validate = () => {
    if (!senderId) return "Pick a sender";
    if (recipients.length === 0) return "Add at least one recipient";
    if (!subject.trim()) return "Subject is required";
    if (body.isEmpty) return "Email body is empty";
    if (!hourlyLimit || Number(hourlyLimit) < 1) return "Hourly limit must be at least 1";
    if (sendAt && sendAt.getTime() < Date.now()) return "Scheduled time is in the past";
    return null;
  };

  const onSubmit = () => {
    const error = validate();
    if (error) return toast.error(error);

    schedule.mutate(
      {
        senderId: senderId!,
        recipients,
        subject: subject.trim(),
        body: body.html,
        startTime: sendAt?.toISOString(),
        delaySeconds: Number(delaySeconds || 0),
        hourlyLimit: Number(hourlyLimit),
      },
      {
        onSuccess: (res) => {
          toast.success(`${res.count} emails scheduled`);
          navigate("/scheduled");
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  };

  return (
    <div className="min-h-screen pb-16">
      <header className="flex items-center gap-3 px-6 py-5">
        <IconButton label="Back" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-6 w-6 text-neutral-900" />
        </IconButton>
        <h1 className="flex-1 text-3xl">Compose New Email</h1>

        <IconButton label="Upload leads file" onClick={() => fileRef.current?.click()} className="relative text-brand">
          <Paperclip className="h-6 w-6" />
          {uploadedFiles.length > 0 && (
            <span className="absolute right-0.5 bottom-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-surface text-[10px] text-neutral-700">
              {uploadedFiles.length}
            </span>
          )}
        </IconButton>

        <div ref={popoverRef} className="relative flex items-center gap-3">
          <IconButton label="Send later" onClick={() => setPopoverOpen((o) => !o)} className="text-brand">
            <Clock className="h-6 w-6" />
          </IconButton>
          <Button variant="outline" className="rounded-full px-7" loading={schedule.isPending} onClick={onSubmit}>
            {sendAt ? "Send Later" : "Send"}
          </Button>
          {popoverOpen && (
            <SendLaterPopover
              value={sendAt}
              onCancel={closePopover}
              onDone={(date) => {
                setSendAt(date);
                closePopover();
              }}
            />
          )}
        </div>
      </header>

      <input ref={fileRef} type="file" accept=".csv,.txt,text/csv,text/plain" hidden onChange={onFileUpload} />

      <div className="mx-auto flex max-w-6xl flex-col gap-5 px-6 pt-4 lg:pl-56 lg:pr-24">
        <div className="flex items-center gap-6">
          <span className="w-16 text-[15px]">From</span>
          <div className="relative">
            <select
              value={senderId ?? ""}
              onChange={(e) => setSenderId(Number(e.target.value))}
              disabled={sendersLoading}
              className="appearance-none rounded-lg bg-surface py-2.5 pr-10 pl-3 text-[17px] outline-none"
            >
              {sendersLoading && <option>Loading senders...</option>}
              {senders.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.email}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-neutral-500" />
          </div>
        </div>

        <div className="flex items-center gap-6">
          <span className="w-16 text-[15px]">To</span>
          <div className="flex-1">
            <RecipientsInput value={recipients} onChange={setRecipients} onUploadClick={() => fileRef.current?.click()} />
          </div>
        </div>
        {recipients.length > 0 && (
          <p className="-mt-3 pl-22 text-xs text-muted">{recipients.length} email addresses detected</p>
        )}

        <div className="flex items-center gap-6">
          <span className="w-16 text-[15px]">Subject</span>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject"
            className="flex-1 border-b border-line py-2 text-[17px] outline-none placeholder:text-neutral-400"
          />
        </div>

        <div className="flex flex-wrap items-center gap-8">
          <NumberField label="Delay between 2 emails" value={delaySeconds} onChange={setDelaySeconds} suffix="sec" />
          <NumberField label="Hourly Limit" value={hourlyLimit} onChange={setHourlyLimit} />
          {sendAt && (
            <span className="text-sm text-neutral-500">
              Starts {formatDateTime(sendAt)}{" "}
              <button type="button" className="text-brand hover:underline" onClick={() => setSendAt(null)}>
                (send now instead)
              </button>
            </span>
          )}
        </div>

        <RichTextEditor onChange={onBodyChange} />
      </div>
    </div>
  );
}
