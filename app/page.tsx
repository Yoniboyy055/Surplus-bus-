import Link from "next/link";
import { CheckCircle, ShieldCheck, Zap } from "lucide-react";
import { Button } from "@/components/Button";

export default function HomePage() {
  return (
    <section className="flex flex-col items-center justify-center py-20 text-center space-y-10">
      <div className="space-y-4 max-w-3xl">
        <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl text-quantum-50">
          Private surplus property access — <span className="text-cyan-500">governed, verified, operator-led.</span>
        </h1>
        <p className="text-xl text-quantum-400">
          The premier platform for sourcing, matching, and acquiring government and public surplus property with institutional-grade intelligence.
        </p>
      </div>

      <div className="flex flex-col items-center gap-6">
        <Link href="/auth">
          <Button size="lg" className="shadow-lg shadow-cyan-500/20">
            Continue with Email
          </Button>
        </Link>
        <div className="flex items-center gap-3 text-xs font-medium uppercase tracking-widest text-quantum-500 bg-quantum-900/50 px-4 py-2 rounded-full border border-quantum-700">
          <span className="flex items-center gap-1"><ShieldCheck size={14} /> Operator-verified</span>
          <span className="w-1 h-1 bg-quantum-700 rounded-full"></span>
          <span className="flex items-center gap-1"><CheckCircle size={14} /> Audit-logged</span>
          <span className="w-1 h-1 bg-quantum-700 rounded-full"></span>
          <span>No spam</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full mt-20 max-w-5xl">
        {/* Step 1 */}
        <div className="p-8 rounded-2xl border border-quantum-700 bg-quantum-900/50 text-left space-y-4 relative overflow-hidden group hover:border-cyan-500/30 transition">
          <div className="absolute top-0 right-0 p-4 opacity-10 font-black text-6xl text-cyan-500">1</div>
          <div className="w-12 h-12 bg-cyan-500/10 rounded-lg flex items-center justify-center text-cyan-500 mb-4">
             <Zap size={24} />
          </div>
          <h3 className="text-xl font-bold text-quantum-50">Submit Criteria</h3>
          <p className="text-quantum-400 text-sm leading-relaxed">
            Define your acquisition targets. Our system filters noise and only surfaces properties that match your specific mandate.
          </p>
        </div>

        {/* Step 2 */}
        <div className="p-8 rounded-2xl border border-quantum-700 bg-quantum-900/50 text-left space-y-4 relative overflow-hidden group hover:border-purple-500/30 transition">
          <div className="absolute top-0 right-0 p-4 opacity-10 font-black text-6xl text-purple-500">2</div>
           <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center text-purple-500 mb-4">
             <ShieldCheck size={24} />
          </div>
          <h3 className="text-xl font-bold text-quantum-50">Operator Qualifies</h3>
          <p className="text-quantum-400 text-sm leading-relaxed">
            Every deal is manually verified by an operator. We conduct due diligence before any match is made.
          </p>
        </div>

        {/* Step 3 */}
        <div className="p-8 rounded-2xl border border-quantum-700 bg-quantum-900/50 text-left space-y-4 relative overflow-hidden group hover:border-accent-success/30 transition">
          <div className="absolute top-0 right-0 p-4 opacity-10 font-black text-6xl text-accent-success">3</div>
           <div className="w-12 h-12 bg-accent-success/10 rounded-lg flex items-center justify-center text-accent-success mb-4">
             <CheckCircle size={24} />
          </div>
          <h3 className="text-xl font-bold text-quantum-50">Success Fee on Close</h3>
          <p className="text-quantum-400 text-sm leading-relaxed">
            Transparent pricing. You only pay a 5% success fee when you successfully acquire the property.
          </p>
        </div>
      </div>
    </section>
  );
}
