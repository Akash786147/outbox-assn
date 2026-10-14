import type { InputHTMLAttributes } from "react";
import { cn } from "@/utils/cn";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full rounded-xl bg-surface px-5 py-4 text-[15px] outline-none placeholder:text-neutral-500 focus:ring-2 focus:ring-brand/30",
        className,
      )}
      {...props}
    />
  );
}
