export function readPresignSeconds() {
  const parsed = Number(process.env.S3_PRESIGN_SECONDS);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 900;
}
