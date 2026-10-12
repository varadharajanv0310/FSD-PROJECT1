import { Check, Eye, EyeOff, Sparkles } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";
import { Logo } from "@/components/brand/Logo";
import { Orb } from "@/components/brand/Orb";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/form";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { ApiError } from "@/lib/api";
import { isStandalone } from "@/lib/env";
import { useAuth } from "@/providers/AuthProvider";

const PERKS = [
  "Questions for 10 roles, tailored to your job description",
  "Speak your answers — with a live transcript and timer",
  "Scores on five dimensions with a stronger sample answer",
];

export default function AuthPage({ mode }: { mode: "login" | "signup" }) {
  const isLogin = mode === "login";
  useDocumentTitle(isLogin ? "Sign in" : "Create your account");
  const { login, register, loginDemo } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get("next");
  const destination = next?.startsWith("/") ? next : "/app";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const demoTriggered = useRef(false);

  const startDemo = async () => {
    setDemoLoading(true);
    try {
      await loginDemo();
      toast.success("Welcome to the demo — explore a candidate's practice history.");
      navigate("/app", { replace: true });
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Couldn't start the demo.");
      setDemoLoading(false);
    }
  };

  // "Explore the live demo" links land here with ?demo=1.
  useEffect(() => {
    if (params.get("demo") === "1" && !demoTriggered.current) {
      demoTriggered.current = true;
      void startDemo();
    }
  }, [params]);

  const validate = () => {
    const next: Record<string, string> = {};
    if (!isLogin && !name.trim()) next.name = "Please tell us your name.";
    if (!/^\S+@\S+\.\S+$/.test(email)) next.email = "Enter a valid email address.";
    if (!isLogin && password.length < 8) next.password = "Use at least 8 characters.";
    if (isLogin && !password) next.password = "Enter your password.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      if (isLogin) await login(email, password);
      else await register(name, email, password);
      navigate(isLogin ? destination : "/app/new?welcome=1", { replace: true });
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Something went wrong. Please try again.";
      setErrors({ form: message });
      setSubmitting(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_1.05fr]">
      {/* Form */}
      <div className="flex flex-col px-6 py-8 sm:px-12">
        <Logo />
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto my-auto w-full max-w-[400px] py-12"
        >
          <p className="serif-accent text-[21px] text-muted">{isLogin ? "Welcome back." : "Let's get you ready."}</p>
          <h1 className="mt-1 font-display text-[40px] font-semibold leading-[1.02]">
            {isLogin ? "Sign in to Poise" : "Create your account"}
          </h1>
          <p className="mt-3 text-[15px] text-muted">
            {isLogin ? "Pick up where you left off." : "Free, and your first mock interview takes ten minutes."}
          </p>

          <form className="mt-8 flex flex-col gap-5" onSubmit={onSubmit} noValidate>
            {!isLogin && (
              <Field label="Your name" htmlFor="name" error={errors.name}>
                <Input id="name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Varadharajan V" />
              </Field>
            )}
            <Field label="Email" htmlFor="email" error={errors.email}>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@college.edu"
              />
            </Field>
            <Field label="Password" htmlFor="password" error={errors.password} hint={!isLogin ? "At least 8 characters." : undefined}>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete={isLogin ? "current-password" : "new-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-muted hover:bg-mist"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </Field>

            {errors.form && (
              <p className="rounded-2xl bg-[#fdecec] px-4 py-3 text-[14px] text-[#9f1d1d]" role="alert">
                {errors.form}
              </p>
            )}

            <Button type="submit" size="lg" block loading={submitting} arrow>
              {isLogin ? "Sign in" : "Create account"}
            </Button>
          </form>

          <div className="my-6 flex items-center gap-4 text-[12px] uppercase tracking-[0.14em] text-faint">
            <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
          </div>

          <Button variant="soft" size="lg" block onClick={startDemo} loading={demoLoading}>
            <Sparkles className="size-4" />
            Explore the live demo
          </Button>
          <p className="mt-2 text-center text-[12.5px] text-faint">A sample account with a week of practice history.</p>
          {isStandalone && (
            <p className="mt-6 rounded-2xl bg-mist px-4 py-3 text-center text-[13px] leading-relaxed text-muted">
              This is a preview that runs entirely in your browser. Accounts and practice history stay on this device.
            </p>
          )}

          <p className="mt-8 text-center text-[14px] text-muted">
            {isLogin ? "New to Poise? " : "Already have an account? "}
            <Link to={isLogin ? "/signup" : "/login"} className="font-medium text-ink underline-offset-4 hover:underline">
              {isLogin ? "Create an account" : "Sign in"}
            </Link>
          </p>
        </motion.div>
      </div>

      {/* Visual */}
      <div className="relative hidden overflow-hidden bg-night lg:block">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(70% 60% at 30% 20%, rgb(124 58 237 / 0.55), transparent 70%), radial-gradient(60% 60% at 80% 85%, rgb(255 122 47 / 0.55), transparent 70%), radial-gradient(50% 50% at 60% 50%, rgb(232 51 111 / 0.5), transparent 70%)",
          }}
        />
        <div className="noise absolute inset-0" />
        <div className="relative flex h-full flex-col justify-between p-14 text-white">
          <p className="serif-accent text-[22px] text-white/75">Your interview, in perfect rhythm.</p>
          <div className="flex justify-center">
            <Orb size={280} state="speaking" />
          </div>
          <div>
            <h2 className="max-w-[440px] font-display text-[34px] font-semibold leading-[1.08]">
              Walk in prepared. Walk out with the offer.
            </h2>
            <ul className="mt-6 space-y-3">
              {PERKS.map((perk) => (
                <li key={perk} className="flex items-start gap-3 text-[15px] text-white/80">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-white/15">
                    <Check className="size-3" />
                  </span>
                  {perk}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
