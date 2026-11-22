
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Candidate = {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  skills: string | null;
  experience: string | null;
  cv_url: string | null;
  created_at: string;
};

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [openingCv, setOpeningCv] = useState<string | null>(null);

  async function loadCandidates() {
    setLoading(true);

    const { data, error } = await supabase
      .from("candidates")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      alert("Không tải được ứng viên: " + error.message);
    } else {
      setCandidates((data || []) as Candidate[]);
    }

    setLoading(false);
  }

  async function addCandidate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const { error } = await supabase.from("candidates").insert([
      {
        full_name: fullName,
        phone,
        email,
      },
    ]);

    if (error) {
      alert("Không thêm được ứng viên: " + error.message);
      return;
    }

    alert("Đã thêm ứng viên!");
    setFullName("");
    setPhone("");
    setEmail("");
    loadCandidates();
  }

  async function openCv(candidate: Candidate, download = false) {
    if (!candidate.cv_url) {
      alert("Ứng viên này chưa đính kèm CV.");
      return;
    }

    setOpeningCv(candidate.id);

    const { data, error } = await supabase.storage
      .from("candidate-cvs")
      .createSignedUrl(candidate.cv_url, 60 * 10, {
        download: download,
      });

    setOpeningCv(null);

    if (error || !data?.signedUrl) {
      alert("Không mở được CV: " + (error?.message || "Lỗi không xác định"));
      return;
    }

    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  useEffect(() => {
    loadCandidates();
  }, []);

  const filteredCandidates = candidates.filter((candidate) => {
    const search = keyword.toLowerCase();

    return (
      candidate.full_name.toLowerCase().includes(search) ||
      (candidate.phone || "").toLowerCase().includes(search) ||
      (candidate.email || "").toLowerCase().includes(search)
    );
  });

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-7xl">

        {/* NÚT QUAY LẠI DASHBOARD */}
        <a
          href="/admin/dashboard"
          className="mb-5 inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
        >
          ← Quay lại Dashboard
        </a>

        <h1 className="mb-2 text-3xl font-bold text-gray-900">
          Quản lý ứng viên
        </h1>

        <p className="mb-8 text-gray-500">
          Quản lý hồ sơ ứng viên trên hệ thống CVISION
        </p>

        <form
          onSubmit={addCandidate}
          className="mb-8 rounded-xl border bg-white p-6 shadow-sm"
        >
          <h2 className="mb-4 text-xl font-semibold">
            Thêm ứng viên mới
          </h2>

          <div className="grid gap-4 md:grid-cols-3">
            <input
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Họ và tên *"
              className="rounded-lg border p-3"
            />

            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Số điện thoại"
              className="rounded-lg border p-3"
            />

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="rounded-lg border p-3"
            />
          </div>

          <button
            type="submit"
            className="mt-4 rounded-lg bg-green-700 px-6 py-3 font-medium text-white hover:bg-green-800"
          >
            + Thêm ứng viên
          </button>
        </form>

        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">
              Danh sách ứng viên ({filteredCandidates.length})
            </h2>

            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Tìm theo tên, số điện thoại, email..."
              className="w-full rounded-lg border p-3 md:w-80"
            />
          </div>

          {loading ? (
            <p className="py-6 text-gray-500">Đang tải dữ liệu...</p>
          ) : filteredCandidates.length === 0 ? (
            <p className="py-6 text-gray-500">
              Chưa có ứng viên nào.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-3">Họ và tên</th>
                    <th className="p-3">Số điện thoại</th>
                    <th className="p-3">Email</th>
                    <th className="p-3">CV đính kèm</th>
                    <th className="p-3">Ngày tạo</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredCandidates.map((candidate) => (
                    <tr key={candidate.id} className="border-b">
                      <td className="p-3 font-medium">
                        {candidate.full_name}
                      </td>

                      <td className="p-3">
                        {candidate.phone || "—"}
                      </td>

                      <td className="p-3">
                        {candidate.email || "—"}
                      </td>

                      <td className="p-3">
                        {candidate.cv_url ? (
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => openCv(candidate)}
                              disabled={openingCv === candidate.id}
                              className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
                            >
                              {openingCv === candidate.id
                                ? "Đang mở..."
                                : "Xem CV"}
                            </button>

                            <button
                              type="button"
                              onClick={() => openCv(candidate, true)}
                              disabled={openingCv === candidate.id}
                              className="rounded-lg border border-emerald-700 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                            >
                              Tải CV
                            </button>
                          </div>
                        ) : (
                          <span className="text-gray-400">
                            Chưa có CV
                          </span>
                        )}
                      </td>

                      <td className="p-3">
                        {new Date(candidate.created_at).toLocaleDateString(
                          "vi-VN"
                        )}
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
