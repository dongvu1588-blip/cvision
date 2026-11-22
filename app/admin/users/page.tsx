
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Staff = {
  id: string;
  full_name: string | null;
  role: string;
  created_at: string;
};

export default function UsersPage() {
  const [users, setUsers] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function getToken() {
    const { data, error } = await supabase.auth.getSession();

    if (error || !data.session) {
      throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
    }

    return data.session.access_token;
  }

  async function loadUsers() {
    setLoading(true);

    try {
      const token = await getToken();

      const response = await fetch("/api/admin/users", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Không tải được nhân viên.");
      }

      setUsers(result.users || []);
    } catch (error) {
      alert(
        error instanceof Error ? error.message : "Đã xảy ra lỗi."
      );
    } finally {
      setLoading(false);
    }
  }

  async function createUser(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setCreating(true);

    try {
      const token = await getToken();

      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          full_name: fullName.trim(),
          email: email.trim(),
          password,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Không tạo được tài khoản.");
      }

      alert("Tạo tài khoản Recruiter thành công!");

      setFullName("");
      setEmail("");
      setPassword("");

      await loadUsers();
    } catch (error) {
      alert(
        error instanceof Error ? error.message : "Đã xảy ra lỗi."
      );
    } finally {
      setCreating(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  return (
    <main className="min-h-screen bg-slate-50 p-5 text-slate-800 md:p-8">
      <div className="mx-auto max-w-6xl">
        <a
          href="/admin/dashboard"
          className="text-sm font-semibold text-emerald-700"
        >
          ← Quay lại Dashboard
        </a>

        <div className="mb-8 mt-4">
          <h1 className="text-3xl font-extrabold">
            Quản lý nhân viên
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Quản lý tài khoản và nhân sự của CVISION.
          </p>
        </div>

        <section className="mb-8 rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-xl font-bold">
            + Tạo tài khoản Recruiter
          </h2>

          <form onSubmit={createUser} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Họ và tên
                </label>
                <input
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nhập họ và tên nhân viên"
                  className="w-full rounded-lg border p-3"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Email đăng nhập
                </label>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@gmail.com"
                  className="w-full rounded-lg border p-3"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Mật khẩu
              </label>
              <input
                required
                type="password"
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Tối thiểu 8 ký tự"
                className="w-full rounded-lg border p-3 md:max-w-md"
              />
            </div>

            <button
              type="submit"
              disabled={creating}
              className="rounded-lg bg-emerald-700 px-6 py-3 font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
            >
              {creating ? "Đang tạo tài khoản..." : "Tạo tài khoản"}
            </button>
          </form>
        </section>

        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 className="text-xl font-bold">
              Danh sách nhân viên ({users.length})
            </h2>

            <button
              onClick={loadUsers}
              className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-slate-50"
            >
              Làm mới
            </button>
          </div>

          {loading ? (
            <p className="py-8 text-center text-slate-400">
              Đang tải danh sách...
            </p>
          ) : users.length === 0 ? (
            <p className="py-8 text-center text-slate-400">
              Chưa có nhân viên nào.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="p-3">Họ và tên</th>
                    <th className="p-3">Vai trò</th>
                    <th className="p-3">Ngày tạo</th>
                  </tr>
                </thead>

                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b">
                      <td className="p-3 font-semibold">
                        {user.full_name || "Chưa cập nhật"}
                      </td>

                      <td className="p-3">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            user.role === "admin"
                              ? "bg-purple-100 text-purple-700"
                              : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {user.role === "admin" ? "Admin" : "Recruiter"}
                        </span>
                      </td>

                      <td className="p-3">
                        {new Date(user.created_at).toLocaleDateString("vi-VN")}
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
