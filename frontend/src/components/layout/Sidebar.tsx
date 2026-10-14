import { NavLink, useNavigate } from "react-router-dom";
import { Clock, Send } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { useEmailStats } from "@/hooks/useEmails";
import { cn } from "@/utils/cn";
import { UserMenu } from "./UserMenu";

interface NavItemProps {
  to: string;
  icon: ReactNode;
  label: string;
  count?: number;
}

function NavItem({ to, icon, label, count }: NavItemProps) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-3 rounded-xl px-4 py-2.5 text-[15px] transition-colors",
          isActive ? "bg-brand-soft font-semibold" : "text-neutral-700 hover:bg-surface",
        )
      }
    >
      {icon}
      <span className="flex-1">{label}</span>
      <span className="text-sm font-normal text-neutral-500">{count ?? "-"}</span>
    </NavLink>
  );
}

export function Sidebar() {
  const navigate = useNavigate();
  const { data: stats } = useEmailStats();

  return (
    <aside className="flex w-72 shrink-0 flex-col gap-4 px-4 py-5">
      <div className="px-2">
        <Logo />
      </div>

      <UserMenu />

      <Button variant="outline" className="rounded-full" onClick={() => navigate("/compose")}>
        Compose
      </Button>

      <nav className="mt-4 flex flex-col gap-1">
        <p className="px-4 pb-1 text-xs tracking-wide text-muted">CORE</p>
        <NavItem to="/scheduled" icon={<Clock className="h-5 w-5" />} label="Scheduled" count={stats?.scheduled} />
        <NavItem to="/sent" icon={<Send className="h-5 w-5" />} label="Sent" count={stats?.sent} />
      </nav>
    </aside>
  );
}
