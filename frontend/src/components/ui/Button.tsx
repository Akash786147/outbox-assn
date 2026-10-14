import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/utils/cn";
import { Spinner } from "./Spinner";

type Variant = "primary" | "outline" | "soft" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
}

const variants: Record<Variant, string> = {
  primary: "bg-brand text-white hover:bg-brand-dark",
  outline: "border border-brand text-brand hover:bg-brand-soft",
  soft: "bg-brand-soft text-neutral-900 hover:bg-[#d6efdf]",
  ghost: "text-neutral-700 hover:bg-surface",
};

export function Button({ variant = "primary", loading, disabled, className, children, ...props }: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-[15px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60",
        variants[variant],
        className,
      )}
      {...props}
    >
      {loading && <Spinner className="h-4 w-4" />}
      {children}
    </button>
  );
}
