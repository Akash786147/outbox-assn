export function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}

// "Tue 9:15:12 AM"
export function formatChipTime(date: string) {
  const d = new Date(date);
  const day = d.toLocaleDateString("en-US", { weekday: "short" });
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit" });
  return `${day} ${time}`;
}

// "Nov 3, 10:23 AM"
export function formatDateTime(date: string | Date) {
  return new Date(date).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function initials(name: string) {
  return name.trim().charAt(0).toUpperCase() || "?";
}
