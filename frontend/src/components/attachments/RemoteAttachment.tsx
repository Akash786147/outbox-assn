import { useQuery } from "@tanstack/react-query";
import { emailApi } from "@/api/emails";
import { useObjectUrl } from "@/hooks/useObjectUrl";
import type { AttachmentMeta } from "@/types";
import { isImage } from "@/utils/files";
import { AttachmentTile } from "./AttachmentTile";

// the file endpoint needs the auth header, so it is fetched as a blob instead of a plain <img src>
export function RemoteAttachment({ attachment }: { attachment: AttachmentMeta }) {
  const { data: blob } = useQuery({
    queryKey: ["attachment", attachment.id],
    queryFn: () => emailApi.attachment(attachment.id),
    staleTime: Infinity,
  });
  const url = useObjectUrl(blob);

  return (
    <AttachmentTile
      name={attachment.filename}
      size={attachment.size}
      previewUrl={isImage(attachment.contentType) ? url : null}
      onClick={url ? () => window.open(url, "_blank") : undefined}
    />
  );
}
