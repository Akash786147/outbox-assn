import { useEffect } from "react";
import { Outlet, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { useCurrentUser, useSlack } from "@/hooks/useAuth";
import { Sidebar } from "./Sidebar";

const SLACK_MESSAGES: Record<string, () => void> = {
  connected: () => toast.success("Slack connected"),
  cancelled: () => toast("Slack connection cancelled"),
  error: () => toast.error("Could not connect Slack, please try again"),
};

export function DashboardLayout() {
  useCurrentUser();
  const { refreshUser } = useSlack();
  const [params, setParams] = useSearchParams();
  const slackStatus = params.get("slack");

  // Slack OAuth redirects back here with ?slack=<status>
  useEffect(() => {
    if (!slackStatus) return;
    SLACK_MESSAGES[slackStatus]?.();
    refreshUser();
    setParams({}, { replace: true });
  }, [slackStatus, refreshUser, setParams]);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex min-w-0 flex-1 flex-col">
        <Outlet />
      </main>
    </div>
  );
}
