"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { authClient } from "../../lib/auth/client";

export default function SignupPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);

    const form = new FormData(event.currentTarget);
    try {
      const result = await authClient.signUp.email({
        name: String(form.get("name")),
        email: String(form.get("email")),
        password: String(form.get("password")),
      });
      if (result.error) {
        setError(result.error.message || "Unable to create your account. Please try again.");
        return;
      }
      router.replace("/dashboard");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to create your account. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="wrap auth-wrap">
      <section className="panel auth-panel">
        <h1>Create your Ledger account</h1>
        <p className="sub">Your budgets and transactions stay with your account.</p>
        <form className="auth-form" onSubmit={submit}>
          <label htmlFor="name">Name</label>
          <input id="name" name="name" type="text" autoComplete="name" required />
          <label htmlFor="email">Email address</label>
          <input id="email" name="email" type="email" autoComplete="email" required />
          <label htmlFor="password">Password</label>
          <input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
          {error && <p className="auth-error" role="alert">{error}</p>}
          <button className="btn" type="submit" disabled={pending}>
            {pending ? "Creating account..." : "Create account"}
          </button>
        </form>
        <p className="auth-switch">Already have an account? <Link href="/login">Log in</Link></p>
      </section>
    </main>
  );
}