"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardCheck, Cog, LayoutDashboard, PackageSearch, Store, Tags } from "lucide-react";
import type { ReactNode } from "react";

const navItems = [
  { href: "/dashboard", label: "总览", icon: LayoutDashboard },
  { href: "/candidates", label: "候选审核", icon: ClipboardCheck },
  { href: "/merchants", label: "商家档案", icon: Store },
  { href: "/specs", label: "商品规格", icon: Tags },
  { href: "/jobs", label: "采集任务", icon: PackageSearch },
  { href: "/settings", label: "系统设置", icon: Cog },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex h-screen bg-gray-100">
      <aside className="flex w-56 flex-col border-r border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-5 py-4">
          <h1 className="text-base font-bold text-gray-900">AI 商品比价</h1>
          <p className="text-xs text-gray-500 mt-0.5">公开链接调查后台</p>
        </div>
        <nav className="flex-1 overflow-y-auto py-2">
          {navItems.map((item) => {
            const active = pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className={`flex items-center gap-2.5 mx-2 my-0.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${active ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"}`}>
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  );
}
