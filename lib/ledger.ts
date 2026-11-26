export const CATEGORIES = [
  { name: "Housing", color: "#264653", dark: "#6d9db0", budget: 1200 },
  { name: "Groceries", color: "#2a9d8f", budget: 450 },
  { name: "Transport", color: "#6a8caf", budget: 150 },
  { name: "Dining out", color: "#e9a23b", budget: 200 },
  { name: "Utilities", color: "#8d6b94", budget: 180 },
  { name: "Health", color: "#c8553d", budget: 100 },
  { name: "Fun", color: "#d98cab", budget: 150 },
  { name: "Savings", color: "#7a9e5f", budget: 400 },
] as const;

export type Kind = "income" | "expense";
export type Tx = {
  id: string;
  date: string;
  desc: string;
  amount: number;
  category: string;
  kind: Kind;
};
export type Cat = (typeof CATEGORIES)[number];

export const CATEGORY_NAMES = new Set<string>(CATEGORIES.map((category) => category.name));
export const DEFAULT_BUDGETS: Record<string, number> = Object.fromEntries(
  CATEGORIES.map((category) => [category.name, category.budget]),
);
