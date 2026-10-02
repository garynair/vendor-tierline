"use client";

import { useEffect, useRef, useState } from "react";

// Cloudflare Turnstile bot check. Supabase Auth verifies the token server-side
// (Authentication -> Attack Protection), so the app only passes it along.
// Without NEXT_PUBLIC_TURNSTILE_SITE_KEY nothing renders and no token is sent,
// which keeps sign-in working until CAPTCHA is switched on in Supabase.
export const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

type TurnstileApi = {
  render: (el: HTMLElement, options: Record<string, unknown>) => string;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

// Loads the script once per page. Every widget waits on the same promise, so
// pages with two forms (demo + sign-up) both get rendered.
let scriptPromise: Promise<void> | null = null;
function loadTurnstile(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = SCRIPT_SRC;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        scriptPromise = null;
        reject(new Error("Turnstile failed to load"));
      };
      document.head.appendChild(script);
    });
  }
  return scriptPromise;
}

export type CaptchaStatus = "checking" | "ready" | "failed";

// Tracks whether the form has a fresh Turnstile token. Forms disable their
// submit button until it's ready, because the check runs in the background and
// runs again after every submit (tokens are single-use).
export function useTurnstile() {
  const [token, setToken] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const status: CaptchaStatus = !TURNSTILE_SITE_KEY || token ? "ready" : failed ? "failed" : "checking";
  return { token, setToken, setFailed, status, ready: status === "ready" };
}

export function captchaButtonLabel(status: CaptchaStatus, label: string) {
  if (status === "checking") return "Checking your browser…";
  if (status === "failed") return "Bot check failed. Refresh the page";
  return label;
}

// Renders inside a <form>; Turnstile adds a hidden "cf-turnstile-response"
// input that the server action reads. Change resetKey after each submit.
// Pass the setters from useTurnstile (they're stable).
export function Turnstile({
  resetKey,
  onToken,
  onFailed,
}: {
  resetKey?: unknown;
  onToken: (token: string | null) => void;
  onFailed: (failed: boolean) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY) return;
    let cancelled = false;
    loadTurnstile()
      .then(() => {
        if (cancelled || !window.turnstile || !containerRef.current || widgetIdRef.current) return;
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: TURNSTILE_SITE_KEY,
          theme: "dark",
          appearance: "interaction-only",
          callback: (token: string) => {
            onFailed(false);
            onToken(token);
          },
          "expired-callback": () => onToken(null),
          "error-callback": () => {
            onToken(null);
            onFailed(true);
          },
        });
      })
      .catch(() => {
        if (!cancelled) onFailed(true);
      });
    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) window.turnstile.remove(widgetIdRef.current);
      widgetIdRef.current = null;
    };
  }, [onToken, onFailed]);

  useEffect(() => {
    if (resetKey !== undefined && widgetIdRef.current && window.turnstile) {
      onToken(null);
      window.turnstile.reset(widgetIdRef.current);
    }
  }, [resetKey, onToken]);

  if (!TURNSTILE_SITE_KEY) return null;
  return <div ref={containerRef} />;
}
