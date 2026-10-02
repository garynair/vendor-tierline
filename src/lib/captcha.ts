// Reads the Turnstile token that the widget adds to a form. Supabase Auth
// verifies it; when CAPTCHA is off in Supabase the token is simply ignored.
export function captchaToken(formData: FormData): string | undefined {
  const token = formData.get("cf-turnstile-response");
  return typeof token === "string" && token ? token : undefined;
}

// Supabase's CAPTCHA errors are technical; show something a person can act on.
export function friendlyAuthError(message: string): string {
  return /captcha/i.test(message)
    ? "We couldn't confirm you're not a bot. Wait a moment for the check to finish, then try again."
    : message;
}
