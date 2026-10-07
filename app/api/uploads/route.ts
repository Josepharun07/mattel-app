import { NextResponse } from "next/server";
import { z } from "zod";
import { createPresignedUploadUrl } from "@/lib/storage/s3";

const uploadSchema = z.object({
  fileName: z.string().trim().min(1),
  contentType: z.string().trim().min(1),
});

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const parsed = uploadSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Provide fileName and contentType." },
      { status: 400 },
    );
  }

  try {
    const upload = await createPresignedUploadUrl(parsed.data);
    return NextResponse.json(upload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not prepare the upload.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
