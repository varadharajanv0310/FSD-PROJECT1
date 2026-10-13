import { useQueryClient } from "@tanstack/react-query";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { User } from "@poise/shared";
import { api, onExternalChange, onSessionRestored } from "@/lib/api";
import { clearDrafts } from "@/lib/drafts";
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

  // Drop everything cached for the previous profile. Resetting (rather than
  // removing) keeps mounted pages subscribed, so they refetch for the new one.
  const resetOtherQueries = useCallback(
    () => void client.resetQueries({ predicate: (query) => query.queryKey[0] !== keys.me[0] }),
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

  // The API client restores a lapsed session by itself and retries the request.
  // If that brought back a different profile (this browser's key was lost),
  // nothing cached for the old one may be shown.
  useEffect(
    () =>
      onSessionRestored((next) => {
        if (client.getQueryData<User | null>(keys.me)?.id !== next.id) resetOtherQueries();
        client.setQueryData(keys.me, next);
      }),
    [client, resetOtherQueries],
  );

  // Another tab erased or replaced the profile: start over from the current
  // session, so this tab can't show (or save into) the old one. If it only
  // changed data, refresh in the background.
  useEffect(
    () =>
      onExternalChange((change) => {
        if (change === "profile") void client.resetQueries();
        else void client.invalidateQueries();
      }),
    [client],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user: user ?? null,
      loading: isLoading,
      error,
      ensureSession,
      eraseProfile: async () => {
        await api.deleteAccount();
        clearDrafts();
        // Start the fresh profile before anything refetches, so only one is created.
        // If that fails, the session guard retries and explains.
        const next = await api.startSession().then(
          (result) => result.user,
          () => null,
        );
        resetOtherQueries();
        client.setQueryData(keys.me, next);
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
