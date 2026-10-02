// Mirrors the Supabase Auth password policy (Authentication -> Sign In /
// Providers -> Email): minimum 10 characters with lowercase, uppercase,
// digits, and symbols. Supabase enforces it; this only lets the form show
// progress and catch misses before the request.
// Symbols Supabase counts (docs: guides/auth/password-security):
// !@#$%^&*()_+-=[]{};'\:"|<>?,./`~
const SUPABASE_SYMBOLS = /[!@#$%^&*()_+\-=[\]{};'\\:"|<>?,./`~]/;

export const PASSWORD_RULES = [
  { label: "At least 10 characters", test: (value: string) => value.length >= 10 },
  { label: "A lowercase letter", test: (value: string) => /[a-z]/.test(value) },
  { label: "An uppercase letter", test: (value: string) => /[A-Z]/.test(value) },
  { label: "A number", test: (value: string) => /\d/.test(value) },
  { label: "A symbol, such as ! @ # $", test: (value: string) => SUPABASE_SYMBOLS.test(value) },
];

export function passwordProblems(value: string): string[] {
  return PASSWORD_RULES.filter((rule) => !rule.test(value)).map((rule) => rule.label.toLowerCase());
}
