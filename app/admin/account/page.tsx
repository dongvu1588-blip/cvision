
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AccountPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [userId, setUserId] = useState("");
  const [role, setRole] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    async function loadAccount() {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        router.replace("/admin/login");
        return;
      }

      setUserId(user.id);
      setEmail(user.email || "");

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name, role")
        .eq("id", user.id)
        .single();

      if (profileError || !profile) {
        alert("Không thể tải thông tin tài khoản.");
        setLoading(false);
        return;
      }

      setFullName(profile.full_name || "");
      setRole(profile.role || "recruiter");
      setLoading(false);
    }

    loadAccount();
  }, [router]);

  async function saveAccount(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!userId || saving) return;

    if (newPassword && newPassword.length < 6) {
      alert("Mật khẩu mới phải có ít nhất 6 ký tự.");
      return;
    }

    if (newPassword !== confirmPassword) {
      alert("Mật khẩu xác nhận không khớp.");
      return;
    }

    setSaving(true);

    try {
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ full_name: fullName.trim() })
        .eq("id", userId);

      if (profileError) {
        throw new Error("Không thể cập nhật thông tin: " + profileError.message);
      }

      if (newPassword) {
        const { error: passwordError } = await supabase.auth.updateUser({
          password: newPassword,
        });

        if (passwordError) {
          throw new Error("Không thể đổi mật khẩu: " + passwordError.message);
        }
      }

      alert("Đã cập nhật tài khoản thành công!");

      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Đã xảy ra lỗi khi cập nhật tài khoản."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="font-semibold text-slate-500">
          Đang tải thông tin tài khoản...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-5 md:p-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <p className="text-sm font-semibold text-sky-600">
            CVISION WORKSPACE / TÀI KHOẢN
          </p>
          <h1 className="mt-2 text-3xl font-black text-slate-800">
            Tài khoản của tôi
          </h1>
          <p className="mt-2 text-slate-500">
            Quản lý thông tin cá nhân và bảo mật tài khoản.
          </p>
        </div>

        <form onSubmit={saveAccount} className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-xl font-bold text-slate-800">
              Thông tin cá nhân
            </h2>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Họ và tên
                </label>
                <input
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-sky-500"
                  placeholder="Nhập họ và tên"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Email đăng nhập
                </label>
                <input
                  type="email"
                  value={email}
                  readOnly
                  className="w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-slate-500"
                />
                <p className="mt-1 text-xs text-slate-400">
                  Email hiện chỉ hiển thị, chưa hỗ trợ thay đổi.
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Chức vụ
                </label>
                <input
                  value={role === "admin" ? "Admin" : "Nhân viên tuyển dụng"}
                  readOnly
                  className="w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-slate-500"
                />
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-2 text-xl font-bold text-slate-800">
              Đổi mật khẩu
            </h2>
            <p className="mb-5 text-sm text-slate-500">
              Để trống nếu bạn không muốn đổi mật khẩu.
            </p>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Mật khẩu mới
                </label>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-sky-500"
                  placeholder="Nhập mật khẩu mới"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Xác nhận mật khẩu mới
                </label>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-sky-500"
                  placeholder="Nhập lại mật khẩu mới"
                />
              </div>
            </div>
          </section>

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-sky-600 px-6 py-3 font-bold text-white shadow transition hover:bg-sky-700 disabled:opacity-50"
            >
              {saving ? "Đang lưu..." : "Lưu thay đổi"}
            </button>

            <button
              type="button"
              onClick={() => router.push("/admin/dashboard")}
              className="rounded-xl border border-slate-200 bg-white px-6 py-3 font-semibold text-slate-600 hover:bg-slate-100"
            >
              Quay lại Dashboard
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
