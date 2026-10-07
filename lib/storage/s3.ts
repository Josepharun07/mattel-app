import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export type StorageConfig = {
  region: string;
  endpoint?: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle: boolean;
};

export function readStorageConfig(
  env: Record<string, string | undefined> = process.env,
): StorageConfig {
  return {
    region: env.S3_REGION || "auto",
    endpoint: env.S3_ENDPOINT || undefined,
    bucket: env.S3_BUCKET_NAME || env.S3_BUCKET || "mattel-infrastructures",
    accessKeyId: env.S3_ACCESS_KEY_ID || "",
    secretAccessKey: env.S3_SECRET_ACCESS_KEY || "",
    forcePathStyle: env.S3_FORCE_PATH_STYLE !== "false",
  };
}

export function createStorageClient(config: StorageConfig = readStorageConfig()) {
  return new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    forcePathStyle: config.forcePathStyle,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
}

function assertConfigured(config: StorageConfig) {
  if (!config.endpoint || !config.accessKeyId || !config.secretAccessKey) {
    throw new Error(
      "S3 storage is not configured. Set S3_ENDPOINT, S3_ACCESS_KEY_ID, and S3_SECRET_ACCESS_KEY.",
    );
  }
}

export async function putStoredObject(input: {
  key: string;
  body: Uint8Array;
  contentType: string;
}) {
  const config = readStorageConfig();
  assertConfigured(config);
  const client = createStorageClient(config);

  await client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: input.key,
      Body: input.body,
      ContentType: input.contentType,
    }),
  );

  return { bucket: config.bucket, key: input.key };
}

export async function getStoredObject(key: string) {
  const config = readStorageConfig();
  assertConfigured(config);
  const client = createStorageClient(config);

  return client.send(
    new GetObjectCommand({
      Bucket: config.bucket,
      Key: key,
    }),
  );
}

export function buildUploadKey(fileName: string) {
  const cleaned = fileName.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-").slice(0, 80);
  const day = new Date().toISOString().slice(0, 10);
  return `uploads/${day}/${crypto.randomUUID()}-${cleaned || "file"}`;
}

export async function createPresignedUploadUrl(input: {
  fileName: string;
  contentType: string;
  expiresIn?: number;
}) {
  const config = readStorageConfig();
  assertConfigured(config);
  const client = createStorageClient(config);
  const key = buildUploadKey(input.fileName);
  const expiresIn = input.expiresIn ?? 900;
  const command = new PutObjectCommand({
    Bucket: config.bucket,
    Key: key,
    ContentType: input.contentType,
  });
  const url = await getSignedUrl(client, command, { expiresIn });

  return { url, key, bucket: config.bucket, expiresIn };
}

export async function deleteStoredObject(key: string) {
  const config = readStorageConfig();
  assertConfigured(config);
  const client = createStorageClient(config);

  await client.send(
    new DeleteObjectCommand({
      Bucket: config.bucket,
      Key: key,
    }),
  );

  return { bucket: config.bucket, key };
}
