import { Menu, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Logo } from "@/components/brand/Logo";
import { ButtonLink } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { useAuth } from "@/providers/AuthProvider";

/** Smooth-scrolls to a landing section without touching the URL (works in every router mode). */
function scrollToSection(event: React.MouseEvent<HTMLAnchorElement>, href: string) {
  const target = document.getElementById(href.slice(1));
  if (!target) return;
  event.preventDefault();
  target.scrollIntoView({ behavior: "smooth", block: "start" });
}

const LINKS = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#roles", label: "Roles" },
  { href: "#faq", label: "FAQ" },
];

export function Navbar() {
  const { user } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-40 pt-[env(safe-area-inset-top,0px)] transition-[background-color,box-shadow,backdrop-filter] duration-500",
        scrolled ? "bg-white/75 shadow-[0_1px_0_rgb(0_0_0/0.06)] backdrop-blur-xl" : "bg-transparent",
      )}
    >
      <nav className="mx-auto flex h-[72px] max-w-[1200px] items-center justify-between px-5 sm:px-8" aria-label="Main">
        <Logo />
        <ul className="hidden items-center gap-8 md:flex">
          {LINKS.map((link) => (
            <li key={link.href}>
              <a href={link.href} onClick={(event) => scrollToSection(event, link.href)} className="text-[13.5px] text-ink-2 transition-colors hover:text-ink">
                {link.label}
              </a>
            </li>
          ))}
        </ul>
        <div className="hidden items-center gap-5 md:flex">
          {user ? (
            <ButtonLink to="/app" variant="outline" size="sm" caps arrow>
              Open dashboard
            </ButtonLink>
          ) : (
            <>
              <Link to="/login" className="text-[13.5px] text-ink-2 transition-colors hover:text-ink">
                Sign in
              </Link>
              <ButtonLink to="/signup" variant="outline" size="sm" caps arrow>
                Try it for free
              </ButtonLink>
            </>
          )}
        </div>
        <button
          type="button"
          className="inline-flex size-10 items-center justify-center rounded-full md:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </nav>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden border-t border-line bg-white md:hidden"
          >
            <div className="flex flex-col gap-1 px-5 py-4">
              {LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={(event) => {
                    setOpen(false);
                    scrollToSection(event, link.href);
                  }}
                  className="rounded-xl px-3 py-3 text-[15px] hover:bg-mist"
                >
                  {link.label}
                </a>
              ))}
              <div className="mt-3 flex gap-3">
                {user ? (
                  <ButtonLink to="/app" variant="solid" block arrow>
                    Open dashboard
                  </ButtonLink>
                ) : (
                  <>
                    <ButtonLink to="/login" variant="soft" block>
                      Sign in
                    </ButtonLink>
                    <ButtonLink to="/signup" variant="solid" block>
                      Get started
                    </ButtonLink>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
