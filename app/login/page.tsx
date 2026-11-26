"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { authClient } from "../../lib/auth/client";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);

    const form = new FormData(event.currentTarget);
    try {
      const result = await authClient.signIn.email({
        email: String(form.get("email")),
        password: String(form.get("password")),
      });
      if (result.error) {
        setError(result.error.message || "Unable to log in. Check your details and try again.");
        return;
      }
      router.replace("/dashboard");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to log in. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="wrap auth-wrap">
      <section className="panel auth-panel">
        <h1>Log in to Ledger</h1>
        <p className="sub">Pick up where you left off.</p>
        <form className="auth-form" onSubmit={submit}>
          <label htmlFor="email">Email address</label>
          <input id="email" name="email" type="email" autoComplete="email" required />
          <label htmlFor="password">Password</label>
          <input id="password" name="password" type="password" autoComplete="current-password" required />
          {error && <p className="auth-error" role="alert">{error}</p>}
          <button className="btn" type="submit" disabled={pending}>
            {pending ? "Logging in..." : "Log in"}
          </button>
        </form>
        <p className="auth-switch">New to Ledger? <Link href="/signup">Create an account</Link></p>
      </section>
    </main>
  );
}