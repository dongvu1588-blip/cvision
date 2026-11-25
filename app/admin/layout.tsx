
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

  const isLoginPage = pathname === "/admin/login";
  const hideBackButton = pathname === "/admin/dashboard";

  return (
    <div className="min-h-screen">
      {!isLoginPage && (
        <div className="border-b border-slate-200 bg-white px-4 py-3 md:px-8">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
            <div>
              {!hideBackButton && (
                <Link
                  href="/admin/dashboard"
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                >
                  <span>←</span>
                  Quay lại Dashboard
                </Link>
              )}
            </div>

            <Link
              href="/admin/account"
              className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
            >
              <span>👤</span>
              Tài khoản của tôi
            </Link>
          </div>
        </div>
      )}

      {children}
    </div>
  );
}
