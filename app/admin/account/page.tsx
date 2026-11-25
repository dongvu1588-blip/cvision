
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
  const [originalEmail, setOriginalEmail] = useState("");

  const [phone, setPhone] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [address, setAddress] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState("");

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
      setOriginalEmail(user.email || "");

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select(
          "id, full_name, role, phone, birth_date, address, avatar_url"
        )
        .eq("id", user.id)
        .single();

      if (profileError || !profile) {
        alert(
          "Không thể tải thông tin tài khoản. Hãy kiểm tra các cột mới trong bảng profiles."
        );
        setLoading(false);
        return;
      }

      setFullName(profile.full_name || "");
      setRole(profile.role || "recruiter");
      setPhone(profile.phone || "");
      setBirthDate(profile.birth_date || "");
      setAddress(profile.address || "");
      setAvatarUrl(profile.avatar_url || "");

      setLoading(false);
    }

    loadAccount();
  }, [router]);

  useEffect(() => {
    if (!avatarFile) {
      setAvatarPreview("");
      return;
    }

    const previewUrl = URL.createObjectURL(avatarFile);
    setAvatarPreview(previewUrl);

    return () => URL.revokeObjectURL(previewUrl);
  }, [avatarFile]);

  function handleAvatarChange(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Vui lòng chọn file ảnh.");
      e.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Ảnh đại diện không được vượt quá 5MB.");
      e.target.value = "";
      return;
    }

    setAvatarFile(file);
  }

  async function saveAccount(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!userId || saving) return;

    if (!fullName.trim()) {
      alert("Vui lòng nhập họ và tên.");
      return;
    }

    if (newPassword && newPassword.length < 6) {
      alert("Mật khẩu mới phải có ít nhất 6 ký tự.");
      return;
    }

    if (newPassword !== confirmPassword) {
      alert("Mật khẩu xác nhận không khớp.");
      return;
    }

    if (email.trim() && email.trim() !== originalEmail) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        alert("Email không hợp lệ.");
        return;
      }
    }

    setSaving(true);

    try {
      let updatedAvatarUrl = avatarUrl;

      // Tải ảnh đại diện lên Supabase Storage
      if (avatarFile) {
        const fileExtension =
          avatarFile.name.split(".").pop()?.toLowerCase() || "jpg";

        const filePath = `${userId}/${Date.now()}.${fileExtension}`;

        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(filePath, avatarFile, {
            upsert: true,
            contentType: avatarFile.type,
          });

        if (uploadError) {
          throw new Error(
            "Không thể tải ảnh đại diện: " + uploadError.message
          );
        }

        const { data: publicUrlData } = supabase.storage
          .from("avatars")
          .getPublicUrl(filePath);

        updatedAvatarUrl = publicUrlData.publicUrl;
      }

      // Cập nhật thông tin cá nhân
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim(),
          phone: phone.trim(),
          birth_date: birthDate || null,
          address: address.trim(),
          avatar_url: updatedAvatarUrl,
        })
        .eq("id", userId);

      if (profileError) {
        throw new Error(
          "Không thể cập nhật thông tin: " + profileError.message
        );
      }

      setAvatarUrl(updatedAvatarUrl);
      setAvatarFile(null);

      // Thay đổi email đăng nhập
      let emailMessage = "";

      if (email.trim() && email.trim() !== originalEmail) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: email.trim(),
        });

        if (emailError) {
          throw new Error(
            "Thông tin cá nhân đã lưu, nhưng không thể yêu cầu đổi email: " +
              emailError.message
          );
        }

        emailMessage =
          " Yêu cầu đổi email đã được gửi. Hãy kiểm tra hộp thư mới để xác nhận.";
      }

      // Đổi mật khẩu nếu người dùng nhập mật khẩu mới
      if (newPassword) {
        const { error: passwordError } = await supabase.auth.updateUser({
          password: newPassword,
        });

        if (passwordError) {
          throw new Error(
            "Thông tin cá nhân đã lưu, nhưng không thể đổi mật khẩu: " +
              passwordError.message
          );
        }
      }

      if (email.trim() === originalEmail) {
        setEmail(originalEmail);
      }

      setNewPassword("");
      setConfirmPassword("");

      alert("Đã cập nhật tài khoản thành công!" + emailMessage);

      // Tải lại thông tin tài khoản sau khi lưu
      if (!emailMessage) {
        const { data: refreshedUser } = await supabase.auth.getUser();
        setEmail(refreshedUser.user?.email || originalEmail);
        setOriginalEmail(refreshedUser.user?.email || originalEmail);
      }
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

            <div className="space-y-5">
              {/* Ảnh đại diện */}
              <div>
                <label className="mb-3 block text-sm font-semibold text-slate-700">
                  Ảnh đại diện
                </label>

                <div className="flex flex-wrap items-center gap-5">
                  <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100">
                    {avatarPreview || avatarUrl ? (
                      <img
                        src={avatarPreview || avatarUrl}
                        alt="Ảnh đại diện"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-3xl font-bold text-slate-400">
                        {fullName.charAt(0).toUpperCase() || "U"}
                      </span>
                    )}
                  </div>

                  <div>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handleAvatarChange}
                      className="block w-full max-w-xs text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-sky-50 file:px-4 file:py-2 file:font-semibold file:text-sky-700 hover:file:bg-sky-100"
                    />
                    <p className="mt-2 text-xs text-slate-400">
                      PNG, JPG hoặc WEBP. Tối đa 5MB.
                    </p>

                    {avatarFile && (
                      <button
                        type="button"
                        onClick={() => setAvatarFile(null)}
                        className="mt-2 text-xs font-semibold text-red-500 hover:text-red-700"
                      >
                        Hủy ảnh đã chọn
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Họ và tên */}
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

              {/* Số điện thoại */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Số điện thoại
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-sky-500"
                  placeholder="Nhập số điện thoại"
                />
              </div>

              {/* Email */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Email đăng nhập
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-sky-500"
                  placeholder="Nhập email"
                />
                <p className="mt-1 text-xs text-slate-400">
                  Nếu thay đổi email, Supabase có thể yêu cầu xác nhận qua email mới.
                </p>
              </div>

              {/* Ngày sinh */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Ngày sinh
                </label>
                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-sky-500"
                />
              </div>

              {/* Địa chỉ */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Địa chỉ
                </label>
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-sky-500"
                  placeholder="Nhập địa chỉ của bạn"
                />
              </div>

              {/* Chức vụ */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Chức vụ
                </label>
                <input
                  value={
                    role === "admin"
                      ? "Admin"
                      : "Nhân viên tuyển dụng"
                  }
                  readOnly
                  className="w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-slate-500"
                />
                <p className="mt-1 text-xs text-slate-400">
                  Chức vụ được quản lý bởi Admin.
                </p>
              </div>
            </div>
          </section>

          {/* Đổi mật khẩu */}
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
