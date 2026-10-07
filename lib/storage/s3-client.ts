import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createStorageClient, readStorageConfig } from "@/lib/storage/s3";

export type BrandingFolder = "logos" | "signatures";

const logoTypes = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];

export function brandingFileError(fileType: string, folder: BrandingFolder) {
  if (folder === "signatures" && fileType !== "image/png") {
    return "Signature stamps must be transparent PNG files.";
  }
  if (folder === "logos" && !logoTypes.includes(fileType)) {
    return "Logo files must be PNG, JPEG, WEBP, or SVG.";
  }
  return null;
}

export function brandingObjectKey(fileName: string, folder: BrandingFolder) {
  const cleaned = fileName.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-").slice(0, 80);
  return `${folder}/${crypto.randomUUID()}-${cleaned || "image"}`;
}

export function publicObjectUrl(bucket: string, key: string, env: Record<string, string | undefined> = process.env) {
  const base = env.S3_PUBLIC_BASE_URL?.replace(/\/$/, "");
  if (base) {
    return `${base}/${key}`;
  }
  const endpoint = env.S3_ENDPOINT?.replace(/\/$/, "");
  if (endpoint) {
    return `${endpoint}/${bucket}/${key}`;
  }
  return key;
}

export async function getPresignedUploadUrl(fileName: string, fileType: string, folder: BrandingFolder) {
  const typeError = brandingFileError(fileType, folder);
  if (typeError) {
    throw new Error(typeError);
  }

  const config = readStorageConfig();
  if (!config.endpoint || !config.accessKeyId || !config.secretAccessKey) {
    throw new Error("S3 storage is not configured. Set S3_ENDPOINT, S3_ACCESS_KEY_ID, and S3_SECRET_ACCESS_KEY.");
  }

  const client = createStorageClient(config);
  const key = brandingObjectKey(fileName, folder);
  const expiresIn = 900;
  const url = await getSignedUrl(
    client,
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      ContentType: fileType,
    }),
    { expiresIn },
  );

  return {
    url,
    key,
    bucket: config.bucket,
    expiresIn,
    publicUrl: publicObjectUrl(config.bucket, key),
  };
}
