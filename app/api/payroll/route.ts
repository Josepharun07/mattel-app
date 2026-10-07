import { NextResponse } from "next/server";
import { z } from "zod";
import { calculateOvertimePay } from "@/lib/payroll/calculations";

const payrollSchema = z.object({
  overtimeHours: z.number().nonnegative(),
  hourlyRate: z.number().nonnegative(),
});

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const parsed = payrollSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Provide non-negative overtimeHours and hourlyRate." },
      { status: 400 },
    );
  }

  const overtimePay = calculateOvertimePay(
    parsed.data.overtimeHours,
    parsed.data.hourlyRate,
  );

  return NextResponse.json({ overtimePay });
}
