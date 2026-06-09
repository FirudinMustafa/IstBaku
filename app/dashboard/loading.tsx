export default function Loading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div role="status" aria-label="Loading" className="flex flex-col items-center gap-3">
        <div className="size-8 border-2 border-[color:var(--accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  );
}
