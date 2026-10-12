import { useQueryClient } from "@tanstack/react-query";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { User } from "@poise/shared";
import { api, ApiError } from "@/lib/api";
import { keys, useMe } from "@/lib/queries";

/**
 * There's no sign-up: each browser gets its own private profile. The provider
 * knows whether a session exists and starts one (restoring this browser's
 * profile, or creating it) when the app needs it.
 */
interface AuthContextValue {
  user: User | null;
  /** True until we know whether a session already exists. */
  loading: boolean;
  /** Why the last attempt to start a session failed, if it did. */
  error: Error | null;
  /** Restores or creates this browser's profile. Safe to call repeatedly. */
  ensureSession: () => void;
  /** Permanently erases the profile and its data, then starts a fresh one. */
  eraseProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const client = useQueryClient();
  const { data: user, isLoading } = useMe();
  const [error, setError] = useState<Error | null>(null);
  const starting = useRef(false);

  // Drop everything cached for the previous profile, but keep the "me" query
  // itself so components subscribed to it see the change immediately.
  const resetOtherQueries = useCallback(
    () => client.removeQueries({ predicate: (query) => query.queryKey[0] !== keys.me[0] }),
    [client],
  );

  const ensureSession = useCallback(() => {
    if (starting.current) return;
    starting.current = true;
    setError(null);
    api
      .startSession()
      .then(({ user: next }) => {
        resetOtherQueries();
        client.setQueryData(keys.me, next);
      })
      .catch((cause: unknown) => setError(cause instanceof Error ? cause : new Error("Couldn't start your session.")))
      .finally(() => {
        starting.current = false;
      });
  }, [client, resetOtherQueries]);

  // A request rejected as unauthorised means the session lapsed (an expired
  // cookie, or a server restarted with a new secret). Forgetting it makes the
  // app restore this browser's profile instead of failing every request.
  useEffect(() => {
    const onError = (cause: unknown) => {
      if (cause instanceof ApiError && cause.status === 401) client.setQueryData(keys.me, null);
    };
    const stopQueries = client.getQueryCache().subscribe((event) => {
      if (event.type === "updated" && event.action.type === "error") onError(event.action.error);
    });
    const stopMutations = client.getMutationCache().subscribe((event) => {
      if (event.type === "updated" && event.action.type === "error") onError(event.action.error);
    });
    return () => {
      stopQueries();
      stopMutations();
    };
  }, [client]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: user ?? null,
      loading: isLoading,
      error,
      ensureSession,
      eraseProfile: async () => {
        await api.deleteAccount();
        resetOtherQueries();
        try {
          client.setQueryData(keys.me, (await api.startSession()).user);
        } catch {
          // The session guard retries, and explains if it still can't connect.
          client.setQueryData(keys.me, null);
        }
      },
    }),
    [client, ensureSession, error, isLoading, resetOtherQueries, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>");
  return context;
}
