// Streaming fallback shown while the channels page server data resolves.
// Cuts perceived latency by rendering the skeleton immediately on navigation.
export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-8 w-72 rounded-md bg-card" />
        <div className="h-4 w-96 max-w-full rounded-md bg-card/70" />
      </div>
      <div className="h-32 rounded-lg bg-card" />
      <div className="h-48 rounded-lg bg-card/60" />
    </div>
  );
}
