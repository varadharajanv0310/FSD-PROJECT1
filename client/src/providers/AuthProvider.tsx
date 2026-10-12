import { useQueryClient } from "@tanstack/react-query";
import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import type { User } from "@poise/shared";
import { api } from "@/lib/api";
import { keys, useMe } from "@/lib/queries";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (name: string, email: string, password: string) => Promise<User>;
  loginDemo: () => Promise<User>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const client = useQueryClient();
  const { data: user, isLoading } = useMe();

  // Drop everything cached for the previous account, but keep the "me" query
  // itself so components subscribed to it see the change immediately.
  const resetOtherQueries = useCallback(
    () => client.removeQueries({ predicate: (query) => query.queryKey[0] !== keys.me[0] }),
    [client],
  );

  const signedIn = useCallback(
    (next: User) => {
      resetOtherQueries();
      client.setQueryData(keys.me, next);
      return next;
    },
    [client, resetOtherQueries],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user: user ?? null,
      loading: isLoading,
      login: async (email, password) => signedIn((await api.login(email, password)).user),
      register: async (name, email, password) => signedIn((await api.register(name, email, password)).user),
      loginDemo: async () => signedIn((await api.demo()).user),
      logout: async () => {
        await api.logout().catch(() => undefined);
        resetOtherQueries();
        client.setQueryData(keys.me, null);
      },
    }),
    [client, isLoading, resetOtherQueries, signedIn, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>");
  return context;
}
