import { describe, expect, it } from "vitest";
import { companyNameError, normalizeUnitTypes } from "@/lib/settings/profile";
import { brandingFileError, brandingObjectKey, publicObjectUrl } from "@/lib/storage/s3-client";

describe("system settings", () => {
  it("keeps the company name free of an LLP suffix and dedupes units", () => {
    expect(companyNameError("Mattel Infrastructures")).toBeNull();
    expect(companyNameError("Mattel Infrastructures LLP")).toBe("The company name is Mattel Infrastructures.");
    expect(normalizeUnitTypes([" Bags ", "bags", "Sqm", ""])).toEqual(["Bags", "Sqm"]);
  });

  it("accepts a logo image and requires a PNG stamp", () => {
    expect(brandingFileError("image/png", "logos")).toBeNull();
    expect(brandingFileError("image/jpeg", "signatures")).toBe("Signature stamps must be transparent PNG files.");
    expect(brandingObjectKey("stamp.png", "signatures")).toMatch(/^signatures\/.+-stamp\.png$/);
    expect(publicObjectUrl("site-files", "logos/mark.png", { S3_PUBLIC_BASE_URL: "https://files.example" })).toBe(
      "https://files.example/logos/mark.png",
    );
  });
});
