import { describe, expect, it } from "vitest";
import { describeDatabaseUrl } from "@/lib/persistence/database-target";

describe("describeDatabaseUrl", () => {
  it("names the local database without returning the password", () => {
    const target = describeDatabaseUrl("postgresql://postgres:secret@localhost:5432/mattel_infrastructures");
    expect(target).toEqual({
      configured: true,
      host: "localhost",
      database: "mattel_infrastructures",
      local: true,
      hasCredential: true,
    });
    expect(JSON.stringify(target)).not.toContain("secret");
  });

  it("treats a remote host as hosted", () => {
    const target = describeDatabaseUrl("postgresql://app:secret@db.example.com:5432/mattel");
    expect(target.configured && target.local).toBe(false);
  });
});
