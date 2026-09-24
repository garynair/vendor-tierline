import Link from "next/link";

export default function AuthErrorPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-3 px-4">
      <h1 className="text-xl font-semibold">That link didn&apos;t work</h1>
      <p className="text-sm text-gray-600">
        Confirmation links expire and can only be used once. If you already confirmed, just log in.
        Otherwise, sign up again to get a new link.
      </p>
      <div className="flex gap-4 text-sm">
        <Link href="/login" className="underline">
          Log in
        </Link>
        <Link href="/signup" className="underline">
          Sign up
        </Link>
      </div>
    </main>
  );
}
