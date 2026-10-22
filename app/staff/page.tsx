import type { Metadata } from "next";
import { StaffDesk } from "@/components/staff/staff-desk";

export const metadata: Metadata = { title: "Staff" };

export default function StaffPage() {
  return <StaffDesk />;
}
