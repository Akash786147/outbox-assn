import { useObjectUrl } from "@/hooks/useObjectUrl";
import { isImage } from "@/utils/files";
import { AttachmentTile } from "./AttachmentTile";

export function LocalAttachment({ file, onRemove }: { file: File; onRemove: () => void }) {
  const url = useObjectUrl(isImage(file.type) ? file : null);
  return <AttachmentTile name={file.name} size={file.size} previewUrl={url} onRemove={onRemove} />;
}
