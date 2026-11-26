"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Chart as ChartJS, ArcElement, Tooltip } from "chart.js";
import { Doughnut } from "react-chartjs-2";
import { authClient } from "../../lib/auth/client";
import { CATEGORIES, DEFAULT_BUDGETS, type Cat, type Kind, type Tx } from "../../lib/ledger";

ChartJS.register(ArcElement, Tooltip);

const CURRENCY = "NOK";
const money = (n: number) =>
  new Intl.NumberFormat(undefined, { style: "currency", currency: CURRENCY, maximumFractionDigits: 0 }).format(n);
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export default function DashboardPage() {
  const router = useRouter();
  const [txs, setTxs] = useState<Tx[]>([]);
  const [budgets, setBudgets] = useState<Record<string, number>>(DEFAULT_BUDGETS);
  const [month, setMonth] = useState("");
  const [ready, setReady] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [error, setError] = useState("");
  const [savingBudgets, setSavingBudgets] = useState(false);

  // form state
  const [kind, setKind] = useState<Kind>("expense");
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<string>(CATEGORIES[0].name);
  const [date, setDate] = useState("");

  useEffect(() => {
    const t = today();
    setMonth(t.slice(0, 7));
    setDate(t);
    setTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
  }, []);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("ledger:theme", next); } catch {}
  }

  useEffect(() => {
    let cancelled = false;

    async function loadLedger() {
      try {
        const response = await fetch("/api/ledger", { cache: "no-store" });
        if (!response.ok) throw new Error(`Could not load your budget (HTTP ${response.status}).`);

        const data = await response.json() as { transactions: Tx[]; budgets: Record<string, number> };
        if (cancelled) return;
        setTxs(data.transactions);
        setBudgets({ ...DEFAULT_BUDGETS, ...data.budgets });
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "Could not load your budget.");
      } finally {
        if (!cancelled) setReady(true);
      }
    }

    void loadLedger();
    return () => { cancelled = true; };
  }, []);

  const monthTxs = useMemo(
    () => (!month ? [] : txs.filter((t) => t.date.startsWith(month))).sort((a, b) => b.date.localeCompare(a.date)),
    [txs, month]
  );
  const income = monthTxs.filter((t) => t.kind === "income").reduce((s, t) => s + t.amount, 0);
  const spentBy = useMemo(() => {
    const m: Record<string, number> = {};
    monthTxs.filter((t) => t.kind === "expense").forEach((t) => (m[t.category] = (m[t.category] ?? 0) + t.amount));
    return m;
  }, [monthTxs]);
  const spent = Object.values(spentBy).reduce((s, n) => s + n, 0);
  const left = income - spent;
  const planned = Object.values(budgets).reduce((s, n) => s + n, 0);

  const dark = theme === "dark";
  const col = (c: Cat) => (dark && "dark" in c ? c.dark : c.color);
  const trackColor = dark ? "#2a3650" : "#e9ecf1";

  // Doughnut: one slice per category spent, plus whatever is left of income
  const slices = CATEGORIES.filter((c) => spentBy[c.name]);
  const remaining = Math.max(left, 0);
  const hasData = slices.length > 0 || remaining > 0;
  const chartData = {
    labels: hasData ? [...slices.map((c) => c.name), ...(remaining > 0 ? ["Left to spend"] : [])] : ["No data"],
    datasets: [
      {
        data: hasData ? [...slices.map((c) => spentBy[c.name]), ...(remaining > 0 ? [remaining] : [])] : [1],
        backgroundColor: hasData ? [...slices.map((c) => col(c)), ...(remaining > 0 ? [trackColor] : [])] : [trackColor],
        borderColor: dark ? "#161f31" : "#ffffff",
        borderWidth: 2,
        hoverOffset: 4,
      },
    ],
  };
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "70%",
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: hasData,
        callbacks: { label: (ctx: { label: string; parsed: number }) => ` ${ctx.label}: ${money(ctx.parsed)}` },
      },
    },
  };
  const centerBig = income > 0 ? `${Math.round((spent / income) * 100)}%` : spent > 0 ? money(spent) : "–";
  const centerSmall = income > 0 ? "of income spent" : spent > 0 ? "spent, no income logged" : "nothing logged";

  async function saveBudgets(nextBudgets = budgets) {
    setError("");
    setSavingBudgets(true);
    try {
      const response = await fetch("/api/ledger", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ budgets: nextBudgets }),
      });
      if (!response.ok) throw new Error(`Could not save budgets (HTTP ${response.status}).`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save budgets.");
    } finally {
      setSavingBudgets(false);
    }
  }

  async function createTransaction(transaction: Omit<Tx, "id">) {
    const response = await fetch("/api/ledger", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(transaction),
    });
    if (!response.ok) throw new Error(`Could not save transaction (HTTP ${response.status}).`);
    const data = await response.json() as { transaction: Tx };
    return data.transaction;
  }

  async function add(e: React.SyntheticEvent) {
    e.preventDefault();
    const value = parseFloat(amount);
    if (!desc.trim() || !(value > 0)) return;
    setError("");
    try {
      const saved = await createTransaction({
        date,
        desc: desc.trim(),
        amount: value,
        kind,
        category: kind === "income" ? "Income" : category,
      });
      setTxs((previous) => [...previous, saved]);
      setDesc("");
      setAmount("");
      setMonth(date.slice(0, 7));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save transaction.");
    }
  }

  async function loadSample() {
    const m = month;
    const rows: [string, string, number, string, Kind][] = [
      ["01", "Salary", 3800, "Income", "income"], ["01", "Rent", 1200, "Housing", "expense"],
      ["03", "Weekly shop", 96, "Groceries", "expense"], ["05", "Transit pass", 70, "Transport", "expense"],
      ["08", "Electricity", 88, "Utilities", "expense"], ["10", "Dinner with friends", 64, "Dining out", "expense"],
      ["12", "Weekly shop", 104, "Groceries", "expense"], ["15", "Cinema", 28, "Fun", "expense"],
      ["18", "Pharmacy", 34, "Health", "expense"], ["20", "Transfer to savings", 400, "Savings", "expense"],
    ];
    setError("");
    for (const [day, description, value, transactionCategory, transactionKind] of rows) {
      try {
        const saved = await createTransaction({
          date: `${m}-${day}`,
          desc: description,
          amount: value,
          category: transactionCategory,
          kind: transactionKind,
        });
        setTxs((previous) => [...previous, saved]);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Could not save sample transactions.");
        return;
      }
    }
  }

  async function deleteTransaction(id: string) {
    setError("");
    try {
      const response = await fetch(`/api/ledger?transactionId=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!response.ok) throw new Error(`Could not delete transaction (HTTP ${response.status}).`);
      setTxs((previous) => previous.filter((transaction) => transaction.id !== id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not delete transaction.");
    }
  }

  async function logOut() {
    setError("");
    try {
      const result = await authClient.signOut();
      if (result.error) throw new Error(result.error.message || "Could not log out.");
      router.replace("/login");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not log out.");
    }
  }

  if (!ready) return <main className="wrap"><p>Loading your budget...</p></main>;

  return (
    <main className="wrap">
      <header className="top">
        <div>
          <h1>Ledger</h1>
          <p className="sub">Your income, divided by where it went.</p>
        </div>
        <div className="tools">
          <button type="button" className="btn ghost" onClick={() => void logOut()}>Log out</button>
          <button type="button" className="btn ghost" onClick={toggleTheme} aria-label={`Switch to ${dark ? "light" : "dark"} mode`}>
            {dark ? "Light mode" : "Dark mode"}
          </button>
          <input type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} aria-label="Month" />
        </div>
      </header>

      {error && <p className="notice" role="alert">{error}</p>}

      <section className="envelope" aria-label="Month summary">
        <div className="summary">
          <div>
            <div className="figures">
              <div className="fig main">
                <div className="label">Left to spend</div>
                <div className={`num ${left < 0 ? "neg" : ""}`}>{money(left)}</div>
              </div>
              <div className="fig"><div className="label">Income</div><div className="num">{money(income)}</div></div>
              <div className="fig"><div className="label">Spent</div><div className="num">{money(spent)}</div></div>
            </div>
            <ul className="legend">
              {slices.map((c) => (
                <li key={c.name}><span className="dot" style={{ background: col(c) }} />{c.name} {money(spentBy[c.name])}</li>
              ))}
              {remaining > 0 && <li><span className="dot" style={{ background: trackColor, border: "1px solid var(--line)" }} />Left to spend {money(remaining)}</li>}
            </ul>
            {left < 0 && <p className="notice">You&apos;ve spent {money(-left)} more than you earned this month.</p>}
            {income > 0 && planned > income && left >= 0 && (
              <p className="sub">Your category budgets total {money(planned)}, which is more than this month&apos;s income.</p>
            )}
          </div>
          <div className="donut" role="img" aria-label={`${money(spent)} spent of ${money(income)} income`}>
            <Doughnut data={chartData} options={chartOptions} />
            <div className="donut-center">
              <div className="big">{centerBig}</div>
              <div className="small">{centerSmall}</div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid">
        <section className="panel" aria-label="Budgets">
          <h2>Budgets</h2>
          <p className="sub" aria-live="polite">{savingBudgets ? "Saving budgets..." : ""}</p>
          {CATEGORIES.map((c) => {
            const s = spentBy[c.name] ?? 0, b = budgets[c.name] ?? 0, isOver = s > b;
            return (
              <div className="cat" key={c.name}>
                <div className="cat-head">
                  <b><span className="dot" style={{ background: col(c) }} />{c.name}</b>
                  <span className={`amt ${isOver ? "over" : ""}`}>{money(s)} of {money(b)}</span>
                </div>
                <div className="track"><div style={{ width: `${b ? Math.min(100, (s / b) * 100) : s ? 100 : 0}%`, background: isOver ? "var(--over)" : col(c) }} /></div>
                <div className="cat-foot">
                  <span className={isOver ? "over" : ""}>{isOver ? `${money(s - b)} over` : `${money(b - s)} left`}</span>
                  <label>Monthly budget{" "}
                    <input type="number" min={0} step={10} value={b}
                      onChange={(e) => setBudgets({ ...budgets, [c.name]: Math.max(0, Number(e.target.value) || 0) })}
                      onBlur={() => void saveBudgets(budgets)} />
                  </label>
                </div>
              </div>
            );
          })}
        </section>

        <div style={{ display: "grid", gap: 24 }}>
          <section className="panel" aria-label="Add transaction">
            <h2>Add transaction</h2>
            <form className="add" onSubmit={add}>
              <div className="full seg" role="group" aria-label="Type">
                <button type="button" aria-pressed={kind === "expense"} onClick={() => setKind("expense")}>Expense</button>
                <button type="button" aria-pressed={kind === "income"} onClick={() => setKind("income")}>Income</button>
              </div>
              <label className="full">Description
                <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder={kind === "income" ? "Salary" : "Weekly shop"} required />
              </label>
              <label>Amount
                <input type="number" min="0.01" step="0.01" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} required />
              </label>
              <label>Date
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
              </label>
              {kind === "expense" && (
                <label className="full">Category
                  <select value={category} onChange={(e) => setCategory(e.target.value)}>
                    {CATEGORIES.map((c) => <option key={c.name}>{c.name}</option>)}
                  </select>
                </label>
              )}
              <button className="btn full" type="submit">Add {kind}</button>
            </form>
          </section>

          <section className="panel" aria-label="Transactions">
            <h2>Transactions</h2>
            {monthTxs.length === 0 ? (
              <div className="empty">
                <p>Nothing logged for this month. Add your first transaction, or fill in sample data to see how it works.</p>
                <button className="btn ghost" onClick={() => void loadSample()}>Load sample data</button>
              </div>
            ) : (
              <ul className="tx">
                {monthTxs.map((t) => (
                  <li key={t.id}>
                    <div>{t.desc}<div className="meta">{t.date} · {t.category}</div></div>
                    <span className={`amt ${t.kind === "income" ? "pos" : ""}`}>{t.kind === "income" ? "+" : "−"}{money(t.amount)}</span>
                    <button className="btn link" onClick={() => void deleteTransaction(t.id)} aria-label={`Delete ${t.desc}`}>Delete</button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}