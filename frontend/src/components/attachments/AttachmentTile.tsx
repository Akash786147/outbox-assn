import { FileText, X } from "lucide-react";
import { formatBytes } from "@/utils/format";

interface AttachmentTileProps {
  name: string;
  size: number;
  previewUrl?: string | null;
  onClick?: () => void;
  onRemove?: () => void;
}

export function AttachmentTile({ name, size, previewUrl, onClick, onRemove }: AttachmentTileProps) {
  return (
    <div className="group relative w-64 overflow-hidden rounded-xl bg-neutral-50">
      <button type="button" onClick={onClick} disabled={!onClick} className="block w-full text-left">
        <div className="flex h-36 items-center justify-center bg-neutral-100">
          {previewUrl ? (
            <img src={previewUrl} alt={name} className="h-full w-full object-cover" />
          ) : (
            <FileText className="h-10 w-10 text-neutral-400" />
          )}
        </div>
        <div className="px-3 py-2">
          <p className="truncate text-[15px]">{name}</p>
          <p className="text-xs text-neutral-500">{formatBytes(size)}</p>
        </div>
      </button>

      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${name}`}
          className="absolute top-2 right-2 rounded-full bg-black/60 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
