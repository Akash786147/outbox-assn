import { api } from "./client";
import type { AuthResponse, User } from "@/types";

export const authApi = {
  google: (code: string) => api.post<AuthResponse>("/auth/google", { code }).then((r) => r.data),
  login: (email: string, password: string) =>
    api.post<AuthResponse>("/auth/login", { email, password }).then((r) => r.data),
  me: () => api.get<User>("/auth/me").then((r) => r.data),
};

export const slackApi = {
  connectUrl: () => api.get<{ url: string }>("/slack/connect-url").then((r) => r.data.url),
  disconnect: () => api.delete("/slack"),
  test: () => api.post("/slack/test"),
};
