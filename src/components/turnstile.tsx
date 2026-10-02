"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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

// Tracks the form's Turnstile token. The check runs in the background (about
// 1-3 seconds) and again after every submit, since tokens are single-use.
// Buttons stay clickable: a click that lands before the check finishes is
// queued and the form submits itself as soon as the token arrives.
// Usage: <form onSubmit={captcha.onSubmit} ...> and pass captcha.setToken /
// captcha.setFailed to <Turnstile>.
export function useTurnstile() {
  const [token, setTokenState] = useState<string | null>(null);
  const [failed, setFailedState] = useState(false);
  const [queued, setQueued] = useState(false);
  // Read only in event handlers and Turnstile callbacks, never during render.
  const tokenRef = useRef<string | null>(null);
  const queuedFormRef = useRef<HTMLFormElement | null>(null);
  const status: CaptchaStatus = !TURNSTILE_SITE_KEY || token ? "ready" : failed ? "failed" : "checking";

  const setToken = useCallback((value: string | null) => {
    tokenRef.current = value;
    setTokenState(value);
    const form = queuedFormRef.current;
    if (value && form) {
      queuedFormRef.current = null;
      setQueued(false);
      form.requestSubmit();
    }
  }, []);

  const setFailed = useCallback((value: boolean) => {
    setFailedState(value);
    if (value) {
      queuedFormRef.current = null;
      setQueued(false);
    }
  }, []);

  const onSubmit = useCallback((event: React.FormEvent<HTMLFormElement>) => {
    if (!TURNSTILE_SITE_KEY || tokenRef.current) return;
    event.preventDefault();
    queuedFormRef.current = event.currentTarget;
    setQueued(true);
  }, []);

  return { setToken, setFailed, onSubmit, status, queued };
}

// Label for the submit button. While a click is queued it reads like the
// request is already under way.
export function captchaButtonLabel(
  captcha: { status: CaptchaStatus; queued: boolean },
  label: string,
  busyLabel: string
) {
  if (captcha.queued) return busyLabel;
  if (captcha.status === "failed") return "Bot check failed. Refresh the page";
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
