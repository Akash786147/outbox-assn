import type { MouseEvent } from "react";
import toast from "react-hot-toast";
import { Star } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";
import { useToggleStar } from "@/hooks/useEmails";
import { getErrorMessage } from "@/api/client";
import { cn } from "@/utils/cn";

export function StarButton({ id, starred }: { id: number; starred: boolean }) {
  const { mutate, isPending } = useToggleStar();

  const onClick = (e: MouseEvent) => {
    e.stopPropagation();
    mutate(id, { onError: (err) => toast.error(getErrorMessage(err)) });
  };

  return (
    <IconButton label={starred ? "Unstar" : "Star"} onClick={onClick} disabled={isPending}>
      <Star className={cn("h-5 w-5", starred ? "fill-yellow-400 text-yellow-400" : "text-neutral-300")} />
    </IconButton>
  );
}
