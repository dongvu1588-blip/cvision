"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Company = {
  id: string;
  name: string;
};

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [name, setName] = useState("");
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState("");

  async function loadCompanies() {
    setLoading(true);

    const { data, error } = await supabase
      .from("companies")
      .select("id, name")
      .order("name", { ascending: true });

    if (error) {
      alert("Không thể tải danh sách doanh nghiệp: " + error.message);
      setCompanies([]);
    } else {
      setCompanies((data || []) as Company[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadCompanies();
  }, []);

  function resetForm() {
    setName("");
    setEditingId("");
  }

  async function saveCompany(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const companyName = name.trim();
    if (!companyName) {
      alert("Vui lòng nhập tên doanh nghiệp.");
      return;
    }

    const duplicate = companies.some(
      (company) =>
        company.name.trim().toLowerCase() === companyName.toLowerCase() &&
        company.id !== editingId
    );

    if (duplicate) {
      alert("Tên doanh nghiệp này đã tồn tại.");
      return;
    }

    setSaving(true);

    const result = editingId
      ? await supabase
          .from("companies")
          .update({ name: companyName })
          .eq("id", editingId)
      : await supabase.from("companies").insert({ name: companyName });

    setSaving(false);

    if (result.error) {
      alert(
        (editingId ? "Không thể cập nhật" : "Không thể thêm") +
          " doanh nghiệp: " +
          result.error.message
      );
      return;
    }

    alert(editingId ? "Đã cập nhật doanh nghiệp!" : "Đã thêm doanh nghiệp!");
    resetForm();
    await loadCompanies();
  }

  function startEditing(company: Company) {
    setEditingId(company.id);
    setName(company.name);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteCompany(company: Company) {
    const confirmed = window.confirm(
      `Bạn có chắc muốn xóa doanh nghiệp "${company.name}"? Nếu doanh nghiệp đang được sử dụng trong tin tuyển dụng, cơ sở dữ liệu có thể từ chối thao tác này.`
    );

    if (!confirmed) return;

    setDeletingId(company.id);

    const { error } = await supabase
      .from("companies")
      .delete()
      .eq("id", company.id);

    setDeletingId("");

    if (error) {
      alert(
        "Không thể xóa doanh nghiệp: " +
          error.message +
          "\n\nNếu doanh nghiệp đã được gắn với tin tuyển dụng, hãy giữ lại doanh nghiệp đó và không xóa."
      );
      return;
    }

    if (editingId === company.id) resetForm();
    await loadCompanies();
  }

  const filteredCompanies = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return companies;
    return companies.filter((company) =>
      company.name.toLowerCase().includes(keyword)
    );
  }, [companies, search]);

  const inputClass =
    "w-full rounded-xl border border-sky-100 bg-sky-50/40 p-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100";

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-sky-50 via-white to-blue-100 p-4 text-slate-800 md:p-8">
      <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-sky-200/40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-24 h-96 w-96 rounded-full bg-blue-200/30 blur-3xl" />

      <div className="relative mx-auto max-w-5xl">
        <a
          href="/admin/dashboard"
          className="mb-6 inline-flex items-center gap-2 rounded-xl border border-sky-100 bg-white/90 px-4 py-2.5 text-sm font-semibold text-sky-700 shadow-sm transition hover:border-sky-300 hover:bg-sky-50"
        >
          ← Quay lại Dashboard
        </a>

        <div className="mb-8">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-sky-100 bg-white/80 px-3 py-1 text-xs font-semibold text-sky-700">
            <span className="h-2 w-2 rounded-full bg-sky-500" />
            CVISION RECRUITMENT SYSTEM
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-800 md:text-4xl">
            Quản lý doanh nghiệp
          </h1>
          <p className="mt-2 text-sm text-slate-500 md:text-base">
            Thêm tên công ty trực tiếp để sử dụng khi tạo tin tuyển dụng.
          </p>
        </div>

        <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-sky-100 bg-white/90 p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Tổng số doanh nghiệp
            </p>
            <p className="mt-3 text-3xl font-extrabold text-sky-700">
              {loading ? "..." : companies.length}
            </p>
          </div>
          <div className="rounded-2xl border border-sky-100 bg-white/90 p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Kết quả đang hiển thị
            </p>
            <p className="mt-3 text-3xl font-extrabold text-blue-700">
              {loading ? "..." : filteredCompanies.length}
            </p>
          </div>
        </section>

        <form
          onSubmit={saveCompany}
          className="mb-8 overflow-hidden rounded-2xl border border-sky-100 bg-white/95 shadow-sm"
        >
          <div className="border-b border-sky-100 bg-gradient-to-r from-sky-100/80 to-blue-50 px-6 py-5">
            <h2 className="text-lg font-bold text-slate-800">
              {editingId ? "Chỉnh sửa doanh nghiệp" : "Thêm doanh nghiệp mới"}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Nhập tên công ty bằng tay. Tên doanh nghiệp sẽ xuất hiện trong
              danh sách chọn ở trang Quản lý việc làm.
            </p>
          </div>

          <div className="p-6">
            <label className="mb-2 block text-sm font-semibold text-slate-600">
              Tên doanh nghiệp <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ví dụ: Luxshare-ICT, Foxconn, Molex..."
                className={inputClass}
              />
              <button
                type="submit"
                disabled={saving}
                className="shrink-0 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-6 py-3 text-sm font-bold text-white shadow-md shadow-sky-200 transition hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving
                  ? "Đang lưu..."
                  : editingId
                    ? "Lưu thay đổi"
                    : "+ Thêm doanh nghiệp"}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="shrink-0 rounded-xl border border-sky-200 bg-white px-5 py-3 text-sm font-semibold text-sky-700 transition hover:bg-sky-50"
                >
                  Hủy
                </button>
              )}
            </div>
          </div>
        </form>

        <section className="overflow-hidden rounded-2xl border border-sky-100 bg-white/95 shadow-sm">
          <div className="border-b border-sky-100 bg-gradient-to-r from-white to-sky-50/80 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-slate-800">
                  Danh sách doanh nghiệp
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Quản lý tên công ty dùng trong các tin tuyển dụng.
                </p>
              </div>
              <button
                type="button"
                onClick={loadCompanies}
                className="rounded-xl border border-sky-200 bg-white px-4 py-2.5 text-sm font-semibold text-sky-700 transition hover:bg-sky-50"
              >
                ↻ Làm mới
              </button>
            </div>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="🔎 Tìm tên doanh nghiệp..."
              className={`${inputClass} mt-5`}
            />
          </div>

          <div className="p-4 md:p-6">
            {loading ? (
              <div className="py-12 text-center text-sm text-slate-500">
                Đang tải danh sách doanh nghiệp...
              </div>
            ) : filteredCompanies.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-sky-200 bg-sky-50/50 py-12 text-center">
                <div className="mb-3 text-4xl">🏢</div>
                <p className="font-semibold text-slate-700">
                  {companies.length === 0
                    ? "Chưa có doanh nghiệp nào."
                    : "Không tìm thấy doanh nghiệp phù hợp."}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Nhập tên công ty ở biểu mẫu phía trên để thêm mới.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-sky-100">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gradient-to-r from-sky-100 to-blue-50 text-slate-700">
                    <tr>
                      <th className="w-16 p-4 font-bold">STT</th>
                      <th className="p-4 font-bold">Tên doanh nghiệp</th>
                      <th className="w-48 p-4 text-right font-bold">
                        Thao tác
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCompanies.map((company, index) => (
                      <tr
                        key={company.id}
                        className="border-b border-sky-50 transition last:border-0 hover:bg-sky-50/60"
                      >
                        <td className="p-4 text-slate-400">{index + 1}</td>
                        <td className="p-4 font-semibold text-slate-800">
                          {company.name}
                        </td>
                        <td className="p-4">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => startEditing(company)}
                              className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 transition hover:bg-blue-100"
                            >
                              Sửa
                            </button>
                            <button
                              type="button"
                              disabled={deletingId === company.id}
                              onClick={() => deleteCompany(company)}
                              className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs font-bold text-red-600 transition hover:bg-red-100 disabled:opacity-50"
                            >
                              {deletingId === company.id
                                ? "Đang xóa..."
                                : "Xóa"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        <p className="mt-6 text-center text-xs text-slate-400">
          CVISION · Recruitment Management System
        </p>
      </div>
    </main>
  );
}
