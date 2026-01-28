"use client";

import { useState, useEffect } from "react";

interface Props {
  minutes: number;
}

export function CountdownTimer({ minutes }: Props) {
  const [secondsLeft, setSecondsLeft] = useState(minutes * 60);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (secondsLeft <= 0) return null;

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;

  return (
    <div className="card-glow p-3 flex items-center justify-center gap-2" style={{ borderColor: "rgba(239, 68, 68, 0.3)", boxShadow: "0 0 15px rgba(239, 68, 68, 0.08)" }}>
      <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span className="text-red-400 text-sm font-medium">
        Oferta expira em{" "}
        <span className="font-bold font-mono">
          {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
        </span>
      </span>
    </div>
  );
}
