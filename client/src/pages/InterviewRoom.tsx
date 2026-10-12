import {
  Camera,
  Check,
  Keyboard,
  Lightbulb,
  Loader2,
  Mic,
  MicOff,
  SkipForward,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import {
  INTERVIEW_TYPE_INFO,
  LEVEL_INFO,
  LIMITS,
  analyzeAnswer,
  getRole,
  type AnswerMode,
  type InterviewQuestion,
  type InterviewSession,
} from "@poise/shared";
import { CameraPreview, MetricChip, ProgressRail, TimerRing } from "@/components/interview/parts";
import { LogoMark } from "@/components/brand/Logo";
import { Orb, type OrbState } from "@/components/brand/Orb";
import { Waveform } from "@/components/brand/Waveform";
import { Button } from "@/components/ui/Button";
import { Toggle } from "@/components/ui/form";
import { Modal } from "@/components/ui/Modal";
import { Kbd, Spinner } from "@/components/ui/primitives";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { cameraSupported, useAudioLevel, useElapsed, useMediaStream } from "@/hooks/useMedia";
import { appendDictation, useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";
import { api, ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { draftKey, readDraft, writeDraft } from "@/lib/drafts";
import { firstName, formatMinutes, pluralize } from "@/lib/format";
import { useDeleteSession, useSession, useSetSession, useUpdateProfile } from "@/lib/queries";
import { useAuth } from "@/providers/AuthProvider";

/* ───────────────────────────── Lobby ───────────────────────────── */

function Lobby({ session, onBegin }: { session: InterviewSession; onBegin: (opts: { camera: boolean }) => void }) {
  const { user } = useAuth();
  const updateProfile = useUpdateProfile();
  const mic = useMediaStream("audio");
  const level = useAudioLevel(mic.stream);
  const [heard, setHeard] = useState(false);
  const [camera, setCamera] = useState(user?.preferences.cameraByDefault ?? false);
  const tts = useSpeechSynthesis();
  const autoRead = user?.preferences.autoReadQuestions ?? true;
  const role = getRole(session.config.role);
  const voice = session.config.answerMode === "voice";

  useEffect(() => {
    if (level > 0.08) setHeard(true);
  }, [level]);

  const details = [
    role?.label,
    INTERVIEW_TYPE_INFO[session.config.type].label,
    LEVEL_INFO[session.config.level].label,
    pluralize(session.questions.length, "question"),
    session.config.timePerQuestionSec ? `${session.config.timePerQuestionSec / 60} min each` : "Untimed",
  ];

  return (
    <div className="mx-auto grid max-w-[1080px] items-center gap-12 px-5 py-10 lg:grid-cols-[1fr_1fr]">
      <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
        <Orb size={168} state={tts.speaking ? "speaking" : "idle"} />
        <p className="serif-accent mt-10 text-[22px] text-white/70">{user?.name ? `Ready when you are, ${firstName(user.name)}.` : "Ready when you are."}</p>
        <h1 className="mt-1 font-display text-[40px] font-semibold leading-[1.05] sm:text-[48px]">{session.title}</h1>
        <div className="mt-5 flex flex-wrap justify-center gap-2 lg:justify-start">
          {details.map((detail) => (
            <span key={detail} className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[13px] text-white/75">
              {detail}
            </span>
          ))}
        </div>
        <ul className="mt-8 space-y-2.5 text-left text-[14.5px] text-white/70">
          <li className="flex gap-3"><Check className="mt-0.5 size-4 shrink-0 text-white/50" /> Lead with your answer, then explain and give an example.</li>
          <li className="flex gap-3"><Check className="mt-0.5 size-4 shrink-0 text-white/50" /> For stories, walk through situation, task, action and result.</li>
          <li className="flex gap-3"><Check className="mt-0.5 size-4 shrink-0 text-white/50" /> It's fine to pause and think — silence beats filler words.</li>
        </ul>
      </div>

      <div className="rounded-[28px] border border-white/10 bg-white/[0.05] p-6 backdrop-blur-xl sm:p-8">
        <h2 className="text-[18px] font-semibold">Quick check</h2>
        <p className="mt-1 text-[14px] text-white/55">Takes ten seconds. Nothing is recorded.</p>

        {voice && (
          <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[15px] font-medium">Microphone</p>
                <p className="text-[13px] text-white/55">
                  {mic.error ?? (mic.stream ? (heard ? "Sounding good." : "Say something to test it…") : "Used to transcribe your answers.")}
                </p>
              </div>
              {mic.stream ? (
                heard ? (
                  <span className="flex size-8 items-center justify-center rounded-full bg-[#0ca30c]/20 text-[#7ee07e]">
                    <Check className="size-4" />
                  </span>
                ) : (
                  <Spinner className="text-white/60" label="Listening" />
                )
              ) : (
                <Button variant="glass" size="sm" onClick={() => void mic.request()}>
                  <Mic className="size-4" /> Test
                </Button>
              )}
            </div>
            {mic.stream && <Waveform level={level} bars={36} className="mt-4 h-8 text-white/70" />}
          </div>
        )}

        <div className="mt-6 space-y-5">
          {cameraSupported() && (
            <div className="dark [&_label]:text-white [&_p]:text-white/55">
              <Toggle checked={camera} onChange={setCamera} label="Camera self-view" description="See yourself like the panel would. The video stays on your device." />
            </div>
          )}
          {tts.supported && (
            <div className="dark [&_label]:text-white [&_p]:text-white/55">
              <Toggle
                checked={autoRead}
                onChange={(value) => updateProfile.mutate({ preferences: { autoReadQuestions: value } })}
                label="Read questions aloud"
                description="Poise speaks each question, like a real interviewer."
              />
            </div>
          )}
        </div>

        <Button
          variant="gradient"
          size="lg"
          block
          arrow
          className="mt-8"
          onClick={() => {
            mic.stop();
            onBegin({ camera: camera && cameraSupported() });
          }}
        >
          Begin interview
        </Button>
        {tts.supported && (
          <button
            type="button"
            className="mx-auto mt-3 flex items-center gap-1.5 text-[13px] text-white/50 hover:text-white/80"
            onClick={() => tts.speak("Hi, I'm Poise. Let's get started whenever you're ready.", { rate: user?.preferences.voiceRate ?? 1 })}
          >
            <Volume2 className="size-3.5" /> Hear the interviewer's voice
          </button>
        )}
      </div>
    </div>
  );
}

/* ───────────────────────────── Wrap-up ───────────────────────────── */

function WrapUp({ session, onFinish, finishing }: { session: InterviewSession; onFinish: () => void; finishing: boolean }) {
  const answered = session.questions.filter((q) => q.answer && !q.answer.skipped).length;
  const followUps = session.questions.filter((q) => q.kind === "follow-up" && q.answer && !q.answer.skipped).length;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto flex max-w-[560px] flex-col items-center px-5 py-16 text-center"
    >
      <Orb size={180} state={finishing ? "thinking" : "idle"} />
      <p className="serif-accent mt-12 text-[24px] text-white/75">That's a wrap.</p>
      <h1 className="mt-1 font-display text-[44px] font-semibold leading-[1.05]">Nicely done.</h1>
      <p className="mt-4 text-[15.5px] leading-relaxed text-white/65">
        You answered {pluralize(answered, "question")}
        {followUps ? `, including ${pluralize(followUps, "follow-up")}` : ""}, in {formatMinutes(session.totalDurationSec)}. Your
        debrief is ready to build.
      </p>
      <Button variant="gradient" size="lg" arrow className="mt-10" onClick={onFinish} loading={finishing}>
        See my feedback
      </Button>
    </motion.div>
  );
}

/* ───────────────────────────── Room ───────────────────────────── */

export default function InterviewRoom() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: session, isLoading, error } = useSession(id);
  const setSession = useSetSession();
  const deleteSession = useDeleteSession();
  useDocumentTitle(session ? `Interview · ${session.title}` : "Interview");

  const [begun, setBegun] = useState(false);
  const [cameraChoice, setCameraChoice] = useState<boolean | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-night">
        <Orb size={96} state="thinking" />
      </div>
    );
  }
  if (error || !session) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-night text-white">
        <p className="text-white/70">{error instanceof ApiError ? error.message : "We couldn't load this interview."}</p>
        <Button variant="light" onClick={() => navigate("/app")}>Back to dashboard</Button>
      </div>
    );
  }
  if (session.status !== "in_progress" && !finishing) return <Navigate to={`/app/report/${session.id}`} replace />;

  const hasAnswers = session.questions.some((q) => q.answer);
  const showLobby = !begun && !hasAnswers;
  const done = session.currentIndex >= session.questions.length;

  const finish = async () => {
    setFinishing(true);
    try {
      const { session: updated } = await api.complete(session.id);
      setSession(updated);
      navigate(`/app/report/${session.id}`, { replace: true });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "We couldn't finish the interview.");
      setFinishing(false);
    }
  };

  const discard = async () => {
    await deleteSession.mutateAsync(session.id);
    navigate("/app", { replace: true });
  };

  return (
    <div className="dark relative isolate min-h-screen overflow-hidden bg-night text-white">
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
        <div className="absolute -left-40 -top-40 size-[620px] rounded-full opacity-40 blur-[120px]" style={{ background: "radial-gradient(closest-side,#7c3aed,transparent)" }} />
        <div className="absolute -right-32 top-1/3 size-[560px] rounded-full opacity-35 blur-[120px]" style={{ background: "radial-gradient(closest-side,#e8336f,transparent)" }} />
        <div className="absolute -bottom-48 left-1/3 size-[520px] rounded-full opacity-30 blur-[120px]" style={{ background: "radial-gradient(closest-side,#ff7a2f,transparent)" }} />
      </div>

      <header className="relative z-10 border-b border-white/[0.07]">
        <div className="mx-auto flex h-16 max-w-[1240px] items-center justify-between gap-4 px-5">
          <div className="flex min-w-0 items-center gap-3">
            <LogoMark />
            <p className="truncate text-[14px] font-medium text-white/80">{session.title}</p>
          </div>
          {!showLobby && !done && (
            <div className="hidden md:block">
              <ProgressRail questions={session.questions} current={session.currentIndex} />
            </div>
          )}
          <Button variant="glass" size="sm" onClick={() => setConfirmEnd(true)}>
            <X className="size-4" /> End
          </Button>
        </div>
      </header>

      {showLobby ? (
        <Lobby
          session={session}
          onBegin={({ camera }) => {
            setCameraChoice(camera);
            setBegun(true);
          }}
        />
      ) : done ? (
        <WrapUp session={session} onFinish={finish} finishing={finishing} />
      ) : (
        <QuestionStage
          key={session.id}
          session={session}
          cameraDefault={cameraChoice ?? user?.preferences.cameraByDefault ?? false}
          onSession={setSession}
        />
      )}

      <Modal
        tone="dark"
        open={confirmEnd}
        onClose={() => setConfirmEnd(false)}
        title={hasAnswers ? "End the interview now?" : "Leave this interview?"}
        description={
          hasAnswers
            ? "Finish now for feedback on what you've answered so far (unanswered questions won't count against you), or save it and pick up where you left off later."
            : "You haven't answered anything yet. Save it for later, or discard it."
        }
      >
        <div className="flex flex-col gap-2.5">
          {hasAnswers ? (
            <Button variant="gradient" block onClick={finish} loading={finishing}>
              Finish & get feedback
            </Button>
          ) : (
            <Button variant="light" block onClick={discard} loading={deleteSession.isPending}>
              Discard interview
            </Button>
          )}
          <Button variant="glass" block onClick={() => navigate("/app")}>
            Save & exit
          </Button>
          <Button variant="glass" block onClick={() => setConfirmEnd(false)}>
            Keep going
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function QuestionStage({
  session,
  cameraDefault,
  onSession,
}: {
  session: InterviewSession;
  cameraDefault: boolean;
  onSession: (session: InterviewSession) => void;
}) {
  const { user } = useAuth();
  const question = session.questions[session.currentIndex] as InterviewQuestion;
  const key = draftKey(session.id, question.id);
  const prefs = user?.preferences;

  const [mode, setMode] = useState<AnswerMode>(session.config.answerMode);
  const [answer, setAnswer] = useState(() => readDraft(key));
  const [showHint, setShowHint] = useState(false);
  const [submitting, setSubmitting] = useState<"answer" | "skip" | null>(null);
  const [readAloud, setReadAloud] = useState(prefs?.autoReadQuestions ?? true);
  const [cameraOn, setCameraOn] = useState(cameraDefault && cameraSupported());
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const speech = useSpeechRecognition();
  const tts = useSpeechSynthesis();
  const mic = useMediaStream("audio");
  const camera = useMediaStream("video");
  const level = useAudioLevel(mic.stream, speech.listening);
  const elapsed = useElapsed(!submitting, question.id);

  // Reset per question, starting at the top so the question, timer and End are in view.
  useEffect(() => {
    setAnswer(readDraft(draftKey(session.id, question.id)));
    setShowHint(false);
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [session.id, question.id]);

  useEffect(() => writeDraft(key, answer), [key, answer]);

  // Read each new question aloud.
  useEffect(() => {
    if (readAloud && tts.supported) tts.speak(question.text, { rate: prefs?.voiceRate ?? 1 });
    return () => tts.cancel();
  }, [question.id]);

  useEffect(() => {
    if (cameraOn) void camera.request();
    else camera.stop();
  }, [cameraOn]);

  const stopListening = useCallback(() => {
    speech.stop();
    mic.stop();
  }, [speech, mic]);

  const toggleMic = async () => {
    if (speech.listening) {
      stopListening();
      return;
    }
    tts.cancel();
    await mic.request();
    speech.start((phrase) => setAnswer((current) => appendDictation(current, phrase)));
  };

  // Only promise "final" when no follow-up can come after this answer.
  const followUpPossible =
    session.config.adaptiveFollowUps &&
    question.kind === "core" &&
    session.questions.filter((q) => q.kind === "follow-up").length <
      Math.floor(session.config.questionCount * LIMITS.maxFollowUpsRatio);
  const isFinalAnswer = session.currentIndex === session.questions.length - 1 && !followUpPossible;

  const fullText = speech.interim ? appendDictation(answer, speech.interim) : answer;
  const metrics = useMemo(
    () => analyzeAnswer(fullText, { durationSec: elapsed, mode: mode === "voice" ? "voice" : "text" }),
    [fullText, elapsed, mode],
  );

  const submit = async (skipped: boolean) => {
    if (submitting) return;
    if (!skipped && !answer.trim()) return;
    stopListening();
    tts.cancel();
    setSubmitting(skipped ? "skip" : "answer");
    try {
      const { session: updated } = await api.answer(session.id, {
        questionId: question.id,
        text: skipped ? "" : answer.trim(),
        durationSec: Math.round(elapsed),
        mode,
        skipped,
      });
      writeDraft(key, "");
      const next = updated.questions[updated.currentIndex];
      if (next?.kind === "follow-up") toast("Poise has a follow-up question.", { duration: 2500 });
      onSession(updated);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "We couldn't save your answer. Please try again.");
    } finally {
      setSubmitting(null);
    }
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
        event.preventDefault();
        void submit(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const orbState: OrbState = submitting ? "thinking" : tts.speaking ? "speaking" : speech.listening ? "listening" : "idle";
  const orbLabel = submitting ? "Thinking…" : tts.speaking ? "Asking" : speech.listening ? "Listening" : "Your turn";
  const coreNumber = session.questions.slice(0, session.currentIndex + 1).filter((q) => q.kind === "core").length;
  const coreTotal = session.questions.filter((q) => q.kind === "core").length;
  const fillersPer100 = metrics.wordCount ? (metrics.fillerCount / metrics.wordCount) * 100 : 0;

  return (
    <div className="mx-auto grid max-w-[1240px] gap-6 px-5 py-6 lg:grid-cols-[1fr_1.1fr] lg:gap-10 lg:py-10">
      {/* Interviewer */}
      <section className="flex flex-col">
        <div className="flex items-center justify-between">
          <span className="text-[13px] text-white/55">
            {question.kind === "follow-up" ? "Follow-up" : `Question ${coreNumber} of ${coreTotal}`}
          </span>
          <TimerRing elapsed={elapsed} limit={session.config.timePerQuestionSec} />
        </div>

        <div className="mt-6 flex items-center gap-5 lg:mt-10">
          <Orb size={92} state={orbState} level={level} />
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/45">Poise</p>
            <p className="serif-accent text-[22px] text-white/85">{orbLabel}</p>
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={question.id}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="mt-8"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[12px] text-white/70">{question.category}</span>
              <span className="rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[12px] capitalize text-white/70">{question.difficulty}</span>
              {question.kind === "follow-up" && (
                <span className="rounded-full bg-brand-gradient px-2.5 py-1 text-[12px] font-medium">Follow-up</span>
              )}
            </div>
            <h1 className="mt-4 font-display text-[28px] font-medium leading-[1.18] tracking-[-0.025em] sm:text-[34px]">{question.text}</h1>

            <div className="mt-6 flex flex-wrap gap-2">
              {tts.supported && (
                <Button
                  variant="glass"
                  size="sm"
                  onClick={() => {
                    if (tts.speaking) tts.cancel();
                    else tts.speak(question.text, { rate: prefs?.voiceRate ?? 1 });
                  }}
                >
                  {tts.speaking ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
                  {tts.speaking ? "Stop" : "Replay"}
                </Button>
              )}
              {question.hint && (
                <Button variant="glass" size="sm" onClick={() => setShowHint((v) => !v)} aria-expanded={showHint}>
                  <Lightbulb className="size-4" /> {showHint ? "Hide hint" : "Hint"}
                </Button>
              )}
              {tts.supported && (
                <button
                  type="button"
                  onClick={() => setReadAloud((v) => !v)}
                  className="ml-1 text-[12.5px] text-white/45 underline-offset-4 hover:text-white/75 hover:underline"
                >
                  Auto-read {readAloud ? "on" : "off"}
                </button>
              )}
            </div>
            <AnimatePresence>
              {showHint && question.hint && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <span className="mt-4 block rounded-2xl border border-[#ffc83d]/25 bg-[#ffc83d]/10 px-4 py-3 text-[14px] leading-relaxed text-[#ffe3a3]">
                    {question.hint}
                  </span>
                </motion.p>
              )}
            </AnimatePresence>
          </motion.div>
        </AnimatePresence>

        <div className={cn("mt-auto hidden pt-8", cameraSupported() && "lg:block")}>
          {cameraOn ? (
            <CameraPreview stream={camera.stream} onClose={() => setCameraOn(false)} className="max-w-[300px]" />
          ) : (
            <button
              type="button"
              onClick={() => setCameraOn(true)}
              className="inline-flex items-center gap-2 text-[13px] text-white/45 hover:text-white/75"
            >
              <Camera className="size-4" /> Turn on camera self-view
            </button>
          )}
          {camera.error && <p className="mt-2 text-[12.5px] text-[#ffb38a]">{camera.error}</p>}
        </div>
      </section>

      {/* Answer */}
      <section className="flex min-h-[460px] flex-col rounded-[28px] border border-white/10 bg-white/[0.05] p-5 backdrop-blur-xl sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[15px] font-semibold">Your answer</h2>
          <div className="inline-flex rounded-full bg-white/[0.07] p-1" role="radiogroup" aria-label="Answer mode">
            {(["voice", "text"] as const).map((value) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={mode === value}
                disabled={value === "voice" && !speech.supported}
                onClick={() => {
                  if (value === "text") stopListening();
                  setMode(value);
                }}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] transition-colors disabled:opacity-40",
                  mode === value ? "bg-white text-ink" : "text-white/60 hover:text-white",
                )}
              >
                {value === "voice" ? <Mic className="size-3.5" /> : <Keyboard className="size-3.5" />}
                {value === "voice" ? "Speak" : "Type"}
              </button>
            ))}
          </div>
        </div>

        <div className="relative mt-4 flex-1">
          <textarea
            ref={textareaRef}
            value={speech.listening && speech.interim ? fullText : answer}
            onChange={(event) => setAnswer(event.target.value)}
            readOnly={speech.listening}
            placeholder={
              mode === "voice"
                ? "Tap the microphone and start talking — your words appear here, and you can edit them before submitting."
                : "Type your answer here. Lead with the headline, then explain and give an example."
            }
            aria-label="Your answer"
            className="h-full min-h-[220px] w-full resize-none bg-transparent text-[17px] leading-[1.65] text-white placeholder:text-white/30 focus:outline-none"
          />
        </div>

        {speech.error && <p className="mb-3 rounded-2xl bg-[#ff9a5c]/10 px-4 py-3 text-[13.5px] text-[#ffc29e]">{speech.error}</p>}

        {mode === "voice" && (
          <div className="mb-5 flex items-center gap-4">
            <button
              type="button"
              onClick={() => void toggleMic()}
              disabled={!speech.supported || Boolean(submitting)}
              aria-pressed={speech.listening}
              aria-label={speech.listening ? "Stop recording" : "Start recording"}
              className={cn(
                "relative flex size-16 shrink-0 items-center justify-center rounded-full transition-all duration-300 disabled:opacity-40",
                speech.listening ? "bg-white text-ink" : "bg-brand-gradient text-white shadow-[0_12px_32px_-10px_rgb(232_51_111/0.8)] hover:scale-105",
              )}
            >
              {speech.listening && (
                <span className="absolute inset-0 rounded-full border-2 border-white/60" style={{ transform: `scale(${1.08 + level * 0.5})`, opacity: 0.6, transition: "transform 80ms" }} />
              )}
              {speech.listening ? <MicOff className="size-6" /> : <Mic className="size-6" />}
            </button>
            <div className="min-w-0 flex-1">
              {speech.listening ? (
                <Waveform level={level} bars={40} className="h-10 text-white/75" />
              ) : (
                <p className="text-[13.5px] text-white/50">{answer ? "Tap to keep talking, or edit the text above." : "Tap to start speaking."}</p>
              )}
            </div>
          </div>
        )}

        {prefs?.showLiveMetrics !== false && (
          <div className="mb-5 grid grid-cols-4 gap-2">
            <MetricChip label="Words" value={metrics.wordCount} />
            <MetricChip label="Pace" value={mode === "voice" && metrics.wpm ? `${metrics.wpm}` : "—"} warn={metrics.wpm !== null && (metrics.wpm > 180 || metrics.wpm < 90)} />
            <MetricChip label="Fillers" value={metrics.fillerCount} warn={metrics.fillerCount >= 3 && fillersPer100 > 2} />
            <MetricChip label="Hedges" value={metrics.hedgeCount} warn={metrics.hedgeCount >= 3} />
          </div>
        )}

        <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-5">
          <Button variant="glass" size="md" onClick={() => void submit(true)} disabled={Boolean(submitting)} loading={submitting === "skip"}>
            <SkipForward className="size-4" /> Skip
          </Button>
          <div className="flex items-center gap-3">
            <span className="hidden text-[12px] text-white/40 sm:inline-flex sm:items-center sm:gap-1">
              <Kbd>Ctrl</Kbd> <Kbd>↵</Kbd>
            </span>
            <Button variant="light" size="md" arrow onClick={() => void submit(false)} disabled={!answer.trim() || Boolean(submitting)} loading={submitting === "answer"}>
              {isFinalAnswer ? "Submit final answer" : "Submit answer"}
            </Button>
          </div>
        </div>
        {submitting === "answer" && session.config.adaptiveFollowUps && (
          <p className="mt-3 flex items-center gap-2 text-[12.5px] text-white/45">
            <Loader2 className="size-3.5 animate-spin" /> Poise is considering a follow-up…
          </p>
        )}
      </section>
    </div>
  );
}
