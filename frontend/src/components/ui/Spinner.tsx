import { cn } from "@/utils/cn";

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn("inline-block h-6 w-6 animate-spin rounded-full border-2 border-current border-t-transparent", className)}
    />
  );
}

export function PageLoader() {
  return (
    <div className="flex h-full min-h-60 items-center justify-center text-brand">
      <Spinner />
    </div>
  );
}
