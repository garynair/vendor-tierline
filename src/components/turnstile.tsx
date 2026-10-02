"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";

// Cloudflare Turnstile bot check. Supabase Auth verifies the token server-side
// (Authentication -> Attack Protection), so the app only passes it along.
// Without NEXT_PUBLIC_TURNSTILE_SITE_KEY nothing renders and no token is sent,
// which keeps sign-in working until CAPTCHA is switched on in Supabase.
export const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

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

// Tracks whether the form has a fresh Turnstile token. Forms disable their
// submit button until `ready`, because the check runs in the background and
// takes a moment (and runs again after every submit, since tokens are
// single-use).
export function useTurnstile() {
  const [token, setToken] = useState<string | null>(null);
  return { token, setToken, ready: !TURNSTILE_SITE_KEY || Boolean(token) };
}

// Renders inside a <form>; Turnstile adds a hidden "cf-turnstile-response"
// input that the server action reads. Change resetKey after each submit.
// onToken should be a stable setter (useTurnstile's setToken).
export function Turnstile({
  resetKey,
  onToken,
}: {
  resetKey?: unknown;
  onToken: (token: string | null) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  const renderWidget = () => {
    if (!TURNSTILE_SITE_KEY || !window.turnstile || !containerRef.current || widgetIdRef.current) return;
    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: TURNSTILE_SITE_KEY,
      theme: "dark",
      appearance: "interaction-only",
      callback: (token: string) => onToken(token),
      "expired-callback": () => onToken(null),
      "error-callback": () => onToken(null),
    });
  };

  useEffect(() => {
    renderWidget();
    return () => {
      if (widgetIdRef.current && window.turnstile) window.turnstile.remove(widgetIdRef.current);
      widgetIdRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (resetKey !== undefined && widgetIdRef.current && window.turnstile) {
      onToken(null);
      window.turnstile.reset(widgetIdRef.current);
    }
  }, [resetKey]);

  if (!TURNSTILE_SITE_KEY) return null;

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onReady={renderWidget}
      />
      <div ref={containerRef} />
    </>
  );
}
