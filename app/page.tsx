import Link from "next/link";
import type { CSSProperties } from "react";

// Example month shown in the hero ring. Lengths are percentages of income and sum to 67.
const SEGMENTS = [
  { name: "Housing", len: 28, cls: "housing" },
  { name: "Groceries", len: 11, cls: "groceries" },
  { name: "Transport", len: 4, cls: "transport" },
  { name: "Dining out", len: 6, cls: "dining" },
  { name: "Utilities", len: 5, cls: "utilities" },
  { name: "Health", len: 2, cls: "health" },
  { name: "Fun", len: 3, cls: "fun" },
  { name: "Savings", len: 8, cls: "savings" },
];

const POINTS = [
  { title: "Set a limit for each category", body: "Housing, groceries, fun. Decide the amount once and change it whenever your month changes." },
  { title: "Log spending in seconds", body: "Add an expense or income with an amount, a date and a category. That’s all it takes." },
  { title: "See what’s left", body: "The ring shows how much of your income is spent, and tells you plainly when you go over." },
];

export default function Landing() {
  let start = 0;
  const arcs = SEGMENTS.map((s, i) => {
    const arc = { ...s, i, start };
    start += s.len;
    return arc;
  });

  return (
    <main className="wrap land">
      <header className="land-top">
        <span className="land-logo">Ledger</span>
      </header>

      <section className="land-hero">
        <div>
          <h1 className="land-in" style={{ "--d": "0.1s" } as CSSProperties}>
            Know what’s left before you spend it.
          </h1>
          <p className="land-lede land-in" style={{ "--d": "0.25s" } as CSSProperties}>
            Ledger divides each month’s income across your budgets, so you can see where it went and what remains.
          </p>
          <div className="land-cta land-in" style={{ "--d": "0.4s" } as CSSProperties}>
            <Link href="/signup" className="btn">Create an account</Link>
            <Link href="/login" className="btn ghost">Log in</Link>
          </div>
        </div>

        <figure className="land-figure">
          <div className="land-ring" role="img" aria-label="Example: 67% of a month’s income spent across eight categories">
            <svg viewBox="0 0 200 200" aria-hidden="true">
              <circle className="track-ring" cx="100" cy="100" r="80" />
              {arcs.map((a) => (
                <circle
                  key={a.name}
                  className={`seg ${a.cls}`}
                  cx="100" cy="100" r="80"
                  pathLength={100}
                  style={{ "--len": a.len - 0.7, "--i": a.i, strokeDashoffset: -a.start } as CSSProperties}
                />
              ))}
            </svg>
            <div className="land-center">
              <div className="pct" aria-hidden="true" />
              <div className="small">of income spent</div>
            </div>
          </div>
          <figcaption className="land-cap">An example month</figcaption>
        </figure>
      </section>

      <section className="land-points land-fade" aria-label="How Ledger works">
        {POINTS.map((p) => (
          <div key={p.title}>
            <h2>{p.title}</h2>
            <p className="sub">{p.body}</p>
          </div>
        ))}
      </section>
    </main>
  );
}