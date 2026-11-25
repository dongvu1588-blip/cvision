
"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();

  const hideBackButton =
    pathname === "/admin/login" ||
    pathname === "/admin/dashboard";

  return (
    <div className="min-h-screen">
      {!hideBackButton && (
        <div className="border-b border-slate-200 bg-white px-5 py-3 md:px-8">
          <div className="mx-auto max-w-7xl">
            <Link
              href="/admin/dashboard"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
            >
              <span>←</span>
              Quay lại Dashboard
            </Link>
          </div>
        </div>
      )}

      {children}
    </div>
  );
}
