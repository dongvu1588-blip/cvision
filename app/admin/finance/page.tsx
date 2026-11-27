 "use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import SiteLogo from "@/components/SiteLogo";

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
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50";

const money = (value: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value || 0);

const dateText = (value: string) =>
  value ? new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString("vi-VN") : "—";

export default function FinancePage() {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [userName, setUserName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [month, setMonth] = useState("");
  const [revenues, setRevenues] = useState<Revenue[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState("");

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

    setUserName(profile.full_name || user.email || "Quản trị viên");

    if (profile.role !== "admin") {
      setError("Bạn không có quyền truy cập trang quản lý tài chính.");
      setRevenues([]);
      setLoading(false);
      return;
    }

    const { data, error: revenueError } = await supabase
      .from("finance_revenues")
      .select("*")
      .order("payment_date", { ascending: false });

    if (revenueError) setError(revenueError.message);
    else setRevenues((data || []) as Revenue[]);

    setLoading(false);
  }

  useEffect(() => {
    const today = new Date();
    const todayText = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    setMonth(todayText.slice(0, 7));
    setPaymentDate(todayText);
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const monthlyRevenues = useMemo(
    () =>
      revenues.filter(
        (item) =>
          item.payment_date?.slice(0, 7) === month &&
          item.status === "confirmed"
      ),
    [revenues, month]
  );

  const monthlyTotal = monthlyRevenues.reduce(
    (sum, item) => sum + Number(item.amount || 0),
    0
  );

  function openAddForm() {
    const today = new Date();
    const todayText = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    setEditingId(null);
    setDescription("");
    setCustomerName("");
    setAmount("");
    setPaymentDate(todayText);
    setShowForm(true);
  }

  function openEditForm(item: Revenue) {
    setEditingId(item.id);
    setDescription(item.description);
    setCustomerName(item.customer_name || "");
    setAmount(String(item.amount));
    setPaymentDate(item.payment_date);
    setShowForm(true);
  }

  async function saveRevenue(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!userId || Number(amount) <= 0) return;

    setSaving(true);
    const revenueData = {
      revenue_type: "B2C" as const,
      description: description.trim(),
      customer_name: customerName.trim() || null,
      amount: Number(amount),
      payment_date: paymentDate,
    };

    const result = editingId
      ? await supabase
          .from("finance_revenues")
          .update(revenueData)
          .eq("id", editingId)
      : await supabase.from("finance_revenues").insert({
          ...revenueData,
          status: "confirmed",
          created_by: userId,
          confirmed_by: userId,
          confirmed_at: new Date().toISOString(),
        });

    setSaving(false);

    if (result.error) {
      alert((editingId ? "Không cập nhật được khoản thu: " : "Không thêm được khoản thu: ") + result.error.message);
      return;
    }

    setShowForm(false);
    setEditingId(null);
    await loadData();
  }

  async function deleteRevenue(item: Revenue) {
    if (!window.confirm(`Bạn có chắc muốn xóa khoản thu "${item.description}" (${money(Number(item.amount))})?`)) return;

    const { error: deleteError } = await supabase
      .from("finance_revenues")
      .delete()
      .eq("id", item.id);

    if (deleteError) {
      alert("Không xóa được khoản thu: " + deleteError.message);
      return;
    }

    await loadData();
  }

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/admin/login");
  }

  return (
    <div className="flex min-h-screen bg-[#f7f9fc] text-slate-800">
      <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white p-5 md:flex md:flex-col">
        <a href="/" className="mb-10 flex flex-col items-start gap-2">
          <SiteLogo size="large" />
          <p className="pl-1 text-[9px] font-bold tracking-[0.2em] text-blue-600">
            ADMIN WORKSPACE
          </p>
        </a>

        <p className="mb-4 px-3 text-[11px] font-extrabold uppercase tracking-[0.18em] text-slate-400">
          Workspace
        </p>

        <nav className="space-y-2">
          {menu.map((item) => (
            <a
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                item.href === "/admin/finance"
                  ? "bg-blue-600 text-white"
                  : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <span className={`flex h-7 w-7 items-center justify-center rounded-lg text-lg ${
                item.href === "/admin/finance"
                  ? "bg-blue-500 text-white"
                  : "bg-slate-100 text-slate-600"
              }`}>
                {item.icon}
              </span>
              {item.name}
            </a>
          ))}
          <a
            href="/admin/users"
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100">♙</span>
            Quản lý nhân viên
          </a>
          <a
            href="/admin/brand-settings"
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100">⚙</span>
            Cài đặt thương hiệu
          </a>
        </nav>

        <div className="mt-auto rounded-2xl border border-blue-100 bg-blue-50 p-4">
          <p className="font-extrabold text-slate-900">CVISION Workspace</p>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            Theo dõi tổng thu nhập theo từng tháng.
          </p>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-100 p-3">
          <p className="truncate text-sm font-bold">{userName || "Đang tải tài khoản..."}</p>
          <p className="text-xs text-slate-500">Quản trị viên</p>
          <button
            onClick={logout}
            className="mt-3 text-xs font-semibold text-slate-500 hover:text-blue-700"
          >
            ↪ Đăng xuất
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-4 py-4 backdrop-blur md:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-slate-400">Workspace / Quản lý tài chính</p>
              <h1 className="mt-1 text-2xl font-extrabold tracking-tight">Quản lý tài chính</h1>
              <p className="mt-1 text-sm text-slate-500">Ghi nhận và theo dõi tổng thu nhập mỗi tháng.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="month"
                value={month}
                onChange={(event) => setMonth(event.target.value)}
                className={inputClass + " w-auto"}
              />
              <button
                onClick={loadData}
                disabled={loading}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold hover:bg-slate-50 disabled:opacity-50"
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

          <section className="rounded-2xl border border-blue-100 bg-gradient-to-br from-white to-blue-50 p-6 shadow-sm md:p-8">
            <p className="text-sm font-semibold text-slate-500">Tổng thu nhập tháng đã chọn</p>
            <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-3xl font-black tracking-tight text-blue-700 md:text-4xl">
                  {loading ? "Đang tải..." : money(monthlyTotal)}
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  {monthlyRevenues.length} khoản thu được ghi nhận trong tháng
                </p>
              </div>
              <button
                onClick={openAddForm}
                className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700"
              >
                ＋ Thêm khoản thu
              </button>
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5">
              <div>
                <h2 className="font-extrabold text-slate-900">Lịch sử thu nhập</h2>
                <p className="mt-1 text-xs text-slate-500">Các khoản thu đã xác nhận trong tháng đang chọn.</p>
              </div>
              <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">
                {month || "Chưa chọn tháng"}
              </span>
            </div>

            {loading ? (
              <div className="p-10 text-center text-sm text-slate-400">Đang tải dữ liệu...</div>
            ) : monthlyRevenues.length === 0 ? (
              <div className="p-10 text-center">
                <p className="font-semibold text-slate-600">Chưa có khoản thu nào trong tháng này.</p>
                <p className="mt-1 text-sm text-slate-400">Nhấn “Thêm khoản thu” để ghi nhận thu nhập.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-5 py-4 font-bold">Ngày thu</th>
                      <th className="px-5 py-4 font-bold">Nội dung</th>
                      <th className="px-5 py-4 font-bold">Khách hàng</th>
                      <th className="px-5 py-4 text-right font-bold">Số tiền</th>
                      <th className="px-5 py-4 text-center font-bold">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyRevenues.map((item) => (
                      <tr key={item.id} className="border-t border-slate-100 hover:bg-slate-50">
                        <td className="px-5 py-4 text-slate-600">{dateText(item.payment_date)}</td>
                        <td className="px-5 py-4 font-semibold text-slate-800">{item.description}</td>
                        <td className="px-5 py-4 text-slate-600">{item.customer_name || "—"}</td>
                        <td className="px-5 py-4 text-right font-bold tabular-nums text-blue-700">
                          {money(Number(item.amount))}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={() => openEditForm(item)}
                              className="rounded-lg border border-blue-200 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-50"
                            >
                              Sửa
                            </button>
                            <button
                              onClick={() => deleteRevenue(item)}
                              className="rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50"
                            >
                              Xóa
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t-2 border-slate-200 bg-slate-50">
                    <tr>
                      <td colSpan={3} className="px-5 py-4 font-extrabold text-slate-700">Tổng thu nhập tháng</td>
                      <td className="px-5 py-4 text-right font-black text-blue-700">{money(monthlyTotal)}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </section>
        </div>
      </main>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4">
          <form onSubmit={saveRevenue} className="w-full max-w-lg space-y-4 rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-extrabold">{editingId ? "Chỉnh sửa khoản thu" : "Thêm khoản thu"}</h2>
              <button type="button" onClick={() => setShowForm(false)} className="text-2xl text-slate-400">×</button>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold">Nội dung thu nhập</label>
              <input required value={description} onChange={(event) => setDescription(event.target.value)} className={inputClass} placeholder="Ví dụ: Doanh thu dịch vụ CV" />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold">Khách hàng (không bắt buộc)</label>
              <input value={customerName} onChange={(event) => setCustomerName(event.target.value)} className={inputClass} placeholder="Tên khách hàng hoặc doanh nghiệp" />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold">Số tiền (VNĐ)</label>
              <input required min="1" type="number" value={amount} onChange={(event) => setAmount(event.target.value)} className={inputClass} placeholder="Nhập số tiền" />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold">Ngày thu</label>
              <input required type="date" value={paymentDate} onChange={(event) => setPaymentDate(event.target.value)} className={inputClass} />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowForm(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold">Hủy</button>
              <button disabled={saving} className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-bold text-white disabled:opacity-50">
                {saving ? "Đang lưu..." : editingId ? "Cập nhật" : "Lưu khoản thu"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
