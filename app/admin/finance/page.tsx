
"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import SiteLogo from "@/components/SiteLogo";

type Commission = {
  id: string;
  candidate_id: string;
  employee_id: string;
  amount: number;
  status: "pending" | "paid";
  approved_at: string;
  paid_at: string | null;
};

type Revenue = {
  id: string;
  revenue_type: "B2C" | "B2B";
  description: string;
  amount: number;
  customer_name: string | null;
  payment_date: string;
  status: "pending" | "confirmed" | "cancelled";
  created_at: string;
};

type Expense = {
  id: string;
  category: string;
  description: string;
  amount: number;
  expense_date: string;
  paid_to: string | null;
  created_at: string;
};

type Profile = { id: string; full_name: string | null; role: string | null };

const menu = [
  { icon: "▦", name: "Dashboard", href: "/admin/dashboard" },
  { icon: "♙", name: "Ứng viên", href: "/admin/candidates" },
  { icon: "▤", name: "Quản lý công việc", href: "/admin/jobs" },
  { icon: "✉", name: "Dịch vụ CV", href: "/admin/cv-requests" },
  { icon: "▣", name: "Quản lý CV", href: "/admin/cv-management" },
  { icon: "▧", name: "Báo cáo", href: "/admin/reports" },
  { icon: "◈", name: "Quản lý tài chính", href: "/admin/finance" },
];

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-50";

const money = (value: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value || 0);

const dateText = (value: string | null) =>
  value ? new Date(value).toLocaleDateString("vi-VN") : "—";

export default function FinancePage() {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState("");
  const [userName, setUserName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"overview" | "income" | "revenue" | "expenses">("overview");
  const [month, setMonth] = useState("");
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [revenues, setRevenues] = useState<Revenue[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [showRevenueForm, setShowRevenueForm] = useState(false);
  const [editingRevenueId, setEditingRevenueId] = useState<string | null>(null);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [revenueType, setRevenueType] = useState<"B2C" | "B2B">("B2C");
  const [revenueDescription, setRevenueDescription] = useState("");
  const [revenueCustomer, setRevenueCustomer] = useState("");
  const [revenueAmount, setRevenueAmount] = useState("");
  const [revenueDate, setRevenueDate] = useState("");
  const [expenseCategory, setExpenseCategory] = useState("Marketing");
  const [expenseDescription, setExpenseDescription] = useState("");
  const [expensePaidTo, setExpensePaidTo] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState("");

  const isAdmin = role === "admin";

  async function loadData() {
    setLoading(true);
    setError("");

    const { data: authData, error: authError } = await supabase.auth.getUser();
    const user = authData.user;

    if (authError || !user) {
      router.replace("/admin/login");
      return;
    }

    setUserId(user.id);

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, full_name, role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      setError(profileError?.message || "Không tìm thấy hồ sơ tài khoản.");
      setLoading(false);
      return;
    }

    setRole(profile.role || "recruiter");
    setUserName(profile.full_name || user.email || "Nhân viên");

    const commissionQuery = supabase
      .from("cv_commissions")
      .select("id, candidate_id, employee_id, amount, status, approved_at, paid_at")
      .order("approved_at", { ascending: false });

    const [commissionResult, revenueResult, expenseResult, profileResult] =
      await Promise.all([
        commissionQuery,
        profile.role === "admin"
          ? supabase.from("finance_revenues").select("*").order("payment_date", { ascending: false })
          : Promise.resolve({ data: [], error: null }),
        profile.role === "admin"
          ? supabase.from("finance_expenses").select("*").order("expense_date", { ascending: false })
          : Promise.resolve({ data: [], error: null }),
        profile.role === "admin"
          ? supabase.from("profiles").select("id, full_name, role").in("role", ["admin", "recruiter"])
          : Promise.resolve({ data: [], error: null }),
      ]);

    if (commissionResult.error) setError(commissionResult.error.message);
    else setCommissions((commissionResult.data || []) as Commission[]);

    if (revenueResult.error) setError(revenueResult.error.message);
    else setRevenues((revenueResult.data || []) as Revenue[]);

    if (expenseResult.error) setError(expenseResult.error.message);
    else setExpenses((expenseResult.data || []) as Expense[]);

    if (profileResult.error) setError(profileResult.error.message);
    else setProfiles((profileResult.data || []) as Profile[]);

    setLoading(false);
  }

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    setMonth(today.slice(0, 7));
    setRevenueDate(today);
    setExpenseDate(today);
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedCommissions = useMemo(
    () => commissions.filter((item) => item.approved_at.slice(0, 7) === month),
    [commissions, month]
  );

  const selectedRevenues = useMemo(
    () => revenues.filter((item) => item.payment_date?.slice(0, 7) === month && item.status === "confirmed"),
    [revenues, month]
  );

  const selectedExpenses = useMemo(
    () => expenses.filter((item) => item.expense_date?.slice(0, 7) === month),
    [expenses, month]
  );

  const myCommissions = commissions.filter((item) => item.employee_id === userId);
  const myPending = myCommissions.filter((item) => item.status === "pending");
  const myPaid = myCommissions.filter((item) => item.status === "paid");

  const totalRevenue = selectedRevenues.reduce((sum, item) => sum + Number(item.amount), 0);
  const totalExpenses = selectedExpenses.reduce((sum, item) => sum + Number(item.amount), 0);

  const pendingCommissionCost = selectedCommissions
    .filter((item) => item.status === "pending")
    .reduce((sum, item) => sum + Number(item.amount), 0);

  const paidCommissionCost = selectedCommissions
    .filter((item) => item.status === "paid")
    .reduce((sum, item) => sum + Number(item.amount), 0);

  async function markPaid(item: Commission) {
    if (!isAdmin) return;

    if (!window.confirm(`Xác nhận đã thanh toán ${money(Number(item.amount))} cho nhân viên?`)) return;

    const { error: updateError } = await supabase
      .from("cv_commissions")
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("id", item.id);

    if (updateError) {
      alert("Không cập nhật được thanh toán: " + updateError.message);
      return;
    }

    await loadData();
  }

  async function addRevenue(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);

    const revenueData = {
      revenue_type: revenueType,
      description: revenueDescription.trim(),
      customer_name: revenueCustomer.trim() || null,
      amount: Number(revenueAmount),
      payment_date: revenueDate,
    };

    const result = editingRevenueId
      ? await supabase
          .from("finance_revenues")
          .update(revenueData)
          .eq("id", editingRevenueId)
      : await supabase.from("finance_revenues").insert({
          ...revenueData,
          status: "confirmed",
          created_by: userId,
          confirmed_by: userId,
          confirmed_at: new Date().toISOString(),
        });

    setSaving(false);

    if (result.error) {
      alert(
        (editingRevenueId ? "Không cập nhật được doanh thu: " : "Không thêm được doanh thu: ") +
          result.error.message
      );
      return;
    }

    setShowRevenueForm(false);
    setEditingRevenueId(null);
    setRevenueDescription("");
    setRevenueCustomer("");
    setRevenueAmount("");
    await loadData();
  }

  function openEditRevenue(item: Revenue) {
    if (!isAdmin) return;

    setEditingRevenueId(item.id);
    setRevenueType(item.revenue_type);
    setRevenueDescription(item.description);
    setRevenueCustomer(item.customer_name || "");
    setRevenueAmount(String(item.amount));
    setRevenueDate(item.payment_date);
    setShowRevenueForm(true);
  }

  function openAddRevenue() {
    setEditingRevenueId(null);
    setRevenueType("B2C");
    setRevenueDescription("");
    setRevenueCustomer("");
    setRevenueAmount("");
    setRevenueDate(new Date().toISOString().slice(0, 10));
    setShowRevenueForm(true);
  }

  async function addExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);

    const { error: insertError } = await supabase.from("finance_expenses").insert({
      category: expenseCategory,
      description: expenseDescription.trim(),
      paid_to: expensePaidTo.trim() || null,
      amount: Number(expenseAmount),
      expense_date: expenseDate,
      created_by: userId,
    });

    setSaving(false);

    if (insertError) {
      alert("Không thêm được chi phí: " + insertError.message);
      return;
    }

    setShowExpenseForm(false);
    setExpenseDescription("");
    setExpensePaidTo("");
    setExpenseAmount("");
    await loadData();
  }

  function exportCsv() {
    const rows = [
      [
        "Tháng",
        "Tổng doanh thu (VNĐ)",
        "Chi phí (VNĐ)",
        "Thưởng chờ thanh toán (VNĐ)",
        "Thưởng đã thanh toán (VNĐ)",
      ],
      [
        month,
        String(totalRevenue),
        String(totalExpenses),
        String(pendingCommissionCost),
        String(paidCommissionCost),
      ],
    ];

    const csv =
      "\uFEFF" +
      rows
        .map((row) =>
          row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(",")
        )
        .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `CVISION-bao-cao-tai-chinh-${month}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const annualRows = Array.from({ length: 12 }, (_, index) => {
    const monthKey = `${month.slice(0, 4)}-${String(index + 1).padStart(2, "0")}`;

    const amount = revenues
      .filter(
        (item) =>
          item.status === "confirmed" &&
          item.payment_date?.slice(0, 7) === monthKey
      )
      .reduce((sum, item) => sum + Number(item.amount), 0);

    return { month: `Tháng ${index + 1}`, amount };
  });

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/admin/login");
  }

  return (
    <div className="flex min-h-screen bg-[#f7f9fc] text-slate-800">
      <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white p-5 md:flex md:flex-col">
        <a href="/" className="mb-10 flex flex-col items-start gap-2">
          <SiteLogo size="large" />
          <p className="pl-1 text-[9px] font-bold tracking-[0.2em] text-sky-500">
            ADMIN WORKSPACE
          </p>
        </a>

        <p className="mb-4 px-3 text-[11px] font-extrabold uppercase tracking-[0.18em] text-sky-400">
          Workspace
        </p>

        <nav className="space-y-2">
          {menu.map((item) => (
            <a
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                item.href === "/admin/finance"
                  ? "bg-sky-50 text-sky-700"
                  : "text-slate-600 hover:bg-sky-50 hover:text-sky-700"
              }`}
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-50 text-lg text-slate-500">
                {item.icon}
              </span>
              {item.name}
            </a>
          ))}

          {isAdmin && (
            <a
              href="/admin/users"
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-sky-50 hover:text-sky-700"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-50">
                ♙
              </span>
              Quản lý nhân viên
            </a>
          )}

          {isAdmin && (
            <a
              href="/admin/brand-settings"
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-sky-50 hover:text-sky-700"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-50">
                ⚙
              </span>
              Cài đặt thương hiệu
            </a>
          )}
        </nav>

        <div className="mt-auto rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50 to-blue-100 p-4">
          <p className="font-extrabold text-sky-800">CVISION Workspace</p>
          <p className="mt-2 text-xs leading-5 text-sky-700">
            Quản lý nhân sự, doanh thu và chi phí doanh nghiệp.
          </p>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-100 p-3">
          <p className="truncate text-sm font-bold">
            {userName || "Đang tải tài khoản..."}
          </p>
          <p className="text-xs text-slate-500">{isAdmin ? "admin" : "recruiter"}</p>
          <button
            onClick={logout}
            className="mt-3 text-xs font-semibold text-slate-500 hover:text-sky-700"
          >
            ↪ Đăng xuất
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-4 py-4 backdrop-blur md:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-slate-400">
                Workspace / Quản lý tài chính
              </p>
              <h1 className="mt-1 text-2xl font-extrabold tracking-tight">
                Quản lý tài chính
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                {isAdmin
                  ? "Quản trị tài chính toàn doanh nghiệp."
                  : "Theo dõi thu nhập và thưởng cá nhân."}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className={inputClass + " w-auto"}
              />

              {isAdmin && (
                <button
                  onClick={exportCsv}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold hover:bg-slate-50"
                >
                  ↓ Xuất Excel (CSV)
                </button>
              )}

              <button
                onClick={loadData}
                className="rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-teal-700"
              >
                ↻ Làm mới
              </button>
            </div>
          </div>
        </header>

        <div className="space-y-6 p-4 md:p-8">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
            {(
              [
                ["overview", "Tổng quan"],
                ["income", "Thu nhập nhân viên"],
                ...(isAdmin
                  ? [
                      ["revenue", "Doanh thu"],
                      ["expenses", "Chi phí"],
                    ]
                  : []),
              ] as [string, string][]
            ).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTab(key as typeof tab)}
                className={`rounded-xl px-4 py-2.5 text-sm font-bold ${
                  tab === key
                    ? "bg-teal-600 text-white"
                    : "bg-white text-slate-600 hover:bg-slate-100"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="rounded-2xl bg-white p-12 text-center text-slate-500">
              Đang tải dữ liệu tài chính...
            </div>
          ) : (
            <>
              {tab === "overview" && (
                <>
                  {isAdmin ? (
                    <>
                      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        {[
                          [
                            "Doanh thu đã xác nhận",
                            money(totalRevenue),
                            "Tiền khách hàng đã thanh toán",
                          ],
                          [
                            "Tổng chi phí",
                            money(totalExpenses),
                            "Chi phí hoạt động đã ghi nhận",
                          ],
                          [
                            "Thưởng nhân viên",
                            money(pendingCommissionCost + paidCommissionCost),
                            "Gồm chờ và đã thanh toán",
                          ],
                        ].map(([label, value, note]) => (
                          <div
                            key={label}
                            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                          >
                            <p className="text-sm font-semibold text-slate-500">
                              {label}
                            </p>
                            <p className="mt-3 text-2xl font-black text-slate-800">
                              {value}
                            </p>
                            <p className="mt-2 text-xs text-slate-400">
                              {note}
                            </p>
                          </div>
                        ))}
                      </section>

                      <section className="rounded-2xl border border-slate-200 bg-white p-5">
                        <h2 className="mb-4 font-extrabold">
                          Doanh thu 12 tháng trong năm {month.slice(0, 4)}
                        </h2>

                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-slate-500">
                              <tr>
                                <th className="px-4 py-3">Tháng</th>
                                <th className="px-4 py-3 text-right">
                                  Tổng doanh thu (VNĐ)
                                </th>
                              </tr>
                            </thead>

                            <tbody>
                              {annualRows.map((row) => (
                                <tr
                                  key={row.month}
                                  className="border-t border-slate-100"
                                >
                                  <td className="px-4 py-3">{row.month}</td>
                                  <td className="px-4 py-3 text-right font-semibold tabular-nums">
                                    {money(row.amount)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>

                            <tfoot>
                              <tr className="border-t-2 border-slate-200 font-extrabold">
                                <td className="px-4 py-3">
                                  Tổng doanh thu cả năm
                                </td>
                                <td className="px-4 py-3 text-right">
                                  {money(
                                    annualRows.reduce(
                                      (sum, row) => sum + row.amount,
                                      0
                                    )
                                  )}
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </section>
                    </>
                  ) : (
                    <section className="grid gap-4 sm:grid-cols-3">
                      <div className="rounded-2xl border border-slate-200 bg-white p-5">
                        <p className="text-sm text-slate-500">Tổng thu nhập</p>
                        <p className="mt-3 text-2xl font-black">
                          {money(
                            myCommissions.reduce(
                              (s, x) => s + Number(x.amount),
                              0
                            )
                          )}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5">
                        <p className="text-sm text-amber-700">
                          Chờ thanh toán
                        </p>
                        <p className="mt-3 text-2xl font-black text-amber-800">
                          {money(
                            myPending.reduce(
                              (s, x) => s + Number(x.amount),
                              0
                            )
                          )}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
                        <p className="text-sm text-emerald-700">
                          Đã thanh toán
                        </p>
                        <p className="mt-3 text-2xl font-black text-emerald-800">
                          {money(
                            myPaid.reduce(
                              (s, x) => s + Number(x.amount),
                              0
                            )
                          )}
                        </p>
                      </div>
                    </section>
                  )}
                </>
              )}

              {tab === "income" && (
                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  <div className="border-b border-slate-100 p-5">
                    <h2 className="font-extrabold">
                      {isAdmin
                        ? "Thu nhập và hoa hồng nhân viên"
                        : "Lịch sử thu nhập của tôi"}
                    </h2>
                    <p className="mt-1 text-xs text-slate-400">
                      Mức thưởng mặc định: 30.000 VNĐ cho mỗi CV được Admin duyệt.
                    </p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[700px] text-left text-sm">
                      <thead className="bg-slate-50 text-xs text-slate-500">
                        <tr>
                          {isAdmin && (
                            <th className="px-4 py-3">Nhân viên</th>
                          )}
                          <th className="px-4 py-3">Ngày duyệt</th>
                          <th className="px-4 py-3">Mã CV</th>
                          <th className="px-4 py-3">Tiền thưởng</th>
                          <th className="px-4 py-3">Trạng thái</th>
                          {isAdmin && (
                            <th className="px-4 py-3">Thao tác</th>
                          )}
                        </tr>
                      </thead>

                      <tbody>
                        {(isAdmin ? selectedCommissions : myCommissions).map(
                          (item) => (
                            <tr
                              key={item.id}
                              className="border-t border-slate-100"
                            >
                              {isAdmin && (
                                <td className="px-4 py-3">
                                  {profiles.find(
                                    (p) => p.id === item.employee_id
                                  )?.full_name || "Nhân viên"}
                                </td>
                              )}

                              <td className="px-4 py-3">
                                {dateText(item.approved_at)}
                              </td>

                              <td className="px-4 py-3 font-mono text-xs">
                                {item.candidate_id.slice(0, 8)}...
                              </td>

                              <td className="px-4 py-3 font-bold">
                                {money(Number(item.amount))}
                              </td>

                              <td className="px-4 py-3">
                                <span
                                  className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                                    item.status === "paid"
                                      ? "bg-emerald-50 text-emerald-700"
                                      : "bg-amber-50 text-amber-700"
                                  }`}
                                >
                                  {item.status === "paid"
                                    ? "Đã thanh toán"
                                    : "Chờ thanh toán"}
                                </span>
                              </td>

                              {isAdmin && (
                                <td className="px-4 py-3">
                                  {item.status === "pending" ? (
                                    <button
                                      onClick={() => markPaid(item)}
                                      className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700"
                                    >
                                      Xác nhận đã trả
                                    </button>
                                  ) : (
                                    <span className="text-xs text-slate-400">
                                      {dateText(item.paid_at)}
                                    </span>
                                  )}
                                </td>
                              )}
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>

                    {(isAdmin ? selectedCommissions : myCommissions).length ===
                      0 && (
                      <p className="p-10 text-center text-sm text-slate-400">
                        Chưa có khoản thưởng nào.
                      </p>
                    )}
                  </div>
                </section>
              )}

              {tab === "revenue" && isAdmin && (
                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5">
                    <div>
                      <h2 className="font-extrabold">Quản lý doanh thu</h2>
                      <p className="mt-1 text-xs text-slate-400">
                        Chỉ ghi nhận doanh thu đã xác nhận thực thu.
                      </p>
                    </div>

                    <button
                      onClick={openAddRevenue}
                      className="rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-bold text-white"
                    >
                      ＋ Thêm doanh thu
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px] text-left text-sm">
                      <thead className="bg-slate-50 text-slate-500">
                        <tr>
                          <th className="px-4 py-3">Ngày thu</th>
                          <th className="px-4 py-3">Loại</th>
                          <th className="px-4 py-3">Nội dung</th>
                          <th className="px-4 py-3">Khách hàng</th>
                          <th className="px-4 py-3 text-right">Số tiền</th>
                          <th className="px-4 py-3 text-center">Thao tác</th>
                        </tr>
                      </thead>

                      <tbody>
                        {selectedRevenues.map((item) => (
                          <tr
                            key={item.id}
                            className="border-t border-slate-100"
                          >
                            <td className="px-4 py-3">
                              {dateText(item.payment_date)}
                            </td>
                            <td className="px-4 py-3">{item.revenue_type}</td>
                            <td className="px-4 py-3">{item.description}</td>
                            <td className="px-4 py-3">
                              {item.customer_name || "—"}
                            </td>
                            <td className="px-4 py-3 text-right font-bold">
                              {money(Number(item.amount))}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button
                                onClick={() => openEditRevenue(item)}
                                className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-bold text-sky-700 hover:bg-sky-100"
                              >
                                ✏ Sửa
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {selectedRevenues.length === 0 && (
                      <p className="p-10 text-center text-sm text-slate-400">
                        Chưa có doanh thu trong tháng này.
                      </p>
                    )}
                  </div>
                </section>
              )}

              {tab === "expenses" && isAdmin && (
                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5">
                    <div>
                      <h2 className="font-extrabold">Quản lý chi phí</h2>
                      <p className="mt-1 text-xs text-slate-400">
                        Chi phí thưởng CV được tính riêng từ hoa hồng.
                      </p>
                    </div>

                    <button
                      onClick={() => setShowExpenseForm(true)}
                      className="rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-bold text-white"
                    >
                      ＋ Thêm chi phí
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[650px] text-left text-sm">
                      <thead className="bg-slate-50 text-slate-500">
                        <tr>
                          <th className="px-4 py-3">Ngày chi</th>
                          <th className="px-4 py-3">Danh mục</th>
                          <th className="px-4 py-3">Nội dung</th>
                          <th className="px-4 py-3">Người nhận</th>
                          <th className="px-4 py-3 text-right">Số tiền</th>
                        </tr>
                      </thead>

                      <tbody>
                        {selectedExpenses.map((item) => (
                          <tr
                            key={item.id}
                            className="border-t border-slate-100"
                          >
                            <td className="px-4 py-3">
                              {dateText(item.expense_date)}
                            </td>
                            <td className="px-4 py-3">{item.category}</td>
                            <td className="px-4 py-3">{item.description}</td>
                            <td className="px-4 py-3">
                              {item.paid_to || "—"}
                            </td>
                            <td className="px-4 py-3 text-right font-bold">
                              {money(Number(item.amount))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {selectedExpenses.length === 0 && (
                      <p className="p-10 text-center text-sm text-slate-400">
                        Chưa có chi phí trong tháng này.
                      </p>
                    )}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </main>

      {showRevenueForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4">
          <form
            onSubmit={addRevenue}
            className="w-full max-w-lg space-y-4 rounded-2xl bg-white p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-extrabold">
                {editingRevenueId
                  ? "Chỉnh sửa doanh thu"
                  : "Thêm khoản doanh thu"}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setShowRevenueForm(false);
                  setEditingRevenueId(null);
                }}
                className="text-2xl text-slate-400"
              >
                ×
              </button>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold">
                Loại doanh thu
              </label>
              <select
                value={revenueType}
                onChange={(e) =>
                  setRevenueType(e.target.value as "B2C" | "B2B")
                }
                className={inputClass}
              >
                <option value="B2C">B2C</option>
                <option value="B2B">B2B</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold">Nội dung</label>
              <input
                required
                value={revenueDescription}
                onChange={(e) => setRevenueDescription(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold">Khách hàng</label>
              <input
                value={revenueCustomer}
                onChange={(e) => setRevenueCustomer(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold">
                Số tiền (VNĐ)
              </label>
              <input
                required
                min="1"
                type="number"
                value={revenueAmount}
                onChange={(e) => setRevenueAmount(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold">
                Ngày thu tiền
              </label>
              <input
                required
                type="date"
                value={revenueDate}
                onChange={(e) => setRevenueDate(e.target.value)}
                className={inputClass}
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowRevenueForm(false);
                  setEditingRevenueId(null);
                }}
                className="rounded-xl border px-4 py-2 text-sm"
              >
                Hủy
              </button>

              <button
                disabled={saving}
                className="rounded-xl bg-teal-600 px-5 py-2 text-sm font-bold text-white disabled:opacity-50"
              >
                {saving
                  ? "Đang lưu..."
                  : editingRevenueId
                    ? "Cập nhật doanh thu"
                    : "Lưu doanh thu"}
              </button>
            </div>
          </form>
        </div>
      )}

      {showExpenseForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4">
          <form
            onSubmit={addExpense}
            className="w-full max-w-lg space-y-4 rounded-2xl bg-white p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-extrabold">Thêm khoản chi phí</h2>
              <button
                type="button"
                onClick={() => setShowExpenseForm(false)}
                className="text-2xl text-slate-400"
              >
                ×
              </button>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold">Danh mục</label>
              <select
                value={expenseCategory}
                onChange={(e) => setExpenseCategory(e.target.value)}
                className={inputClass}
              >
                <option>Marketing</option>
                <option>Vận hành</option>
                <option>Công cụ</option>
                <option>Thưởng nhân viên</option>
                <option>Khác</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold">Nội dung</label>
              <input
                required
                value={expenseDescription}
                onChange={(e) => setExpenseDescription(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold">
                Người nhận / đơn vị
              </label>
              <input
                value={expensePaidTo}
                onChange={(e) => setExpensePaidTo(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold">
                Số tiền (VNĐ)
              </label>
              <input
                required
                min="1"
                type="number"
                value={expenseAmount}
                onChange={(e) => setExpenseAmount(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold">Ngày chi</label>
              <input
                required
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                className={inputClass}
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowExpenseForm(false)}
                className="rounded-xl border px-4 py-2 text-sm"
              >
                Hủy
              </button>

              <button
                disabled={saving}
                className="rounded-xl bg-teal-600 px-5 py-2 text-sm font-bold text-white disabled:opacity-50"
              >
                {saving ? "Đang lưu..." : "Lưu chi phí"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
