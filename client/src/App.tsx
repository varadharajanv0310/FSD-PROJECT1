import { lazy, Suspense, type ReactNode } from "react";
import { createBrowserRouter, Navigate, Outlet, RouterProvider, ScrollRestoration, useLocation } from "react-router";
import { Toaster } from "sonner";
import { AppShell } from "@/components/app/AppShell";
import { Spinner } from "@/components/ui/primitives";
import Landing from "@/pages/Landing";
import { AuthProvider, useAuth } from "@/providers/AuthProvider";

const AuthPage = lazy(() => import("@/pages/AuthPage"));
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

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <FullPageSpinner />;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  return <>{children}</>;
}

function GuestOnly({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <FullPageSpinner />;
  if (user) {
    const next = new URLSearchParams(location.search).get("next");
    return <Navigate to={next?.startsWith("/") ? next : "/app"} replace />;
  }
  return <>{children}</>;
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

const router = createBrowserRouter([
  {
    element: <Root />,
    children: [
      { path: "/", element: <Landing /> },
      { path: "/login", element: <GuestOnly><AuthPage mode="login" /></GuestOnly> },
      { path: "/signup", element: <GuestOnly><AuthPage mode="signup" /></GuestOnly> },
      {
        path: "/app/interview/:id",
        element: <RequireAuth><InterviewRoom /></RequireAuth>,
      },
      {
        path: "/app",
        element: <RequireAuth><AppShell /></RequireAuth>,
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
]);

export function App() {
  return <RouterProvider router={router} />;
}
