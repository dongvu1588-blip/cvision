
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [validSession, setValidSession] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function checkRecoverySession() {
      const { data, error } = await supabase.auth.getSession();

      if (!mounted) return;

      setValidSession(!error && !!data.session);
      setChecking(false);
    }

    checkRecoverySession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      if (event === "PASSWORD_RECOVERY" && session) {
        setValidSession(true);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleResetPassword(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    if (loading) return;

    if (password.length < 6) {
      alert("Mật khẩu phải có ít nhất 6 ký tự.");
      return;
    }

    if (password !== confirmPassword) {
      alert("Mật khẩu xác nhận không khớp.");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        throw new Error(error.message);
      }

      alert("Đổi mật khẩu thành công! Vui lòng đăng nhập lại.");

      await supabase.auth.signOut();
      router.replace("/admin/login");
    } catch (error) {
      alert(
        error instanceof Error
          ? "Không thể đổi mật khẩu: " + error.message
          : "Đã xảy ra lỗi. Vui lòng thử lại."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-sky-50 via-white to-blue-100 p-5">
      <div className="w-full max-w-md rounded-3xl border border-white bg-white p-7 shadow-2xl shadow-sky-200/60 sm:p-10">
        <div className="mb-7 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 text-2xl font-black text-white shadow-lg">
            C
          </div>

          <p className="mt-5 text-xs font-bold uppercase tracking-[0.2em] text-sky-500">
            CVISION Admin Portal
          </p>

          <h1 className="mt-3 text-3xl font-black text-slate-800">
            Đặt lại mật khẩu
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Tạo mật khẩu mới để tiếp tục sử dụng hệ thống CVISION.
          </p>
        </div>

        {checking ? (
          <p className="py-6 text-center text-sm text-slate-500">
            Đang xác minh liên kết...
          </p>
        ) : !validSession ? (
          <div className="space-y-5 text-center">
            <p className="rounded-xl bg-red-50 p-4 text-sm leading-6 text-red-600">
              Liên kết khôi phục không hợp lệ, đã hết hạn hoặc đã được sử dụng.
              Vui lòng yêu cầu gửi lại email khôi phục.
            </p>

            <button
              type="button"
              onClick={() => router.replace("/admin/login")}
              className="w-full rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-5 py-4 font-bold text-white"
            >
              Quay lại đăng nhập
            </button>
          </div>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                Mật khẩu mới
              </label>
              <input
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu mới"
                className="w-full rounded-xl border border-sky-100 bg-sky-50/50 px-4 py-3.5 text-slate-700 outline-none focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                Xác nhận mật khẩu mới
              </label>
              <input
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Nhập lại mật khẩu mới"
                className="w-full rounded-xl border border-sky-100 bg-sky-50/50 px-4 py-3.5 text-slate-700 outline-none focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-5 py-4 font-extrabold text-white shadow-lg shadow-sky-200 transition hover:from-sky-600 hover:to-blue-700 disabled:opacity-50"
            >
              {loading ? "Đang cập nhật..." : "Xác nhận mật khẩu mới →"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
