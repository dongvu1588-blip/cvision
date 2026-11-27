
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Profile = {
  id: string;
  full_name: string | null;
  role: string | null;
};

type FinanceSummary = {
  revenue: number;
  expenses: number;
  pendingCommissions: number;
  paidCommissions: number;
  profit: number;
};

const menu = [
  { icon: "▦", name: "Dashboard", href: "/admin/dashboard" },
  { icon: "♟", name: "Ứng viên", href: "/admin/candidates" },
  { icon: "▤", name: "Quản lý công việc", href: "/admin/jobs" },
  { icon: "✉", name: "Dịch vụ CV", href: "/admin/cv-requests" },
  { icon: "▣", name: "Quản lý CV", href: "/admin/cv-management" },
  { icon: "▧", name: "Báo cáo", href: "/admin/reports" },
  { icon: "◈", name: "Quản lý tài chính", href: "/admin/finance" },
  { icon: "♙", name: "Quản lý nhân viên", href: "/admin/users" },
  { icon: "⚙", name: "Cài đặt thương hiệu", href: "/admin/brand-settings" },
];

function formatNumber(value: number) {
  return value.toLocaleString("vi-VN");
}

function money(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export default function Dashboard() {
  const router = useRouter();
  const pathname = usePathname();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [jobCount, setJobCount] = useState(0);
  const [candidateCount, setCandidateCount] = useState(0);

  const [finance, setFinance] = useState<FinanceSummary>({
    revenue: 0,
    expenses: 0,
    pendingCommissions: 0,
    paidCommissions: 0,
    profit: 0,
  });

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isAdmin = profile?.role === "admin";

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      // 1. Kiểm tra đăng nhập
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        router.replace("/admin/login");
        return;
      }

      // 2. Lấy thông tin tài khoản
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name, role")
        .eq("id", user.id)
        .single();

      if (profileError || !profileData) {
        throw new Error(
          "Không tìm thấy thông tin tài khoản: " +
            (profileError?.message || "")
        );
      }

      const currentProfile = profileData as Profile;
      setProfile(currentProfile);

      // 3. Lấy tổng số Job và ứng viên
      const [jobsResult, candidatesResult] = await Promise.all([
        supabase
          .from("jobs")
          .select("id", { count: "exact", head: true }),

        supabase
          .from("candidates")
          .select("id", { count: "exact", head: true }),
      ]);

      if (jobsResult.error) {
        throw new Error(
          "Không tải được số lượng Job: " + jobsResult.error.message
        );
      }

      if (candidatesResult.error) {
        throw new Error(
          "Không tải được số lượng ứng viên: " +
            candidatesResult.error.message
        );
      }

      setJobCount(jobsResult.count || 0);
      setCandidateCount(candidatesResult.count || 0);

      // 4. Chỉ Admin mới tải dữ liệu tài chính
      if (currentProfile.role === "admin") {
        const now = new Date();
        const year = now.getFullYear();
        const monthNumber = now.getMonth();

        const monthStart = new Date(
          year,
          monthNumber,
          1
        ).toISOString();

        const nextMonthStart = new Date(
          year,
          monthNumber + 1,
          1
        ).toISOString();

        const [revenueResult, expenseResult, commissionResult] =
          await Promise.all([
            supabase
              .from("finance_revenues")
              .select("amount")
              .eq("status", "confirmed")
              .gte("payment_date", monthStart.slice(0, 10))
              .lt("payment_date", nextMonthStart.slice(0, 10)),

            supabase
              .from("finance_expenses")
              .select("amount")
              .gte("expense_date", monthStart.slice(0, 10))
              .lt("expense_date", nextMonthStart.slice(0, 10)),

            supabase
              .from("cv_commissions")
              .select("amount, status, approved_at")
              .gte("approved_at", monthStart)
              .lt("approved_at", nextMonthStart),
          ]);

        if (revenueResult.error) {
          throw new Error(
            "Không tải được doanh thu: " +
              revenueResult.error.message
          );
        }

        if (expenseResult.error) {
          throw new Error(
            "Không tải được chi phí: " +
              expenseResult.error.message
          );
        }

        if (commissionResult.error) {
          throw new Error(
            "Không tải được tiền thưởng: " +
              commissionResult.error.message
          );
        }

        const revenue = (revenueResult.data || []).reduce(
          (sum, item) => sum + Number(item.amount || 0),
          0
        );

        const expenses = (expenseResult.data || []).reduce(
          (sum, item) => sum + Number(item.amount || 0),
          0
        );

        const pendingCommissions = (commissionResult.data || [])
          .filter((item) => item.status === "pending")
          .reduce(
            (sum, item) => sum + Number(item.amount || 0),
            0
          );

        const paidCommissions = (commissionResult.data || [])
          .filter((item) => item.status === "paid")
          .reduce(
            (sum, item) => sum + Number(item.amount || 0),
            0
          );

        const totalCosts =
          expenses + pendingCommissions + paidCommissions;

        setFinance({
          revenue,
          expenses,
          pendingCommissions,
          paidCommissions,
          profit: revenue - totalCosts,
        });
      } else {
        setFinance({
          revenue: 0,
          expenses: 0,
          pendingCommissions: 0,
          paidCommissions: 0,
          profit: 0,
        });
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Đã xảy ra lỗi khi tải Dashboard."
      );
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // Đăng xuất
  async function handleLogout() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      alert("Đăng xuất thất bại: " + error.message);
      return;
    }

    router.replace("/admin/login");
  }

  return (
    <div className="min-h-screen bg-[#f4f7fb] text-slate-800">

      {/* MOBILE HEADER */}
      <div className="fixed inset-x-0 top-0 z-40 flex h-[68px] items-center justify-between border-b border-slate-200 bg-white px-4 shadow-sm lg:hidden">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-xl font-black text-white">
            C
          </span>

          <span className="text-xl font-black text-slate-900">
            CVISION
          </span>
        </Link>

        <button
          type="button"
          onClick={() => setMobileMenuOpen((value) => !value)}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-xl"
          aria-label="Mở menu"
        >
          {mobileMenuOpen ? "×" : "☰"}
        </button>
      </div>

      {/* MOBILE MENU */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 lg:hidden">
          <button
            type="button"
            aria-label="Đóng menu"
            className="absolute inset-0 h-full w-full"
            onClick={() => setMobileMenuOpen(false)}
          />

          <div className="absolute right-0 top-0 flex h-full w-[min(86vw,330px)] flex-col bg-white p-5 text-slate-800 shadow-2xl">
            <div className="mb-8 flex items-center justify-between">
              <div>
                <p className="text-2xl font-black text-slate-900">
                  CVISION
                </p>

                <p className="mt-1 text-[10px] font-bold tracking-[0.2em] text-blue-600">
                  BUSINESS WORKSPACE
                </p>
              </div>

              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="text-2xl text-slate-500"
              >
                ×
              </button>
            </div>

            <nav className="space-y-2">
              {menu.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                    pathname === item.href
                      ? "bg-blue-600 text-white"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-lg text-lg ${
                      pathname === item.href
                        ? "bg-blue-500 text-white"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {item.icon}
                  </span>

                  {item.name}
                </Link>
              ))}
            </nav>

            <div className="mt-auto border-t border-slate-200 pt-5">
              <p className="mb-3 text-sm font-semibold">
                {profile?.full_name || "Tài khoản"}
              </p>

              <button
                type="button"
                onClick={handleLogout}
                className="w-full rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600"
              >
                Đăng xuất
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex min-h-screen">

        {/* DESKTOP SIDEBAR */}
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-[250px] flex-col border-r border-slate-200 bg-white px-5 py-7 text-slate-800 lg:flex">

          <Link href="/" className="mb-12 flex items-center gap-3 px-2">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-xl font-black text-white">
              C
            </div>

            <div>
              <p className="text-2xl font-black tracking-tight">
                CVISION
              </p>

              <p className="mt-0.5 text-[9px] font-bold tracking-[0.22em] text-blue-600">
                BUSINESS WORKSPACE
              </p>
            </div>
          </Link>

          <p className="mb-4 px-3 text-[10px] font-extrabold uppercase tracking-[0.2em] text-slate-400">
            Workspace
          </p>

          <nav className="space-y-2">
            {menu.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm font-semibold transition ${
                  pathname === item.href
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-100"
                    : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-lg text-lg ${
                    pathname === item.href
                      ? "bg-blue-500 text-white"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {item.icon}
                </span>

                {item.name}
              </Link>
            ))}
          </nav>

          <div className="mt-auto rounded-2xl border border-blue-100 bg-blue-50 p-4">
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-lg text-white">
              ✦
            </div>

            <p className="font-bold text-slate-900">
              CVISION Workspace
            </p>

            <p className="mt-2 text-xs leading-5 text-slate-500">
              Nền tảng quản lý ứng viên và kết nối doanh nghiệp.
            </p>
          </div>

          <div className="mt-5 flex items-center gap-3 border-t border-slate-200 pt-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 font-bold text-white">
              {(profile?.full_name || "C")
                .charAt(0)
                .toUpperCase()}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">
                {profile?.full_name || "Tài khoản"}
              </p>

              <p className="text-xs text-slate-500">
                {isAdmin ? "Quản trị viên" : "Nhân viên"}
              </p>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              title="Đăng xuất"
              className="rounded-lg p-2 text-slate-500 transition hover:bg-red-50 hover:text-red-600"
            >
              ↪
            </button>
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <main className="min-w-0 flex-1 px-4 pb-8 pt-[88px] sm:px-6 lg:ml-[250px] lg:px-8 lg:pt-8">

          {/* HEADER */}
          <header className="mb-8 flex flex-wrap items-center justify-between gap-5">
            <div>
              <div className="mb-2 flex items-center gap-2 text-xs font-medium text-slate-400">
                <span>Workspace</span>
                <span>/</span>
                <span className="text-blue-600">Dashboard</span>
              </div>

              <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                Tổng quan kinh doanh
              </h1>

              <p className="mt-2 text-sm text-slate-500">
                Tổng quan công việc, ứng viên và tình hình tài chính CVISION.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={loadDashboard}
                disabled={loading}
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
              >
                ↻ Làm mới
              </button>

              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-lg font-black text-white">
                {(profile?.full_name || "C")
                  .charAt(0)
                  .toUpperCase()}
              </div>
            </div>
          </header>

          {/* ERROR */}
          {errorMessage && (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {errorMessage}
            </div>
          )}

          {/* TWO TOP STATISTICS */}
          <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">

            {/* TOTAL JOBS */}
            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-500">
                  Tổng số Job
                </p>

                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-xl text-emerald-600">
                  ▤
                </span>
              </div>

              <h2 className="mt-5 text-3xl font-black tracking-tight text-slate-900">
                {loading ? "..." : formatNumber(jobCount)}
              </h2>

              <p className="mt-2 text-xs text-slate-400">
                Tổng số công việc tuyển dụng trong hệ thống
              </p>
            </div>

            {/* TOTAL CANDIDATES */}
            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-500">
                  Số lượng ứng viên
                </p>

                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-xl text-blue-600">
                  ♟
                </span>
              </div>

              <h2 className="mt-5 text-3xl font-black tracking-tight text-slate-900">
                {loading ? "..." : formatNumber(candidateCount)}
              </h2>

              <p className="mt-2 text-xs text-slate-400">
                Tổng số ứng viên trong hệ thống
              </p>
            </div>
          </section>

          {/* FINANCE OVERVIEW - ADMIN ONLY */}
          {isAdmin && (
            <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">

              <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-teal-600">
                    Finance Overview
                  </p>

                  <h2 className="mt-2 text-xl font-black text-slate-900">
                    Tổng quan tài chính
                  </h2>

                  <p className="mt-1 text-sm text-slate-400">
                    Số liệu tài chính trong tháng hiện tại.
                  </p>
                </div>

                <Link
                  href="/admin/finance"
                  className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-teal-50 hover:text-teal-700"
                >
                  Chi tiết tài chính →
                </Link>
              </div>

              {/* FINANCE CARDS */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

                <div className="rounded-xl bg-emerald-50 p-5">
                  <p className="text-sm font-semibold text-slate-500">
                    Doanh thu đã xác nhận
                  </p>

                  <p className="mt-3 text-xl font-black text-emerald-700 sm:text-2xl">
                    {loading ? "..." : money(finance.revenue)}
                  </p>
                </div>

                <div className="rounded-xl bg-amber-50 p-5">
                  <p className="text-sm font-semibold text-slate-500">
                    Tổng chi phí
                  </p>

                  <p className="mt-3 text-xl font-black text-amber-700 sm:text-2xl">
                    {loading ? "..." : money(finance.expenses)}
                  </p>
                </div>

                <div className="rounded-xl bg-blue-50 p-5">
                  <p className="text-sm font-semibold text-slate-500">
                    Chi phí thưởng nhân viên
                  </p>

                  <p className="mt-3 text-xl font-black text-blue-700 sm:text-2xl">
                    {loading
                      ? "..."
                      : money(
                          finance.pendingCommissions +
                            finance.paidCommissions
                        )}
                  </p>
                </div>

                <div
                  className={`rounded-xl p-5 ${
                    finance.profit >= 0
                      ? "bg-teal-50"
                      : "bg-red-50"
                  }`}
                >
                  <p className="text-sm font-semibold text-slate-500">
                    Lợi nhuận dự kiến
                  </p>

                  <p
                    className={`mt-3 text-xl font-black sm:text-2xl ${
                      finance.profit >= 0
                        ? "text-teal-700"
                        : "text-red-700"
                    }`}
                  >
                    {loading ? "..." : money(finance.profit)}
                  </p>
                </div>
              </div>

              <p className="mt-4 text-xs leading-5 text-slate-400">
                Chi phí thưởng bao gồm thưởng đang chờ thanh toán (
                {loading
                  ? "..."
                  : money(finance.pendingCommissions)}
                ) và đã thanh toán (
                {loading
                  ? "..."
                  : money(finance.paidCommissions)}
                ). Số liệu tài chính chỉ hiển thị với Admin.
              </p>
            </section>
          )}

          <footer className="mt-8 text-center text-xs text-slate-400">
            CVISION Business Management System © 2026
          </footer>
        </main>
      </div>
    </div>
  );
}
