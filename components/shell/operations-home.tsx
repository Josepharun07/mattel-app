"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { FileText, HardHat, Package, Wallet } from "lucide-react";
import { useWorkspace } from "@/lib/workspace/store";
import { formatInr } from "@/lib/money";
import { boqProgress, type SiteBook } from "@/lib/site/book";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export function OperationsHome({ book, name }: { book: SiteBook; name: string }) {
  const workspace = useWorkspace();
  const today = new Date().toISOString().slice(0, 10);
  const personName = name;
  const lowStock = workspace.inventory.filter((item) => !item.deletedAt && item.currentStock <= item.minSafetyThreshold).length;
  const overdueTools = workspace.assignments.filter((item) => !item.actualReturnDate && item.expectedReturnDate < today).length;
  const pending = book.payments.filter((payment) => payment.status === "PENDING");
  const payable = pending.reduce((sum, payment) => sum + payment.amount, 0);
  const contractValue = book.boq.reduce((sum, line) => sum + line.contractQty * line.rate, 0);
  const executedValue = book.boq.reduce((sum, line) => sum + line.executedQty * line.rate, 0);
  const progress = contractValue > 0 ? Math.round((executedValue / contractValue) * 100) : 0;
  const budgetTotal = book.budget.reduce((sum, line) => sum + line.budgetAmount, 0);
  const actualTotal = book.budget.reduce((sum, line) => sum + line.actualAmount, 0);
  const budgetLeft = budgetTotal - actualTotal;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Welcome back, {personName}</h1>
          <p className="text-sm text-muted-foreground">Work, money, and people that need a look today.</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/approvals">
              Approvals
              {pending.length > 0 ? <Badge tone="warning">{pending.length}</Badge> : null}
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/invoices/create">New invoice</Link>
          </Button>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric href="/approvals" label="Waiting to pay" value={formatInr(payable)} detail={`${pending.length} open`} />
        <Metric href="/boq" label="Work executed" value={`${progress}%`} detail={formatInr(executedValue)} />
        <Metric href="/budget" label="Budget left" value={formatInr(budgetLeft)} detail={`${book.budget.length} lines`} />
        <Metric href="/inventory" label="Needs attention" value={String(lowStock + overdueTools)} detail={`${lowStock} stock · ${overdueTools} tools`} />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-foreground">Quick actions</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Tile href="/invoices/create" icon={FileText} title="Invoice" detail="Compile a bill" />
          <Tile href="/inventory" icon={Package} title="Stock" detail="Materials on hand" />
          <Tile href="/payroll" icon={Wallet} title="Attendance" detail="Day and overtime" />
          <Tile href="/staff" icon={HardHat} title="Staff" detail="People and pay" />
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <ListCard title="Bill of quantities" description="Contract" stat={formatInr(contractValue)} href="/boq" empty="No bill of quantities yet.">
          {book.boq.slice(0, 4).map((line) => (
            <Row key={line.id} label={line.description} meta={`${line.executedQty}/${line.contractQty} ${line.unit}`} percent={boqProgress(line)} />
          ))}
        </ListCard>
        <ListCard title="Budget" description="Left" stat={formatInr(budgetLeft)} href="/budget" empty="No budget lines yet.">
          {book.budget.slice(0, 4).map((line) => {
            const used = line.budgetAmount > 0 ? Math.min(100, Math.round((line.actualAmount / line.budgetAmount) * 100)) : 0;
            return <Row key={line.id} label={line.name} meta={formatInr(line.actualAmount)} percent={used} />;
          })}
        </ListCard>
        <ListCard title="Equipment" description="Logs" stat={String(book.equipment.length)} href="/equipment" empty="No equipment logs yet.">
          {book.equipment.slice(0, 4).map((log) => (
            <div key={log.id} className="flex items-center justify-between gap-2 py-2 text-sm">
              <span className="min-w-0 truncate">{log.machineName}</span>
              <span className="shrink-0 text-muted-foreground">{log.runHours} h</span>
            </div>
          ))}
        </ListCard>
        <ListCard title="Approvals" description="Waiting" stat={String(pending.length)} href="/approvals" empty="Nothing waiting.">
          {pending.slice(0, 4).map((payment) => (
            <div key={payment.id} className="flex items-center justify-between gap-2 py-2 text-sm">
              <span className="truncate">{payment.payee}</span>
              <span className="text-muted-foreground">{formatInr(payment.amount)}</span>
            </div>
          ))}
        </ListCard>
      </section>
    </div>
  );
}

function Metric({ href, label, value, detail }: { href: string; label: string; value: string; detail: string }) {
  return (
    <Link href={href} className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <Card className="h-full transition-colors hover:bg-accent/40">
        <CardHeader>
          <CardDescription>{label}</CardDescription>
          <CardTitle className="text-2xl font-semibold tracking-tight">{value}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">{detail}</p>
        </CardContent>
      </Card>
    </Link>
  );
}

function Tile({ href, icon: Icon, title, detail }: { href: string; icon: typeof FileText; title: string; detail: string }) {
  return (
    <Link href={href} className="rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <Card className="h-full gap-2 py-3 transition-colors hover:bg-accent/40">
        <CardHeader className="gap-2">
          <Icon className="size-4 text-muted-foreground" />
          <CardTitle>{title}</CardTitle>
          <CardDescription>{detail}</CardDescription>
        </CardHeader>
      </Card>
    </Link>
  );
}

function ListCard({
  title,
  description,
  stat,
  href,
  empty,
  children,
}: {
  title: string;
  description: string;
  stat: string;
  href: string;
  empty: string;
  children: ReactNode;
}) {
  const items = Array.isArray(children) ? children.filter(Boolean) : children ? [children] : [];
  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div className="space-y-1">
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <p className="text-lg font-semibold tracking-tight">{stat}</p>
      </CardHeader>
      <CardContent className="divide-y">{items.length > 0 ? children : <p className="py-2 text-sm text-muted-foreground">{empty}</p>}</CardContent>
      <CardFooter>
        <Button asChild variant="link" size="sm" className="h-auto px-0 text-[var(--app-accent)]">
          <Link href={href}>View all</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

function Row({ label, meta, percent }: { label: string; meta: string; percent: number }) {
  return (
    <div className="py-2">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="min-w-0 truncate">{label}</span>
        <span className="shrink-0 text-muted-foreground">{meta}</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-primary/15">
        <div className="h-full rounded-full bg-[var(--app-accent)]" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
