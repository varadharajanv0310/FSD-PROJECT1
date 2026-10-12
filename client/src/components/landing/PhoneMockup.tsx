import { Mic, Signal, Wifi } from "lucide-react";
import { Orb } from "@/components/brand/Orb";
import { Waveform } from "@/components/brand/Waveform";
import { cn } from "@/lib/cn";

/** A device showing Poise's interview room mid-answer — the hero's centrepiece. */
export function PhoneMockup({ className }: { className?: string }) {
  return (
    <div className={cn("relative", className)}>
      <div className="relative h-[560px] w-[278px] rounded-[50px] bg-gradient-to-b from-[#3a3a42] via-[#1d1d22] to-[#2c2c33] p-[3px] shadow-[0_60px_120px_-30px_rgb(70_10_60/0.55),0_30px_60px_-30px_rgb(0_0_0/0.6)]">
        {/* side buttons */}
        <span className="absolute -left-[3px] top-28 h-8 w-[3px] rounded-l bg-[#2a2a30]" />
        <span className="absolute -left-[3px] top-40 h-14 w-[3px] rounded-l bg-[#2a2a30]" />
        <span className="absolute -right-[3px] top-36 h-20 w-[3px] rounded-r bg-[#2a2a30]" />
        <div className="h-full w-full rounded-[47px] bg-black p-[9px]">
          <div className="relative h-full w-full overflow-hidden rounded-[39px] bg-night text-white">
            {/* wallpaper glow */}
            <div
              className="absolute -top-16 left-1/2 h-[340px] w-[340px] -translate-x-1/2 rounded-full opacity-70 blur-[60px]"
              style={{ background: "radial-gradient(closest-side, #e8336f, #7c3aed 60%, transparent)" }}
            />
            <div
              className="absolute -bottom-24 -right-16 h-[260px] w-[260px] rounded-full opacity-50 blur-[60px]"
              style={{ background: "radial-gradient(closest-side, #ff7a2f, transparent)" }}
            />

            {/* status bar + island */}
            <div className="relative flex items-center justify-between px-6 pt-3.5 text-[11px] font-semibold">
              <span>9:41</span>
              <span className="absolute left-1/2 top-2.5 h-[26px] w-[86px] -translate-x-1/2 rounded-full bg-black" />
              <span className="flex items-center gap-1">
                <Signal className="size-3" />
                <Wifi className="size-3" />
                <span className="ml-0.5 h-[9px] w-[18px] rounded-[3px] border border-white/70 p-[1px]">
                  <span className="block h-full w-3/4 rounded-[1px] bg-white" />
                </span>
              </span>
            </div>

            <div className="relative flex h-[calc(100%-28px)] flex-col px-5 pb-5 pt-5">
              <div className="flex items-center justify-between text-[10.5px]">
                <span className="rounded-full bg-white/10 px-2.5 py-1 font-medium text-white/80">Question 3 of 6</span>
                <span className="font-medium tabular-nums text-white/70">01:42</span>
              </div>

              <div className="mt-6 flex flex-col items-center">
                <Orb size={104} state="listening" level={0.35} />
                <p className="mt-4 text-[10px] uppercase tracking-[0.18em] text-white/55">Poise is listening</p>
              </div>

              <p className="mt-4 text-center font-display text-[17px] font-medium leading-snug">
                Tell me about a time you disagreed with a teammate.
              </p>

              <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.06] p-3.5 text-[11.5px] leading-relaxed text-white/80 backdrop-blur">
                During our hackathon, my teammate and I <span className="mark-filler text-white">um</span> disagreed on the
                framework, so I suggested we prototype both and compare<span className="ml-0.5 inline-block w-[1px] animate-blink bg-white">&nbsp;</span>
              </div>

              <div className="mt-auto flex items-center justify-between">
                <Waveform bars={18} className="h-8 text-white/70" />
                <span className="flex size-12 items-center justify-center rounded-full bg-brand-gradient shadow-[0_8px_24px_-6px_rgb(232_51_111/0.8)]">
                  <Mic className="size-5" />
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
