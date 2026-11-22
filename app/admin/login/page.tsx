
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (loading) return;

    setLoading(true);

    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    try {
      const loginPromise = supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(
            new Error(
              "Kết nối Supabase quá thời gian chờ. Vui lòng kiểm tra mạng và thử lại."
            )
          );
        }, 15000);
      });

      const { error } = await Promise.race([
        loginPromise,
        timeoutPromise,
      ]);

      if (error) {
        alert("Đăng nhập thất bại: " + error.message);
        return;
      }

      router.replace("/admin/dashboard");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Đã xảy ra lỗi không xác định.";

      alert("Không thể đăng nhập: " + message);
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-sky-50 via-white to-blue-100 p-5">
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-sky-200/50 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-20 h-[500px] w-[500px] rounded-full bg-blue-200/50 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:25px_25px]" />

      <div className="relative z-10 grid w-full max-w-5xl overflow-hidden rounded-[32px] border border-white/80 bg-white/80 shadow-2xl shadow-sky-200/60 backdrop-blur-xl md:grid-cols-2">
        <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-sky-500 via-blue-600 to-blue-800 p-10 text-white md:flex">
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full border-[35px] border-white/10" />
          <div className="pointer-events-none absolute -bottom-28 -left-20 h-80 w-80 rounded-full border-[45px] border-white/10" />
          <div className="pointer-events-none absolute inset-0 opacity-15 [background-image:radial-gradient(#ffffff_1px,transparent_1px)] [background-size:22px_22px]" />

          <div className="relative">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/30 bg-white/15 text-3xl font-black shadow-lg backdrop-blur">
              C
            </div>
            <h1 className="mt-6 text-4xl font-black tracking-tight">
              CVISION
            </h1>
            <p className="mt-2 text-sm font-semibold tracking-[0.25em] text-sky-100">
              CAREER CONNECTION
            </p>
          </div>

          <div className="relative my-12">
            <h2 className="text-3xl font-extrabold leading-tight">
              Quản trị thông minh.
              <span className="block text-sky-200">
                Kết nối nhân tài.
              </span>
            </h2>
            <p className="mt-5 max-w-sm text-sm leading-7 text-blue-100">
              Nền tảng hỗ trợ quản lý tuyển dụng, hồ sơ ứng viên và kết nối
              doanh nghiệp trên một hệ thống thống nhất.
            </p>
          </div>

          <div className="relative flex items-center gap-3 border-t border-white/20 pt-6 text-xs text-blue-100">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15">
              ✦
            </span>
            CVISION © 2026 – Kết nối nhân tài và doanh nghiệp.
          </div>
        </div>

        <div className="flex items-center justify-center p-7 sm:p-10 md:p-12">
          <form onSubmit={handleLogin} className="w-full max-w-md">
            <div className="mb-8 text-center md:text-left">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 text-2xl font-black text-white shadow-lg shadow-sky-200 md:hidden">
                C
              </div>

              <span className="text-xs font-bold uppercase tracking-[0.2em] text-sky-500">
                Admin Portal
              </span>
              <h2 className="mt-3 text-3xl font-black text-slate-800">
                Chào mừng trở lại!
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Đăng nhập để truy cập hệ thống quản trị CVISION.
              </p>
            </div>

            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Nhập email quản trị"
                  autoComplete="username"
                  className="w-full rounded-xl border border-sky-100 bg-sky-50/50 px-4 py-3.5 text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Mật khẩu
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu"
                  autoComplete="current-password"
                  className="w-full rounded-xl border border-sky-100 bg-sky-50/50 px-4 py-3.5 text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-7 w-full rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-5 py-4 font-extrabold text-white shadow-lg shadow-sky-200 transition hover:-translate-y-0.5 hover:from-sky-600 hover:to-blue-700 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Đang đăng nhập..." : "Đăng nhập hệ thống →"}
            </button>

            <p className="mt-7 text-center text-xs leading-5 text-slate-400">
              © 2026 CVISION. Hệ thống quản trị nội bộ.
            </p>
          </form>
        </div>
      </div>
    </main>
  );
}
