import { gate } from "@/lib/auth/gate";
import type { Metadata } from "next";
import { NewClientForm } from "@/views/clients/new-client-form";

export const metadata: Metadata = { title: "New client" };

export default async function NewClientPage() {
  const denied = await gate("clients.write");
  if (denied) return denied;
  return <NewClientForm />;
}
