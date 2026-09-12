const STORAGE_KEY = "thesis-user-id";

export function getUserId(): string {
  if (typeof window === "undefined") return "";
  const existing = window.localStorage.getItem(STORAGE_KEY);
  if (existing) return existing;
  const id = crypto.randomUUID();
  window.localStorage.setItem(STORAGE_KEY, id);
  return id;
}
