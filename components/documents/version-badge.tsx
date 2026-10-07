import { Badge } from "@/components/ui/badge";

export function VersionBadge({ version }: { version: number }) {
  if (version <= 0) {
    return null;
  }
  return <Badge tone="warning">v{version}</Badge>;
}
