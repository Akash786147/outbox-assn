import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { emailApi } from "@/api/emails";
import type { EmailListParams } from "@/types";

export const emailKeys = {
  all: ["emails"] as const,
  list: (params: EmailListParams) => ["emails", "list", params] as const,
  detail: (id: number) => ["emails", "detail", id] as const,
  stats: ["emails", "stats"] as const,
};

// scheduled emails change status on their own, so that tab keeps polling
const POLL_MS = 10_000;

export function useEmails(params: EmailListParams) {
  return useInfiniteQuery({
    queryKey: emailKeys.list(params),
    queryFn: ({ pageParam }) => emailApi.list({ ...params, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (last) => last.nextPage,
    refetchInterval: params.tab === "scheduled" ? POLL_MS : false,
  });
}

export function useEmailStats() {
  return useQuery({ queryKey: emailKeys.stats, queryFn: emailApi.stats, refetchInterval: POLL_MS });
}

export function useEmail(id: number) {
  return useQuery({ queryKey: emailKeys.detail(id), queryFn: () => emailApi.get(id), enabled: id > 0 });
}

export function useSenders() {
  return useQuery({ queryKey: ["senders"], queryFn: emailApi.senders, staleTime: Infinity });
}

export function useScheduleEmails() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: emailApi.schedule,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: emailKeys.all }),
  });
}

export function useToggleStar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: emailApi.toggleStar,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: emailKeys.all }),
  });
}
