import Link from "next/link";
import React from "react";

type NavItem = {
  href: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
};

interface SidebarProps {
  items: NavItem[];
  activePath: string;
}

export default function Sidebar({ items, activePath }: SidebarProps) {
  return (
    <aside className="hidden w-64 flex-col gap-6 border-r border-quantum-800 bg-quantum-950/80 px-4 py-6 lg:flex">
      <div className="text-xs font-semibold uppercase tracking-widest text-quantum-500">Navigation</div>
      <nav className="space-y-2">
        {items.map((item) => {
          const baseHref = item.href.split("#")[0];
          const isActive = activePath === baseHref || activePath.startsWith(`${baseHref}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-sm transition ${
                isActive
                  ? "border-cyan-500/60 bg-cyan-500/10 text-cyan-200"
                  : "border-transparent text-quantum-300 hover:border-quantum-700 hover:bg-quantum-900/50"
              }`}
              aria-current={isActive ? "page" : undefined}
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-quantum-900 text-cyan-300">
                {item.icon}
              </span>
              <span className="flex flex-col gap-1">
                <span className="font-semibold">{item.label}</span>
                {item.description && <span className="text-xs text-quantum-500">{item.description}</span>}
              </span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
