import { lazy, Suspense, useEffect, type ReactNode } from "react";
import {
  createBrowserRouter,
  createMemoryRouter,
  Navigate,
  Outlet,
  RouterProvider,
  ScrollRestoration,
  type RouteObject,
} from "react-router";
import { Toaster } from "sonner";
import { AppShell } from "@/components/app/AppShell";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/primitives";
import { isStandalone } from "@/lib/env";
import Landing from "@/pages/Landing";
import { AuthProvider, useAuth } from "@/providers/AuthProvider";

const Dashboard = lazy(() => import("@/pages/Dashboard"));
const NewInterview = lazy(() => import("@/pages/NewInterview"));
const InterviewRoom = lazy(() => import("@/pages/InterviewRoom"));
const Report = lazy(() => import("@/pages/Report"));
const History = lazy(() => import("@/pages/History"));
const PracticeLab = lazy(() => import("@/pages/PracticeLab"));
const Settings = lazy(() => import("@/pages/Settings"));
const NotFound = lazy(() => import("@/pages/NotFound"));

function FullPageSpinner() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Spinner className="size-6" />
    </div>
  );
}

/**
 * App pages need a session. There's no sign-in: this restores the browser's
 * profile, or creates one on the first visit. The old shared demo account is
 * swapped for a private profile too.
 */
function RequireSession({ children }: { children: ReactNode }) {
  const { user, loading, error, ensureSession } = useAuth();
  const ready = Boolean(user && !user.isDemo);

  useEffect(() => {
    if (!loading && !ready) ensureSession();
  }, [loading, ready, ensureSession]);

  if (ready) return <>{children}</>;
  if (error) {
    return (
      <div className="flex min-h-[80vh] flex-col items-center justify-center px-5 text-center">
        <Logo />
        <h1 className="mt-10 font-display text-[28px] font-semibold">We couldn't open Poise</h1>
        <p className="mt-2 max-w-[380px] text-[15px] leading-relaxed text-muted">{error.message}</p>
        <Button className="mt-6" onClick={ensureSession}>
          Try again
        </Button>
      </div>
    );
  }
  return <FullPageSpinner />;
}

function Root() {
  return (
    <AuthProvider>
      <ScrollRestoration />
      <Suspense fallback={<FullPageSpinner />}>
        <Outlet />
      </Suspense>
      <Toaster position="bottom-center" toastOptions={{ className: "!rounded-2xl !font-sans" }} />
    </AuthProvider>
  );
}

const routes: RouteObject[] = [
  {
    element: <Root />,
    children: [
      { path: "/", element: <Landing /> },
      // Sign-in and sign-up are gone for now; old links open the app instead.
      { path: "/login", element: <Navigate to="/app" replace /> },
      { path: "/signup", element: <Navigate to="/app" replace /> },
      {
        path: "/app/interview/:id",
        element: <RequireSession><InterviewRoom /></RequireSession>,
      },
      {
        path: "/app",
        element: <RequireSession><AppShell /></RequireSession>,
        children: [
          { index: true, element: <Dashboard /> },
          { path: "new", element: <NewInterview /> },
          { path: "report/:id", element: <Report /> },
          { path: "history", element: <History /> },
          { path: "practice", element: <PracticeLab /> },
          { path: "settings", element: <Settings /> },
        ],
      },
      { path: "*", element: <NotFound /> },
    ],
  },
];

// The standalone build may be opened from a file or embedded in a frame, where
// the page URL can't be used for routing — so it keeps routes in memory.
const router = isStandalone ? createMemoryRouter(routes) : createBrowserRouter(routes);

export function App() {
  return <RouterProvider router={router} />;
}
