import { gate } from "@/lib/auth/gate";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { pendingProfileRequest } from "@/controllers/account-controls";
import { getEmployeeForProfile } from "@/controllers/staff";
import { StaffEditor } from "@/views/staff/staff-editor";
import { getCurrentSession } from "@/lib/auth/current";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const profile = await getEmployeeForProfile(id);
  return { title: profile?.person?.fullName ?? "Employee" };
}

export default async function StaffProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getCurrentSession();
  if (session?.staffId !== id) {
    const denied = await gate("staff.read");
    if (denied) return denied;
  }
  const profile = await getEmployeeForProfile(id);
  const person = profile?.person ?? null;
  if (!profile || !person) {
    notFound();
  }
  const admin = session?.role === "OWNER" || session?.role === "SUPER_ADMIN";
  const self = session?.staffId === id;
  const pending = await pendingProfileRequest(id);
  return (
    <StaffEditor
      directory={profile.directory}
      role={session?.role ?? "OPERATOR"}
      person={person}
      canEdit={admin || self}
      requestMode={self && !admin}
      admin={admin}
      pending={pending}
    />
  );
}
