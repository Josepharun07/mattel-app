export function StudioSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-2">
      <div className="animate-pulse space-y-4">
        <div className="h-10 w-3/4 rounded-md bg-muted/60" />
        <div className="h-32 rounded-lg bg-muted/40" />
        <div className="h-64 rounded-lg bg-muted/40" />
      </div>
      <div className="mx-auto h-[842px] w-[595px] max-w-full animate-pulse space-y-6 rounded-lg border bg-card p-12 shadow-sm">
        <div className="h-12 w-1/2 rounded bg-muted/60" />
        <div className="h-4 w-1/3 rounded bg-muted/40" />
        <div className="mt-8 h-48 rounded bg-muted/30" />
      </div>
    </div>
  );
}
