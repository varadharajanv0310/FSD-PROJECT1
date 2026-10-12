import { Camera, CameraOff } from "lucide-react";
import { useEffect, useRef } from "react";
import type { InterviewQuestion } from "@poise/shared";
import { cn } from "@/lib/cn";
import { formatDuration } from "@/lib/format";

/** One segment per question; follow-ups are narrower. */
export function ProgressRail({ questions, current }: { questions: InterviewQuestion[]; current: number }) {
  return (
    <div className="flex items-center gap-1.5" role="progressbar" aria-valuemin={0} aria-valuemax={questions.length} aria-valuenow={current} aria-label="Interview progress">
      {questions.map((question, index) => (
        <span
          key={question.id}
          className={cn(
            "h-1.5 rounded-full transition-all duration-500",
            question.kind === "follow-up" ? "w-3" : "w-7",
            index < current ? "bg-white/80" : index === current ? "bg-brand-gradient" : "bg-white/15",
          )}
          title={question.kind === "follow-up" ? "Follow-up" : `Question ${index + 1}`}
        />
      ))}
    </div>
  );
}

/** Countdown ring for timed questions; switches to overtime once the limit passes. */
export function TimerRing({ elapsed, limit }: { elapsed: number; limit: number }) {
  const size = 46;
  const stroke = 3;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const timed = limit > 0;
  const remaining = timed ? limit - elapsed : elapsed;
  const overtime = timed && remaining < 0;
  const warning = timed && remaining >= 0 && remaining <= 15;
  const progress = timed ? Math.min(1, elapsed / limit) : 0;

  return (
    <div className="flex items-center gap-2.5">
      {timed && (
        <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgb(255 255 255 / 0.12)" strokeWidth={stroke} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * progress}
            className="transition-[stroke-dashoffset] duration-300"
            stroke={overtime || warning ? "#ff9a5c" : "#fff"}
          />
        </svg>
      )}
      <div className="leading-tight">
        <p className={cn("font-display text-[18px] font-semibold tabular-nums", overtime ? "text-[#ffb38a]" : "text-white")}>
          {overtime ? "+" : ""}
          {formatDuration(Math.abs(remaining))}
        </p>
        <p className="text-[11px] text-white/50">{!timed ? "elapsed" : overtime ? "over time" : warning ? "wrap up" : "remaining"}</p>
      </div>
    </div>
  );
}

/** Mirrored self-view. The stream never leaves the browser. */
export function CameraPreview({ stream, onClose, className }: { stream: MediaStream | null; onClose: () => void; className?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream;
  }, [stream]);
  return (
    <div className={cn("relative overflow-hidden rounded-3xl border border-white/10 bg-black/40", className)}>
      {stream ? (
        <video ref={videoRef} autoPlay muted playsInline className="aspect-[4/3] w-full -scale-x-100 object-cover" />
      ) : (
        <div className="flex aspect-[4/3] items-center justify-center text-white/40">
          <Camera className="size-6" />
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/70 to-transparent px-3 pb-2.5 pt-6 text-[11.5px] text-white/75">
        <span>Only you can see this</span>
        <button type="button" onClick={onClose} className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-1 hover:bg-white/25" aria-label="Turn camera off">
          <CameraOff className="size-3.5" /> Off
        </button>
      </div>
    </div>
  );
}

export function MetricChip({ label, value, warn }: { label: string; value: string | number; warn?: boolean }) {
  return (
    <div className={cn("rounded-2xl border px-3 py-2", warn ? "border-[#ff9a5c]/40 bg-[#ff9a5c]/10" : "border-white/10 bg-white/[0.04]")}>
      <p className="text-[11px] uppercase tracking-[0.12em] text-white/45">{label}</p>
      <p className={cn("mt-0.5 font-display text-[18px] font-semibold tabular-nums", warn ? "text-[#ffc29e]" : "text-white")}>{value}</p>
    </div>
  );
}
