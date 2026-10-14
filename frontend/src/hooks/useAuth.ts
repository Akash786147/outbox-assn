import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { authApi, slackApi } from "@/api/auth";
import { useAuthStore } from "@/store/authStore";
import type { AuthResponse } from "@/types";

function useOnAuthSuccess() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  return ({ token, user }: AuthResponse) => {
    setAuth(token, user);
    navigate("/scheduled", { replace: true });
  };
}

export function useGoogleAuth() {
  const onSuccess = useOnAuthSuccess();
  return useMutation({ mutationFn: authApi.google, onSuccess });
}

export function usePasswordLogin() {
  const onSuccess = useOnAuthSuccess();
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) => authApi.login(email, password),
    onSuccess,
  });
}

// keeps the persisted user in sync with the server (e.g. after connecting Slack)
export function useCurrentUser() {
  const token = useAuthStore((s) => s.token);
  const setUser = useAuthStore((s) => s.setUser);

  const query = useQuery({ queryKey: ["me"], queryFn: authApi.me, enabled: Boolean(token) });

  useEffect(() => {
    if (query.data) setUser(query.data);
  }, [query.data, setUser]);

  return query;
}

export function useLogout() {
  const logout = useAuthStore((s) => s.logout);
  const queryClient = useQueryClient();

  return () => {
    logout();
    queryClient.clear();
  };
}

export function useSlack() {
  const queryClient = useQueryClient();
  const refreshUser = () => queryClient.invalidateQueries({ queryKey: ["me"] });

  const connect = useMutation({
    mutationFn: slackApi.connectUrl,
    onSuccess: (url) => window.location.assign(url),
  });
  const disconnect = useMutation({ mutationFn: slackApi.disconnect, onSuccess: refreshUser });
  const test = useMutation({ mutationFn: slackApi.test });

  return { connect, disconnect, test, refreshUser };
}
