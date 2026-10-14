import axios from "axios";
import { useAuthStore } from "@/store/authStore";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:4000/api",
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) useAuthStore.getState().logout();
    return Promise.reject(error);
  },
);

export function getErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) return error.response?.data?.message ?? error.message;
  if (error instanceof Error) return error.message;
  return "Something went wrong";
}
