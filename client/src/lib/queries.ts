import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { InterviewConfig, InterviewSession, User } from "@poise/shared";
import { api } from "./api";

export const keys = {
  me: ["me"] as const,
  engine: ["engine"] as const,
  stats: ["stats"] as const,
  sessions: (filters: object = {}) => ["sessions", filters] as const,
  session: (id: string) => ["session", id] as const,
  saved: ["saved-questions"] as const,
};

export function useMe() {
  return useQuery({
    queryKey: keys.me,
    queryFn: async () => (await api.currentUser()).user,
    staleTime: 5 * 60_000,
    retry: false,
  });
}

export function useEngine() {
  return useQuery({ queryKey: keys.engine, queryFn: async () => (await api.engine()).engine, staleTime: Infinity });
}

export function useStats() {
  return useQuery({ queryKey: keys.stats, queryFn: async () => (await api.stats()).stats });
}

export function useSessions(filters: { status?: string; role?: string } = {}) {
  return useQuery({ queryKey: keys.sessions(filters), queryFn: async () => (await api.sessions(filters)).sessions });
}

/** Polls while the server is still evaluating answers or writing the report. */
export function useSession(id: string | undefined) {
  return useQuery({
    queryKey: keys.session(id ?? ""),
    queryFn: async () => (await api.session(id!)).session,
    enabled: Boolean(id),
    refetchInterval: (query) => {
      const session = query.state.data as InterviewSession | undefined;
      return session?.status === "evaluating" ? 1500 : false;
    },
  });
}

export function useSetSession() {
  const client = useQueryClient();
  return (session: InterviewSession) => client.setQueryData(keys.session(session.id), session);
}

export function useCreateSession() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (config: InterviewConfig) => (await api.createSession(config)).session,
    onSuccess: (session) => {
      client.setQueryData(keys.session(session.id), session);
      void client.invalidateQueries({ queryKey: ["sessions"] });
      void client.invalidateQueries({ queryKey: keys.stats });
    },
  });
}

export function useDeleteSession() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteSession(id),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["sessions"] });
      void client.invalidateQueries({ queryKey: keys.stats });
    },
  });
}

export function useUpdateProfile() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (update: Parameters<typeof api.updateProfile>[0]) => (await api.updateProfile(update)).user,
    onSuccess: (user: User) => client.setQueryData(keys.me, user),
  });
}

export function useSavedQuestions() {
  return useQuery({ queryKey: keys.saved, queryFn: async () => (await api.savedQuestions()).questions });
}
