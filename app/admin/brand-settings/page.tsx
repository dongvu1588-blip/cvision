
"use client";

import { ChangeEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const BUCKET = "site-assets";
const LOGO_PATH = "brand/logo";

export default function BrandSettingsPage() {
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function initialize() {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (!active) return;

      if (authError || !user) {
        router.replace("/admin/login");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (!active) return;

      if (profileError || profile?.role !== "admin") {
        router.replace("/admin/dashboard");
        return;
      }

      const { data, error } = await supabase
        .from("site_settings")
        .select("logo_url")
        .eq("id", 1)
        .maybeSingle();

      if (!active) return;

      if (error) {
        setErrorMessage("Không tải được logo: " + error.message);
      } else if (data?.logo_url) {
        setPreviewUrl(data.logo_url);
      }

      setChecking(false);
    }

    initialize();

    return () => {
      active = false;
    };
  }, [router]);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    setMessage("");
    setErrorMessage("");

    if (!file) return;

    const allowedTypes = [
      "image/png",
      "image/jpeg",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      setErrorMessage("Vui lòng chọn ảnh PNG, JPG hoặc WebP.");
      event.target.value = "";
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setErrorMessage("Logo không được vượt quá 2 MB.");
      event.target.value = "";
      return;
    }

    setPreviewUrl(URL.createObjectURL(file));
  }

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const input = document.getElementById(
      "brand-logo-file"
    ) as HTMLInputElement | null;

    const file = input?.files?.[0];

    if (!file) {
      setErrorMessage("Bạn hãy chọn ảnh logo mới trước khi lưu.");
      return;
    }

    setSaving(true);
    setMessage("");
    setErrorMessage("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error("Phiên đăng nhập đã hết hạn.");
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profileError || profile?.role !== "admin") {
        throw new Error("Chỉ Admin mới được thay đổi logo.");
      }

      const extension =
        file.name.split(".").pop()?.toLowerCase() || "png";

      const filePath = `${LOGO_PATH}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(filePath, file, {
          upsert: true,
          contentType: file.type,
          cacheControl: "0",
        });

      if (uploadError) throw uploadError;

      const { data: publicData } = supabase.storage
        .from(BUCKET)
        .getPublicUrl(filePath);

      const freshUrl = `${publicData.publicUrl}?v=${Date.now()}`;

      const { error: updateError } = await supabase
        .from("site_settings")
        .upsert(
          {
            id: 1,
            logo_url: freshUrl,
            updated_at: new Date().toISOString(),
            updated_by: user.id,
          },
          { onConflict: "id" }
        );

      if (updateError) throw updateError;

      setPreviewUrl(freshUrl);
      setMessage("Đã cập nhật logo website thành công.");

      if (input) input.value = "";
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Không thể cập nhật logo."
      );
    } finally {
      setSaving(false);
    }
  }

  if (checking) {
    return (
      <main className="min-h-screen bg-sky-50 p-8 text-center text-slate-600">
        Đang kiểm tra quyền quản trị...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-blue-50 p-4 text-slate-800 sm:p-8">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/admin/dashboard"
          className="text-sm font-semibold text-blue-600 hover:underline"
        >
          ← Quay lại Dashboard
        </Link>

        <section className="mt-5 rounded-3xl border border-sky-100 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-xs font-extrabold uppercase tracking-widest text-sky-500">
            CVISION ADMIN
          </p>

          <h1 className="mt-2 text-2xl font-black text-slate-800">
            Cài đặt thương hiệu
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Thay đổi logo website. Chỉ tài khoản Admin mới có quyền cập nhật.
          </p>

          <form onSubmit={handleSave} className="mt-8 space-y-6">
            <div>
              <label className="mb-3 block text-sm font-bold text-slate-700">
                Logo hiện tại / xem trước
              </label>

              <div className="flex min-h-40 items-center justify-center rounded-2xl border border-dashed border-sky-200 bg-sky-50 p-6">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Logo CVISION"
                    className="max-h-36 max-w-full object-contain"
                  />
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-300 to-blue-700 text-2xl font-black text-white">
                      C
                    </div>

                    <span className="text-2xl font-black text-blue-700">
                      CVISION
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label
                htmlFor="brand-logo-file"
                className="mb-2 block text-sm font-bold text-slate-700"
              >
                Chọn logo mới (PNG, JPG hoặc WebP – tối đa 2 MB)
              </label>

              <input
                id="brand-logo-file"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleFileChange}
                className="block w-full rounded-xl border border-sky-100 bg-white p-3 text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-sky-100 file:px-4 file:py-2 file:font-bold file:text-blue-700"
              />
            </div>

            {errorMessage && (
              <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {errorMessage}
              </p>
            )}

            {message && (
              <p className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-xl bg-gradient-to-r from-sky-500 to-blue-700 px-5 py-3 font-bold text-white shadow-lg shadow-blue-100 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Đang lưu logo..." : "Lưu logo mới"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
