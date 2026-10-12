import { Cpu, HardDrive, ShieldAlert, Volume2, WifiOff } from "lucide-react";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { LEVELS, LEVEL_INFO, ROLES, type ExperienceLevel, type RoleId, type UserPreferences } from "@poise/shared";
import { Button } from "@/components/ui/Button";
import { Field, Input, Range, Select, Toggle } from "@/components/ui/form";
import { Modal } from "@/components/ui/Modal";
import { Card } from "@/components/ui/primitives";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { cameraSupported } from "@/hooks/useMedia";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";
import { isStandalone } from "@/lib/env";
import { ApiError } from "@/lib/api";
import { useEngine, useUpdateProfile } from "@/lib/queries";
import { useAuth } from "@/providers/AuthProvider";

function Panel({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <Card className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[260px_1fr]">
      <div>
        <h2 className="text-[17px] font-semibold">{title}</h2>
        {description && <p className="mt-1 text-[14px] leading-relaxed text-muted">{description}</p>}
      </div>
      <div>{children}</div>
    </Card>
  );
}

export default function Settings() {
  useDocumentTitle("Settings");
  const { user, eraseProfile } = useAuth();
  const navigate = useNavigate();
  const updateProfile = useUpdateProfile();
  const { data: engine } = useEngine();
  const tts = useSpeechSynthesis();

  const [name, setName] = useState(user?.name ?? "");
  const [targetRole, setTargetRole] = useState<RoleId | "">(user?.targetRole ?? "");
  const [level, setLevel] = useState<ExperienceLevel | "">(user?.level ?? "");
  const [voiceRate, setVoiceRate] = useState(user?.preferences.voiceRate ?? 1);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!user) return;
    setName(user.name);
    setTargetRole(user.targetRole ?? "");
    setLevel(user.level ?? "");
  }, [user]);

  if (!user) return null;

  const saveProfile = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await updateProfile.mutateAsync({ name, targetRole: targetRole || null, level: level || null });
      toast.success("Profile saved.");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Couldn't save your profile.");
    }
  };

  const setPreference = (preferences: Partial<UserPreferences>) =>
    updateProfile.mutate({ preferences }, { onError: () => toast.error("Couldn't save that preference.") });

  const eraseData = async () => {
    setDeleting(true);
    try {
      await eraseProfile();
      navigate("/app", { replace: true });
      toast("Your data has been erased. You're starting fresh.");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Couldn't erase your data.");
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="mb-8">
        <p className="serif-accent text-[21px] text-muted">Make it yours.</p>
        <h1 className="font-display text-[40px] font-semibold leading-[1.04] sm:text-[48px]">Settings</h1>
      </div>

      <Panel title="Profile" description="All optional. Your target role and level become the defaults for new interviews.">
        <form className="grid gap-5 sm:grid-cols-2" onSubmit={saveProfile}>
          <Field label="Name" htmlFor="settings-name">
            <Input
              id="settings-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              placeholder="What should Poise call you?"
              autoComplete="given-name"
            />
          </Field>
          {!user.isGuest && user.email && (
            <Field label="Email" htmlFor="settings-email">
              <Input id="settings-email" value={user.email} disabled />
            </Field>
          )}
          <Field label="Target role" htmlFor="settings-role">
            <Select id="settings-role" value={targetRole} onChange={(e) => setTargetRole(e.target.value as RoleId | "")}>
              <option value="">Not set</option>
              {ROLES.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Experience level" htmlFor="settings-level">
            <Select id="settings-level" value={level} onChange={(e) => setLevel(e.target.value as ExperienceLevel | "")}>
              <option value="">Not set</option>
              {LEVELS.map((value) => (
                <option key={value} value={value}>
                  {LEVEL_INFO[value].label} · {LEVEL_INFO[value].years}
                </option>
              ))}
            </Select>
          </Field>
          <div className="sm:col-span-2">
            <Button type="submit" loading={updateProfile.isPending}>
              Save profile
            </Button>
          </div>
        </form>
      </Panel>

      <Panel title="Interview room" description="How Poise behaves while you practise. Changes save instantly.">
        <div className="space-y-6">
          <Toggle
            checked={user.preferences.autoReadQuestions}
            onChange={(value) => setPreference({ autoReadQuestions: value })}
            label="Read questions aloud"
            description="Poise speaks each question when it appears."
            disabled={!tts.supported}
          />
          <div>
            <div className="mb-3 flex items-baseline justify-between">
              <p className="text-[15px] font-medium">Interviewer speaking speed</p>
              <span className="text-[14px] font-semibold tabular-nums">{voiceRate.toFixed(1)}×</span>
            </div>
            <Range
              value={voiceRate}
              min={0.6}
              max={1.6}
              step={0.1}
              ariaLabel="Speaking speed"
              onChange={(value) => {
                setVoiceRate(value);
                setPreference({ voiceRate: value });
              }}
            />
            <Button
              variant="soft"
              size="sm"
              className="mt-3"
              disabled={!tts.supported}
              onClick={() => tts.speak("Tell me about a time you disagreed with a teammate.", { rate: voiceRate })}
            >
              <Volume2 className="size-4" /> Test voice
            </Button>
          </div>
          <Toggle
            checked={user.preferences.showLiveMetrics}
            onChange={(value) => setPreference({ showLiveMetrics: value })}
            label="Show live metrics"
            description="Word count, pace, filler words and hedges while you answer."
          />
          {cameraSupported() && (
            <Toggle
              checked={user.preferences.cameraByDefault}
              onChange={(value) => setPreference({ cameraByDefault: value })}
              label="Camera self-view by default"
              description="Practise eye contact. Video never leaves your device."
            />
          )}
        </div>
      </Panel>

      <Panel title="AI engine" description="Which engine writes your questions and feedback.">
        <div className="rounded-2xl bg-cloud p-5">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-white shadow-sm">
              {engine?.provider === "claude" ? <Cpu className="size-5" /> : <WifiOff className="size-5" />}
            </span>
            <div>
              <p className="text-[15px] font-semibold">{engine?.label ?? "…"}</p>
              <p className="text-[13px] text-muted">{engine?.provider === "claude" ? "Connected to the Claude API" : "Built-in, no network required"}</p>
            </div>
          </div>
          <p className="mt-4 text-[14px] leading-relaxed text-muted">
            {isStandalone
              ? "This preview runs entirely in your browser with Poise's offline engine: a curated bank of 115 questions and a transparent, rubric-based evaluator. Your profile and practice history stay on this device. The full app adds Claude-written questions and feedback, spoken answers and camera self-view."
              : engine?.provider === "claude"
              ? "Questions, follow-ups and feedback are written by Claude using a fixed scoring rubric. If the API is ever unavailable, Poise falls back to its offline engine automatically."
              : "Poise is using its offline engine: a curated bank of 115 questions and a transparent, rubric-based evaluator. To use Claude, set ANTHROPIC_API_KEY in the server's environment and restart it."}
          </p>
        </div>
      </Panel>

      <Panel
        title="Your data"
        description={
          isStandalone
            ? "Everything is stored on this device. There's no account or password."
            : "Your profile belongs to this browser. There's no account or password."
        }
      >
        <div className="space-y-4">
          <div className="flex items-start gap-4 rounded-2xl bg-cloud p-5">
            <HardDrive className="mt-0.5 size-5 shrink-0 text-muted" />
            <p className="text-[14.5px] leading-relaxed text-ink-2">
              Your interviews and saved questions stay with this browser. Clearing its site data, or opening Poise in a
              different browser, starts a new, empty profile.
            </p>
          </div>
          <div className="flex items-start gap-4 rounded-2xl border border-[#f3c4c4] bg-[#fdf3f3] p-5">
            <ShieldAlert className="mt-0.5 size-5 shrink-0 text-[var(--color-critical)]" />
            <div>
              <p className="text-[14.5px] text-ink-2">
                Erase every interview, saved question and setting, and start again with a fresh profile. This can't be
                undone.
              </p>
              <Button variant="danger" size="sm" className="mt-4" onClick={() => setDeleteOpen(true)}>
                Erase my data
              </Button>
            </div>
          </div>
        </div>
      </Panel>

      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Erase all your data?"
        description={
          <>
            Type <span className="font-semibold text-ink">DELETE</span> to confirm. All interviews, saved questions and
            settings will be permanently removed.
          </>
        }
      >
        <Input value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} placeholder="DELETE" aria-label="Type DELETE to confirm" />
        <div className="mt-4 flex gap-3">
          <Button variant="soft" block onClick={() => setDeleteOpen(false)}>
            Cancel
          </Button>
          <Button variant="danger" block disabled={deleteConfirm !== "DELETE"} loading={deleting} onClick={eraseData}>
            Erase everything
          </Button>
        </div>
      </Modal>
    </div>
  );
}
