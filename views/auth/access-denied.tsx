import { PageFrame } from "@/views/shell/page-frame";

export function AccessDenied() {
  return (
    <PageFrame eyebrow="Access" title="This page is closed">
      <p className="text-sm text-muted-foreground">Your role does not include this part of the office. Ask an owner if you need it.</p>
    </PageFrame>
  );
}
