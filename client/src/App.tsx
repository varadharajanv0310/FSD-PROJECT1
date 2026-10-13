import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import {
  createBrowserRouter,
  createMemoryRouter,
  Navigate,
  Outlet,
  RouterProvider,
  useLocation,
  useNavigationType,
  type RouteObject,
} from "react-router";
import { Toaster } from "sonner";
import { AppShell } from "@/components/app/AppShell";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/primitives";
import { readDevice } from "@/lib/device";
import { isStandalone } from "@/lib/env";
import { deferScroll, rememberScroll, savedScroll, scrollToNow } from "@/lib/scroll";
import Landing from "@/pages/Landing";
import { AuthProvider, useAuth } from "@/providers/AuthProvider";

const appPages = {
  dashboard: () => import("@/pages/Dashboard"),
  newInterview: () => import("@/pages/NewInterview"),
  interviewRoom: () => import("@/pages/InterviewRoom"),
  report: () => import("@/pages/Report"),
  history: () => import("@/pages/History"),
  practiceLab: () => import("@/pages/PracticeLab"),
  settings: () => import("@/pages/Settings"),
};
const Dashboard = lazy(appPages.dashboard);
const NewInterview = lazy(appPages.newInterview);
const InterviewRoom = lazy(appPages.interviewRoom);
const Report = lazy(appPages.report);
const History = lazy(appPages.history);
const PracticeLab = lazy(appPages.practiceLab);
const Settings = lazy(appPages.settings);
const NotFound = lazy(() => import("@/pages/NotFound"));

/** Fetches every app page in the background, so moving between them never waits. */
function preloadAppPages() {
  const load = () => Object.values(appPages).forEach((page) => void page().catch(() => undefined));
  if ("requestIdleCallback" in window) window.requestIdleCallback(load);
  else setTimeout(load, 1500);
}

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
  // A guest session that isn't this browser's own profile (e.g. set by another
  // site) is swapped back for the profile its device key belongs to.
  const device = readDevice();
  const foreignGuest = Boolean(user?.isGuest && device && device.id !== user.id);
  const ready = Boolean(user && !user.isDemo && !foreignGuest);

  useEffect(() => {
    if (!loading && !ready) ensureSession();
  }, [loading, ready, ensureSession]);

  useEffect(() => {
    if (ready) preloadAppPages();
  }, [ready]);

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

/** True below the `md` breakpoint, where the app has a bottom tab bar. */
function useIsPhone() {
  const query = "(max-width: 767px)";
  const [phone, setPhone] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setPhone(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return phone;
}

/** Pages inside the app shell, which animates between them. */
const inAppShell = (pathname: string) => pathname.startsWith("/app") && !pathname.startsWith("/app/interview/");

/**
 * New pages start at the top; Back and Forward return to the saved position.
 * Between two app-shell pages the scroll waits for the outgoing page to fade
 * out (the shell applies it), so the old page never jumps.
 */
function ScrollManager() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const previous = useRef(location);

  useEffect(() => {
    if ("scrollRestoration" in window.history) window.history.scrollRestoration = "manual";
  }, []);

  useLayoutEffect(() => {
    const from = previous.current;
    previous.current = location;
    if (from.key === location.key) return;
    rememberScroll(from.key);
    // Same page with a different query or hash (e.g. filters): stay put.
    if (from.pathname === location.pathname) return;
    const top = navigationType === "POP" ? savedScroll(location.key) : 0;
    if (inAppShell(from.pathname) && inAppShell(location.pathname)) deferScroll(top);
    else scrollToNow(top);
  }, [location, navigationType]);

  return null;
}

function Root() {
  const phone = useIsPhone();
  return (
    <AuthProvider>
      <ScrollManager />
      <Suspense fallback={<FullPageSpinner />}>
        <Outlet />
      </Suspense>
      {/* On phones, toasts sit just below the header, clear of its buttons, the tab bar and bottom actions. */}
      <Toaster
        position={phone ? "top-center" : "bottom-center"}
        mobileOffset={{ top: "calc(env(safe-area-inset-top, 0px) + 76px)" }}
        toastOptions={{ className: "!rounded-2xl !font-sans" }}
      />
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
