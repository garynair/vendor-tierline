// Reads the Turnstile token that the widget adds to a form. Supabase Auth
// verifies it; when CAPTCHA is off in Supabase the token is simply ignored.
export function captchaToken(formData: FormData): string | undefined {
  const token = formData.get("cf-turnstile-response");
  return typeof token === "string" && token ? token : undefined;
}
