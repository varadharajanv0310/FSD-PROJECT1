import { ChevronDown, Cpu, History, LayoutGrid, LogOut, Plus, Settings, Sparkles, WifiOff } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router";
import { PageGlow } from "@/components/brand/Glow";
import { Logo } from "@/components/brand/Logo";
import { ButtonLink } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { isStandalone } from "@/lib/env";
import { firstName } from "@/lib/format";
import { useEngine } from "@/lib/queries";
import { useAuth } from "@/providers/AuthProvider";

const NAV = [
  { to: "/app", label: "Dashboard", icon: LayoutGrid, end: true },
  { to: "/app/practice", label: "Question lab", icon: Sparkles },
  { to: "/app/history", label: "History", icon: History },
];

export function EngineBadge({ className }: { className?: string }) {
  const { data: engine } = useEngine();
  if (!engine) return null;
  const local = engine.provider === "local";
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-2.5 py-1 text-[12px] text-muted", className)}
      title={local ? "No AI key configured — using Poise's built-in offline engine" : `Questions and feedback by ${engine.label}`}
    >
      {local ? <WifiOff className="size-3.5" /> : <Cpu className="size-3.5" />}
      {engine.label}
    </span>
  );
}

function Avatar({ name, className }: { name: string; className?: string }) {
  const initials = name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <span
      className={cn("flex size-9 items-center justify-center rounded-full text-[13px] font-semibold text-white", className)}
      style={{ background: "linear-gradient(135deg,#ff8a3d,#e8336f 55%,#7c3aed)" }}
      aria-hidden="true"
    >
      {initials}
    </span>
  );
}

function UserMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!user) return null;
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full p-1 pr-2 transition-colors hover:bg-mist"
      >
        <Avatar name={user.name} />
        <ChevronDown className={cn("size-4 text-muted transition-transform", open && "rotate-180")} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 top-[calc(100%+8px)] z-50 w-64 origin-top-right rounded-2xl border border-line bg-white p-2 shadow-[0_20px_50px_-20px_rgb(0_0_0/0.25)]"
          >
            <div className="px-3 py-2.5">
              <p className="truncate text-[14px] font-semibold">{user.name}</p>
              <p className="truncate text-[12.5px] text-muted">{user.email}</p>
              {user.isDemo && <p className="mt-1.5 text-[12px] text-[#a8174a]">Shared demo account</p>}
            </div>
            <div className="my-1 h-px bg-line" />
            <Link
              role="menuitem"
              to="/app/settings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[14px] hover:bg-mist"
            >
              <Settings className="size-4 text-muted" /> Settings
            </Link>
            <button
              role="menuitem"
              type="button"
              onClick={async () => {
                await logout();
                navigate("/");
              }}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[14px] hover:bg-mist"
            >
              <LogOut className="size-4 text-muted" /> Sign out
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function AppShell() {
  const { user } = useAuth();
  const location = useLocation();

  return (
    <div className="relative isolate min-h-screen pb-24 md:pb-0">
      <PageGlow />
      <header className="sticky top-[env(safe-area-inset-top,0px)] z-30 border-b border-line/70 bg-white/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-6 px-5 sm:px-8">
          <div className="flex items-center gap-8">
            <Logo to="/app" />
            <nav className="hidden items-center gap-1 md:flex" aria-label="App">
              {NAV.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    cn(
                      "rounded-full px-3.5 py-2 text-[14px] transition-colors",
                      isActive ? "bg-mist font-medium text-ink" : "text-muted hover:text-ink",
                    )
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <EngineBadge className="hidden lg:inline-flex" />
            <ButtonLink to="/app/new" size="sm" className="hidden sm:inline-flex">
              <Plus className="size-4" /> New interview
            </ButtonLink>
            <UserMenu />
          </div>
        </div>
      </header>

      {user?.isDemo && (
        <div className="border-b border-line/70 bg-brand-soft">
          <p className="mx-auto max-w-[1200px] px-5 py-2 text-center text-[13px] text-ink-2 sm:px-8">
            {isStandalone ? (
              <>
                You're exploring the <span className="font-semibold">demo account</span> on this device.{" "}
                <Link to="/signup" className="font-medium underline underline-offset-2">
                  Create your own
                </Link>{" "}
                to start fresh.
              </>
            ) : (
              <>
                You're exploring the <span className="font-semibold">demo account</span>, shared with other visitors.{" "}
                <Link to="/signup" className="font-medium underline underline-offset-2">
                  Create your own
                </Link>{" "}
                to keep your progress private.
              </>
            )}
          </p>
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.main
          key={location.pathname}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto max-w-[1200px] px-5 py-8 sm:px-8 sm:py-10"
        >
          <Outlet />
        </motion.main>
      </AnimatePresence>

      {/* Mobile tab bar */}
      <nav className="fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom,0px))] z-30 flex items-center justify-around rounded-full border border-line bg-white/90 p-1.5 shadow-[0_10px_40px_-12px_rgb(0_0_0/0.25)] backdrop-blur-xl md:hidden" aria-label="App">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn("flex flex-1 flex-col items-center gap-0.5 rounded-full py-1.5 text-[11px]", isActive ? "text-ink" : "text-faint")
            }
          >
            <item.icon className="size-5" />
            {item.label.split(" ")[0]}
          </NavLink>
        ))}
        <Link to="/app/new" className="flex size-12 items-center justify-center rounded-full bg-ink text-white" aria-label="New interview">
          <Plus className="size-5" />
        </Link>
      </nav>
      <span className="sr-only">{user ? `Signed in as ${firstName(user.name)}` : ""}</span>
    </div>
  );
}
