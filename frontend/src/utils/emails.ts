const EMAIL_REGEX = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

export const isValidEmail = (value: string) => /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(value.trim());

// works for csv, txt or anything else since we only care about the email addresses inside
export function extractEmails(text: string) {
  const matches = text.match(EMAIL_REGEX) ?? [];
  return [...new Set(matches.map((e) => e.toLowerCase()))];
}

export function mergeEmails(current: string[], incoming: string[]) {
  return [...new Set([...current, ...incoming])];
}
