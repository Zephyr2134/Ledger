CREATE TABLE IF NOT EXISTS ledger_budgets (
  user_id text NOT NULL,
  category text NOT NULL,
  amount numeric(12, 2) NOT NULL CHECK (amount >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, category)
);

CREATE TABLE IF NOT EXISTS ledger_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  date date NOT NULL,
  description varchar(160) NOT NULL CHECK (length(trim(description)) > 0),
  amount numeric(12, 2) NOT NULL CHECK (amount > 0),
  category text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('income', 'expense')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (kind = 'income' AND category = 'Income') OR
    (kind = 'expense' AND category IN (
      'Housing', 'Groceries', 'Transport', 'Dining out',
      'Utilities', 'Health', 'Fun', 'Savings'
    ))
  )
);

CREATE INDEX IF NOT EXISTS ledger_transactions_user_date_idx
  ON ledger_transactions (user_id, date DESC, created_at DESC);
