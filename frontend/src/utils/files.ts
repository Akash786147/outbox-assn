import type { AttachmentUpload } from "@/types";

export const MAX_ATTACHMENTS = 5;
export const MAX_ATTACHMENTS_BYTES = 5 * 1024 * 1024;

export const isImage = (contentType: string) => contentType.startsWith("image/");

function readAsBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    // result looks like "data:image/png;base64,AAAA", we only need the part after the comma
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export async function toAttachmentUploads(files: File[]): Promise<AttachmentUpload[]> {
  return Promise.all(
    files.map(async (file) => ({
      filename: file.name,
      contentType: file.type || "application/octet-stream",
      content: await readAsBase64(file),
    })),
  );
}
