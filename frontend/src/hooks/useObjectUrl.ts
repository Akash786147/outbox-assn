import { useEffect, useState } from "react";

// creates a temporary URL for a File/Blob and cleans it up when it changes or unmounts
export function useObjectUrl(blob: Blob | null | undefined) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!blob) return;
    const objectUrl = URL.createObjectURL(blob);
    // object URLs are a browser resource, so creating/revoking them belongs in an effect
    // oxlint-disable-next-line react/set-state-in-effect
    setUrl(objectUrl);
    return () => {
      URL.revokeObjectURL(objectUrl);
      setUrl(null);
    };
  }, [blob]);

  return url;
}
