import type { Metadata } from "next";
import { asc, isNull } from "drizzle-orm";
import { ClientsDesk } from "@/components/clients/clients-desk";
import { db } from "@/db";
import { clients } from "@/db/schema";

export const metadata: Metadata = { title: "Clients" };

export default async function ClientsPage() {
  if (!process.env.DATABASE_URL) {
    return <ClientsDesk clients={[]} />;
  }

  const rows = await db
    .select({
      id: clients.id,
      name: clients.name,
      companyName: clients.companyName,
      phone: clients.phone,
      email: clients.email,
      address: clients.address,
      gstin: clients.gstin,
    })
    .from(clients)
    .where(isNull(clients.deletedAt))
    .orderBy(asc(clients.name));

  return (
    <ClientsDesk
      clients={rows.map((client) => ({
        id: client.id,
        name: client.name,
        companyName: client.companyName ?? "",
        phone: client.phone,
        email: client.email ?? "",
        address: client.address ?? "",
        gstin: client.gstin ?? "",
      }))}
    />
  );
}
