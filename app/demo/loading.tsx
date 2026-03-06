export default function DemoLoading() {
  return (
    <div className="space-y-6 py-6">
      <div className="h-9 w-80 rounded bg-quantum-800/80 animate-pulse" />
      <div className="h-5 w-full max-w-2xl rounded bg-quantum-800/60 animate-pulse" />
      <div className="grid gap-4 md:grid-cols-4">
        <div className="h-24 rounded-lg bg-quantum-800/70 animate-pulse" />
        <div className="h-24 rounded-lg bg-quantum-800/70 animate-pulse" />
        <div className="h-24 rounded-lg bg-quantum-800/70 animate-pulse" />
        <div className="h-24 rounded-lg bg-quantum-800/70 animate-pulse" />
      </div>
      <div className="h-64 rounded-xl bg-quantum-800/60 animate-pulse" />
    </div>
  );
}
