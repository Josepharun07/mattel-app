export type DatabaseTarget =
  | { configured: false; invalid?: boolean }
  | { configured: true; host: string; database: string; local: boolean; hasCredential: boolean };

export function describeDatabaseUrl(url: string | undefined): DatabaseTarget {
  if (!url) {
    return { configured: false };
  }
  try {
    const parsed = new URL(url);
    const host = parsed.hostname;
    return {
      configured: true,
      host,
      database: decodeURIComponent(parsed.pathname.replace(/^\//, "")),
      local: host === "localhost" || host === "127.0.0.1",
      hasCredential: Boolean(parsed.username || parsed.password),
    };
  } catch {
    return { configured: false, invalid: true };
  }
}
