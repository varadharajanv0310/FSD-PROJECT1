import { useCallback, useEffect, useRef, useState } from "react";

const PREFERRED_VOICES = [
  "Google UK English Female",
  "Microsoft Aria Online (Natural) - English (United States)",
  "Microsoft Jenny Online (Natural) - English (United States)",
  "Samantha",
  "Karen",
  "Google US English",
];

function pickVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | undefined {
  for (const name of PREFERRED_VOICES) {
    const match = voices.find((voice) => voice.name === name);
    if (match) return match;
  }
  return voices.find((voice) => voice.lang.startsWith("en") && voice.localService) ?? voices.find((voice) => voice.lang.startsWith("en"));
}

/** Reads questions aloud in a natural English voice, when the browser supports it. */
export function useSpeechSynthesis() {
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;
  const [speaking, setSpeaking] = useState(false);
  const voiceRef = useRef<SpeechSynthesisVoice | undefined>(undefined);

  useEffect(() => {
    if (!supported) return;
    const load = () => {
      voiceRef.current = pickVoice(window.speechSynthesis.getVoices());
    };
    load();
    window.speechSynthesis.addEventListener("voiceschanged", load);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", load);
      window.speechSynthesis.cancel();
    };
  }, [supported]);

  const cancel = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, [supported]);

  const speak = useCallback(
    (text: string, { rate = 1, onEnd }: { rate?: number; onEnd?: () => void } = {}) => {
      if (!supported || !text) return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = rate;
      utterance.pitch = 1;
      if (voiceRef.current) utterance.voice = voiceRef.current;
      utterance.onstart = () => setSpeaking(true);
      utterance.onend = () => {
        setSpeaking(false);
        onEnd?.();
      };
      utterance.onerror = () => setSpeaking(false);
      window.speechSynthesis.speak(utterance);
    },
    [supported],
  );

  return { supported, speaking, speak, cancel };
}
