export default function ProductPage() {
  return (
    <section className="max-w-5xl mx-auto py-12 space-y-8">
      <h1 className="text-3xl font-bold">User Dashboard Foundation</h1>
      <div className="grid md:grid-cols-3 gap-4">
        <div className="border border-quantum-700 rounded-lg p-4">
          <h2 className="font-semibold">Signup / Login</h2>
          <p className="text-sm text-quantum-400">Email authentication with profile bootstrap and role-aware redirects.</p>
        </div>
        <div className="border border-quantum-700 rounded-lg p-4">
          <h2 className="font-semibold">Alert Configuration</h2>
          <p className="text-sm text-quantum-400">Create alert rules by category, region, budget, and channel.</p>
        </div>
        <div className="border border-quantum-700 rounded-lg p-4">
          <h2 className="font-semibold">Analytics & Trends</h2>
          <p className="text-sm text-quantum-400">Track sent/opened alerts and category-level interest trends.</p>
        </div>
      </div>
    </section>
  );
}
