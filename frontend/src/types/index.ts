export type EmailStatus = "scheduled" | "sending" | "sent" | "failed";
export type EmailTab = "scheduled" | "sent";

export interface User {
  id: number;
  email: string;
  name: string;
  avatar: string | null;
  slack: {
    connected: boolean;
    channel: string | null;
    team: string | null;
  };
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Sender {
  id: number;
  name: string;
  email: string;
}

export interface Email {
  id: number;
  toEmail: string;
  subject: string;
  body: string;
  status: EmailStatus;
  scheduledAt: string;
  sentAt: string | null;
  previewUrl: string | null;
  error: string | null;
  starred: boolean;
  senderName: string;
  senderEmail: string;
}

export interface EmailPage {
  items: Email[];
  nextPage: number | null;
}

export interface EmailStats {
  scheduled: number;
  sent: number;
}

export interface ScheduleEmailPayload {
  senderId: number;
  subject: string;
  body: string;
  recipients: string[];
  startTime?: string;
  delaySeconds: number;
  hourlyLimit: number;
}

export interface ScheduleEmailResponse {
  batchId: string;
  count: number;
  firstScheduledAt: string;
  lastScheduledAt: string;
}

export interface EmailListParams {
  tab: EmailTab;
  status?: EmailStatus;
  q?: string;
}
