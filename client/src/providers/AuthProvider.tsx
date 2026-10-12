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

  const signedIn = useCallback(
    (next: User) => {
      // A different account may have signed in — drop any cached data.
      client.clear();
      client.setQueryData(keys.me, next);
      return next;
    },
    [client],
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
        client.clear();
        client.setQueryData(keys.me, null);
      },
    }),
    [client, isLoading, signedIn, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>");
  return context;
}
