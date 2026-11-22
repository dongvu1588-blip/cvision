
"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type StaffUser = {
  id: string;
  full_name: string | null;
  role: string | null;
};

export default function AdminUsersPage() {
  const router = useRouter();

  const [users, setUsers] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("recruiter");

  const getToken = useCallback(async () => {
    const { data, error: sessionError } =
      await supabase.auth.getSession();

    if (sessionError || !data.session) {
      router.replace("/admin/login");
      return null;
    }

    return data.session.access_token;
  }, [router]);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError("");

    const token = await getToken();

    if (!token) {
      setLoading(false);
      return;
    }

    const response = await fetch("/api/admin/users", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    const result = await response.json();

    if (!response.ok) {
      setError(
        result.error || "Không tải được danh sách nhân viên."
      );
      setUsers([]);
    } else {
      setUsers(result.users || []);
    }

    setLoading(false);
  }, [getToken]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  async function handleCreate(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const token = await getToken();

      if (!token) return;

      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          full_name: fullName,
          email,
          password,
          role,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(
          result.error || "Không tạo được tài khoản."
        );
        return;
      }

      setSuccess(
        `Đã tạo tài khoản ${result.user.email}. Hãy gửi email và mật khẩu cho nhân viên qua kênh riêng tư.`
      );

      setFullName("");
      setEmail("");
      setPassword("");
      setRole("recruiter");

      await loadUsers();
    } catch {
      setError(
        "Không thể kết nối máy chủ. Vui lòng thử lại."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/admin/login");
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 text-slate-800 md:px-8">
      <div className="mx-auto max-w-6xl">

        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <a
              href="/admin/dashboard"
              className="text-sm font-semibold text-emerald-700"
            >
              ← Quay lại Dashboard
            </a>

            <h1 className="mt-3 text-2xl font-extrabold md:text-3xl">
              Quản lý nhân viên
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Tạo tài khoản đăng nhập và phân quyền cho nhân viên CVISION.
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="rounded-lg bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-100"
          >
            Đăng xuất
          </button>
        </header>

        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            {success}
          </div>
        )}

        <section className="mb-8 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm md:p-7">
          <h2 className="text-lg font-bold">
            Tạo tài khoản nhân viên mới
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Mật khẩu tối thiểu 8 ký tự. Nhân viên có thể đổi mật khẩu sau khi đăng nhập.
          </p>

          <form
            onSubmit={handleCreate}
            className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2"
          >
            <label className="text-sm font-semibold">
              Họ và tên

              <input
                required
                value={fullName}
                onChange={(event) =>
                  setFullName(event.target.value)
                }
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-emerald-500"
                placeholder="Nguyễn Văn A"
              />
            </label>

            <label className="text-sm font-semibold">
              Email đăng nhập

              <input
                required
                type="email"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-emerald-500"
                placeholder="nhanvien@example.com"
              />
            </label>

            <label className="text-sm font-semibold">
              Mật khẩu khởi tạo

              <input
                required
                type="password"
                minLength={8}
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-emerald-500"
                placeholder="Ít nhất 8 ký tự"
                autoComplete="new-password"
              />
            </label>

            <label className="text-sm font-semibold">
              Vai trò

              <select
                value={role}
                onChange={(event) =>
                  setRole(event.target.value)
                }
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-normal outline-none focus:border-emerald-500"
              >
                <option value="recruiter">
                  Recruiter – Nhân viên tuyển dụng
                </option>

                <option value="admin">
                  Admin – Quản trị viên
                </option>
              </select>
            </label>

            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving
                  ? "Đang tạo tài khoản..."
                  : "Tạo tài khoản"}
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm md:p-7">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">
                Danh sách tài khoản
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Danh sách lấy từ bảng profiles.
              </p>
            </div>

            <button
              onClick={loadUsers}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold hover:bg-slate-50"
            >
              Làm mới
            </button>
          </div>

          {loading ? (
            <p className="py-8 text-center text-sm text-slate-400">
              Đang tải...
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-500">
                    <th className="px-3 py-3">
                      Họ và tên
                    </th>

                    <th className="px-3 py-3">
                      ID tài khoản
                    </th>

                    <th className="px-3 py-3">
                      Vai trò
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {users.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b border-slate-50"
                    >
                      <td className="px-3 py-4 font-semibold">
                        {user.full_name || "Chưa cập nhật"}
                      </td>

                      <td className="px-3 py-4 font-mono text-xs text-slate-500">
                        {user.id}
                      </td>

                      <td className="px-3 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            user.role === "admin"
                              ? "bg-violet-50 text-violet-700"
                              : "bg-emerald-50 text-emerald-700"
                          }`}
                        >
                          {user.role === "admin"
                            ? "Admin"
                            : "Recruiter"}
                        </span>
                      </td>
                    </tr>
                  ))}

                  {users.length === 0 && (
                    <tr>
                      <td
                        colSpan={3}
                        className="px-3 py-8 text-center text-slate-400"
                      >
                        Chưa có tài khoản nhân viên.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
