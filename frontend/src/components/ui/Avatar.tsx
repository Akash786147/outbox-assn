import { cn } from "@/utils/cn";
import { initials } from "@/utils/format";

interface AvatarProps {
  name: string;
  src?: string | null;
  className?: string;
}

export function Avatar({ name, src, className }: AvatarProps) {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        referrerPolicy="no-referrer"
        className={cn("h-10 w-10 shrink-0 rounded-full object-cover", className)}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand text-lg font-medium text-white",
        className,
      )}
    >
      {initials(name)}
    </div>
  );
}
