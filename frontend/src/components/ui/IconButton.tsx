import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/utils/cn";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
}

export function IconButton({ label, className, children, ...props }: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-surface hover:text-neutral-800 disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
