import { auth } from "./server";

export async function getAuthenticatedUserId() {
  const { data, error } = await auth.getSession();
  if (error) throw error;
  return data?.user?.id ?? null;
}
