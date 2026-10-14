import { useCallback, useRef, useState } from "react";
import toast from "react-hot-toast";
import { ChevronDown, LogOut, MessageSquare, Send, Unplug } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { getErrorMessage } from "@/api/client";
import { useLogout, useSlack } from "@/hooks/useAuth";
import { useClickOutside } from "@/hooks/useClickOutside";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/utils/cn";

const itemClass = "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-surface disabled:opacity-50";

export function UserMenu() {
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();
  const { connect, disconnect, test } = useSlack();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);
  useClickOutside(ref, close, open);

  if (!user) return null;

  const onError = (err: unknown) => toast.error(getErrorMessage(err));

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 rounded-2xl bg-surface px-3 py-3 text-left"
      >
        <Avatar name={user.name} src={user.avatar} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-medium">{user.name}</p>
          <p className="truncate text-xs text-neutral-500">{user.email}</p>
        </div>
        <ChevronDown className={cn("h-4 w-4 text-neutral-400 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute inset-x-0 top-full z-20 mt-2 rounded-xl border border-line bg-white p-1.5 shadow-lg">
          <p className="px-3 pt-1 pb-2 text-xs text-muted">
            {user.slack.connected ? `Slack: ${user.slack.channel ?? "connected"}` : "Slack not connected"}
          </p>

          {user.slack.connected ? (
            <>
              <button
                className={itemClass}
                disabled={test.isPending}
                onClick={() => test.mutate(undefined, { onSuccess: () => toast.success("Test message sent"), onError })}
              >
                <Send className="h-4 w-4" /> Send test to Slack
              </button>
              <button
                className={itemClass}
                disabled={disconnect.isPending}
                onClick={() => disconnect.mutate(undefined, { onSuccess: () => toast.success("Slack disconnected"), onError })}
              >
                <Unplug className="h-4 w-4" /> Disconnect Slack
              </button>
            </>
          ) : (
            <button className={itemClass} disabled={connect.isPending} onClick={() => connect.mutate(undefined, { onError })}>
              <MessageSquare className="h-4 w-4" /> Connect Slack
            </button>
          )}

          <div className="my-1 h-px bg-line" />
          <button className={cn(itemClass, "text-red-600")} onClick={logout}>
            <LogOut className="h-4 w-4" /> Logout
          </button>
        </div>
      )}
    </div>
  );
}
