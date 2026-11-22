
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Company = {
  id: string;
  name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  created_at: string;
};

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  async function loadCompanies() {
    setLoading(true);

    const { data, error } = await supabase
      .from("companies")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      alert("Lỗi tải công ty: " + error.message);
    } else {
      setCompanies(data || []);
    }

    setLoading(false);
  }

  async function addCompany(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const { error } = await supabase.from("companies").insert({
      name,
      contact_person: contact,
      email,
      phone,
      address,
    });

    if (error) {
      alert("Không thêm được công ty: " + error.message);
      return;
    }

    alert("Đã thêm công ty thành công!");

    setName("");
    setContact("");
    setEmail("");
    setPhone("");
    setAddress("");

    loadCompanies();
  }

  async function deleteCompany(id: string) {
    const confirmed = window.confirm("Bạn có chắc muốn xóa công ty này?");
    if (!confirmed) return;

    const { error } = await supabase
      .from("companies")
      .delete()
      .eq("id", id);

    if (error) {
      alert("Không xóa được công ty: " + error.message);
      return;
    }

    loadCompanies();
  }

  useEffect(() => {
    loadCompanies();
  }, []);

  const filtered = companies.filter((company) =>
    `${company.name} ${company.contact_person || ""} ${company.phone || ""}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <main className="min-h-screen bg-slate-50 p-5 text-slate-800 md:p-8">
      <div className="mx-auto max-w-6xl">
        <a
          href="/admin/dashboard"
          className="text-sm font-medium text-emerald-700"
        >
          ← Quay lại Dashboard
        </a>

        <div className="mb-8 mt-4">
          <h1 className="text-3xl font-extrabold">Quản lý công ty</h1>
          <p className="mt-2 text-sm text-slate-500">
            Quản lý thông tin doanh nghiệp hợp tác tuyển dụng với CVISION.
          </p>
        </div>

        <form
          onSubmit={addCompany}
          className="mb-8 rounded-2xl border bg-white p-6 shadow-sm"
        >
          <h2 className="mb-5 text-xl font-bold">Thêm doanh nghiệp mới</h2>

          <div className="grid gap-4 md:grid-cols-2">
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tên công ty *"
              className="rounded-lg border p-3"
            />

            <input
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="Người liên hệ"
              className="rounded-lg border p-3"
            />

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email liên hệ"
              className="rounded-lg border p-3"
            />

            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Số điện thoại"
              className="rounded-lg border p-3"
            />

            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Địa chỉ doanh nghiệp"
              className="rounded-lg border p-3 md:col-span-2"
            />
          </div>

          <button
            type="submit"
            className="mt-5 rounded-lg bg-emerald-700 px-6 py-3 font-semibold text-white hover:bg-emerald-800"
          >
            + Thêm công ty
          </button>
        </form>

        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-xl font-bold">
              Danh sách doanh nghiệp ({filtered.length})
            </h2>

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm tên công ty, liên hệ..."
              className="w-full rounded-lg border p-3 md:w-80"
            />
          </div>

          {loading ? (
            <p className="py-8 text-center text-slate-400">Đang tải...</p>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-slate-400">
              Chưa có doanh nghiệp nào.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[650px] text-left text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="p-3">Tên công ty</th>
                    <th className="p-3">Người liên hệ</th>
                    <th className="p-3">Email</th>
                    <th className="p-3">Điện thoại</th>
                    <th className="p-3">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((company) => (
                    <tr key={company.id} className="border-b">
                      <td className="p-3 font-semibold">{company.name}</td>
                      <td className="p-3">{company.contact_person || "—"}</td>
                      <td className="p-3">{company.email || "—"}</td>
                      <td className="p-3">{company.phone || "—"}</td>
                      <td className="p-3">
                        <button
                          onClick={() => deleteCompany(company.id)}
                          className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-100"
                        >
                          Xóa
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
