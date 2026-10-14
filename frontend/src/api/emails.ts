import { api } from "./client";
import type {
  Email,
  EmailListParams,
  EmailPage,
  EmailStats,
  ScheduleEmailPayload,
  ScheduleEmailResponse,
  Sender,
} from "@/types";

export const emailApi = {
  list: (params: EmailListParams & { page: number }) =>
    api.get<EmailPage>("/emails", { params }).then((r) => r.data),
  stats: () => api.get<EmailStats>("/emails/stats").then((r) => r.data),
  get: (id: number) => api.get<Email>(`/emails/${id}`).then((r) => r.data),
  toggleStar: (id: number) => api.patch<{ starred: boolean }>(`/emails/${id}/star`).then((r) => r.data),
  schedule: (payload: ScheduleEmailPayload) =>
    api.post<ScheduleEmailResponse>("/emails/schedule", payload).then((r) => r.data),
  senders: () => api.get<Sender[]>("/senders").then((r) => r.data),
};
