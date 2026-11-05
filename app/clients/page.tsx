import type { Metadata } from "next";
import { gate } from "@/lib/auth/gate";
import { listClients } from "@/models/clients";
import { ClientsDesk } from "@/views/clients/clients-desk";

export const metadata: Metadata = { title: "Clients" };

export default async function ClientsPage() {
  const denied = await gate("clients.read");
  if (denied) return denied;
  return <ClientsDesk clients={await listClients()} />;
}
