import { CATEGORY_NAMES, type Kind, type Tx } from "../../../lib/ledger";
import { getAuthenticatedUserId } from "../../../lib/auth/session";
import { getSql } from "../../../lib/db";

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const timestamp = Date.parse(`${value}T00:00:00.000Z`);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value;
}

function isAmount(value: unknown, allowZero = false): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value <= 9_999_999_999.99 &&
    (allowZero ? value >= 0 : value > 0)
  );
}

function isKind(value: unknown): value is Kind {
  return value === "income" || value === "expense";
}

function isTransaction(value: unknown): value is Omit<Tx, "id"> {
  if (!isRecord(value)) return false;
  return (
    isDate(value.date) &&
    typeof value.desc === "string" &&
    value.desc.trim().length > 0 &&
    value.desc.trim().length <= 160 &&
    isAmount(value.amount) &&
    isKind(value.kind) &&
    typeof value.category === "string" &&
    (value.kind === "income"
      ? value.category === "Income"
      : CATEGORY_NAMES.has(value.category))
  );
}

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function unauthorized() {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}

function invalidRequest(message: string) {
  return Response.json({ error: message }, { status: 400 });
}

export async function GET() {
  const userId = await getAuthenticatedUserId();
  if (!userId) return unauthorized();

  const sql = getSql();
  const [transactions, budgets] = await Promise.all([
    sql`
      SELECT id, date::text AS date, description AS desc, amount, category, kind
      FROM ledger_transactions
      WHERE user_id = ${userId}
      ORDER BY date DESC, created_at DESC
    `,
    sql`
      SELECT category, amount
      FROM ledger_budgets
      WHERE user_id = ${userId}
    `,
  ]);

  return Response.json({
    transactions: transactions.map((row) => ({
      id: row.id,
      date: row.date,
      desc: row.desc,
      amount: Number(row.amount),
      category: row.category,
      kind: row.kind,
    })),
    budgets: Object.fromEntries(
      budgets.map((row) => [row.category, Number(row.amount)]),
    ),
  });
}

export async function POST(request: Request) {
  const userId = await getAuthenticatedUserId();
  if (!userId) return unauthorized();

  const body = await readJson(request);
  if (!isTransaction(body)) {
    return invalidRequest("Provide a valid transaction with a positive amount and supported category.");
  }

  const rows = await getSql()`
    INSERT INTO ledger_transactions (user_id, date, description, amount, category, kind)
    VALUES (${userId}, ${body.date}, ${body.desc.trim()}, ${body.amount}, ${body.category}, ${body.kind})
    RETURNING id, date::text AS date, description AS desc, amount, category, kind
  `;
  const row = rows[0];
  if (!row) throw new Error("The transaction insert did not return a saved row.");

  const transaction: Tx = {
    id: row.id,
    date: row.date,
    desc: row.desc,
    amount: Number(row.amount),
    category: row.category,
    kind: row.kind,
  };

  return Response.json(
    { transaction },
    { status: 201 },
  );
}

export async function PUT(request: Request) {
  const userId = await getAuthenticatedUserId();
  if (!userId) return unauthorized();

  const body = await readJson(request);
  if (!isRecord(body) || !isRecord(body.budgets)) {
    return invalidRequest("Provide a budgets object.");
  }

  const entries = Object.entries(body.budgets);
  if (
    entries.length === 0 ||
    entries.some(([category, amount]) => !CATEGORY_NAMES.has(category) || !isAmount(amount, true))
  ) {
    return invalidRequest("Budgets must contain supported categories and non-negative amounts.");
  }

  const categories = entries.map(([category]) => category);
  const amounts = entries.map(([, amount]) => amount);
  await getSql()`
    INSERT INTO ledger_budgets (user_id, category, amount)
    SELECT ${userId}, incoming.category, incoming.amount
    FROM unnest(${categories}::text[], ${amounts}::numeric[]) AS incoming(category, amount)
    ON CONFLICT (user_id, category)
    DO UPDATE SET amount = EXCLUDED.amount, updated_at = now()
  `;

  return Response.json({ budgets: Object.fromEntries(entries) });
}

export async function DELETE(request: Request) {
  const userId = await getAuthenticatedUserId();
  if (!userId) return unauthorized();

  const transactionId = new URL(request.url).searchParams.get("transactionId");
  if (!transactionId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(transactionId)) {
    return invalidRequest("Provide a valid transactionId.");
  }

  const result = await getSql()`
    DELETE FROM ledger_transactions WHERE id = ${transactionId} AND user_id = ${userId}
    RETURNING id
  `;
  if (result.length === 0) {
    return Response.json({ error: "Transaction not found." }, { status: 404 });
  }

  return Response.json({ deleted: true });
}
