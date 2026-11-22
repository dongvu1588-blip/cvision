
"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Application = {
  id: string;
  assigned_to: string | null;
  stage: string;
  candidates: { full_name: string } | null;
  jobs: {
    title: string;
    companies: { name: string } | null;
  } | null;
};

type Interview = {
  id: string;
  application_id: string;
  interview_date: string;
  interview_type: string;
  location: string | null;
  meeting_link: string | null;
  status: string;
  notes: string | null;
  applications: Application | null;
};

export default function InterviewsPage() {
  const router = useRouter();

  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [currentUserId, setCurrentUserId] = useState("");
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  // Chỉ đọc thời gian hiện tại sau khi component được mount trên trình duyệt.
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [error, setError] = useState("");

  // Bộ lọc và tìm kiếm lịch phỏng vấn
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("Tất cả");
  const [dateFilter, setDateFilter] = useState("");
  const [recruiterFilter, setRecruiterFilter] = useState("Tất cả");
  const [staffProfiles, setStaffProfiles] = useState<
    { id: string; full_name: string | null }[]
  >([]);

  // Form tạo lịch
  const [applicationId, setApplicationId] = useState("");
  const [interviewDate, setInterviewDate] = useState("");
  const [interviewType, setInterviewType] = useState("Trực tiếp");
  const [location, setLocation] = useState("");
  const [meetingLink, setMeetingLink] = useState("");
  const [notes, setNotes] = useState("");

  // Form chỉnh sửa
  const [editing, setEditing] = useState<Interview | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editType, setEditType] = useState("Trực tiếp");
  const [editLocation, setEditLocation] = useState("");
  const [editLink, setEditLink] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const isAdmin = role === "admin";

  function toLocalDateTime(value: string) {
    const date = new Date(value);
    const localDate = new Date(
      date.getTime() - date.getTimezoneOffset() * 60000
    );
    return localDate.toISOString().slice(0, 16);
  }

  function formatDate(value: string) {
    return new Date(value).toLocaleString("vi-VN", {
      dateStyle: "short",
      timeStyle: "short",
    });
  }

  async function loadData() {
    setLoading(true);
    setError("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      router.replace("/admin/login");
      return;
    }

    setCurrentUserId(user.id);

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      setError("Không tìm thấy thông tin tài khoản.");
      setLoading(false);
      return;
    }

    setRole(profile.role || "recruiter");

    // Lấy danh sách Recruiter để Admin có thể lọc lịch theo người phụ trách
    if (profile.role === "admin") {
      const { data: staffData, error: staffError } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("role", "recruiter")
        .order("full_name", { ascending: true });

      if (staffError) {
        console.error("Không tải được danh sách Recruiter:", staffError.message);
      }

      setStaffProfiles(staffData || []);
    } else {
      setStaffProfiles([]);
      setRecruiterFilter("Tất cả");
    }

    const { data: applicationData, error: applicationError } =
      await supabase
        .from("applications")
        .select(`
          id,
          assigned_to,
          stage,
          candidates(full_name),
          jobs(title, companies(name))
        `)
        .order("created_at", { ascending: false });

    if (applicationError) {
      setError(applicationError.message);
      setLoading(false);
      return;
    }

    const allApplications =
      (applicationData || []) as unknown as Application[];

    const allowedApplications =
      profile.role === "admin"
        ? allApplications
        : allApplications.filter(
            (item) => item.assigned_to === user.id
          );

    setApplications(allowedApplications);

    const { data: interviewData, error: interviewError } =
      await supabase
        .from("interviews")
        .select(`
          id,
          application_id,
          interview_date,
          interview_type,
          location,
          meeting_link,
          status,
          notes,
          applications(
            id,
            assigned_to,
            stage,
            candidates(full_name),
            jobs(title, companies(name))
          )
        `)
        .order("interview_date", { ascending: true });

    if (interviewError) {
      setError(interviewError.message);
    } else {
      setInterviews(
        (interviewData || []) as unknown as Interview[]
      );
    }

    setLoading(false);
  }

  useEffect(() => {
    setCurrentTime(new Date());
  }, []);

  useEffect(() => {
    loadData();
  }, [router]);

  // Tạo lịch phỏng vấn
  async function createInterview(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!applicationId || !interviewDate) {
      alert("Vui lòng chọn ứng viên và thời gian phỏng vấn.");
      return;
    }

    setSaving(true);

    try {
      const { data: authData } = await supabase.auth.getUser();

      if (!authData.user) {
        throw new Error("Phiên đăng nhập đã hết hạn.");
      }

      const { error: insertError } = await supabase
        .from("interviews")
        .insert({
          application_id: applicationId,
          interview_date: new Date(interviewDate).toISOString(),
          interview_type: interviewType,
          location: location.trim() || null,
          meeting_link: meetingLink.trim() || null,
          notes: notes.trim() || null,
          status: "Sắp diễn ra",
          created_by: authData.user.id,
        });

      if (insertError) throw insertError;

      alert("Tạo lịch phỏng vấn thành công!");

      setApplicationId("");
      setInterviewDate("");
      setInterviewType("Trực tiếp");
      setLocation("");
      setMeetingLink("");
      setNotes("");

      await loadData();
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : "Không tạo được lịch phỏng vấn."
      );
    } finally {
      setSaving(false);
    }
  }

  // Mở form chỉnh sửa
  function openEdit(item: Interview) {
    setEditing(item);
    setEditDate(toLocalDateTime(item.interview_date));
    setEditType(item.interview_type || "Trực tiếp");
    setEditLocation(item.location || "");
    setEditLink(item.meeting_link || "");
    setEditNotes(item.notes || "");
  }

  // Lưu chỉnh sửa
  async function saveEdit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!editing || !editDate) {
      alert("Vui lòng nhập thời gian phỏng vấn.");
      return;
    }

    setSaving(true);

    try {
      const { error: updateError } = await supabase
        .from("interviews")
        .update({
          interview_date: new Date(editDate).toISOString(),
          interview_type: editType,
          location: editLocation.trim() || null,
          meeting_link: editLink.trim() || null,
          notes: editNotes.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editing.id);

      if (updateError) throw updateError;

      alert("Cập nhật lịch phỏng vấn thành công!");
      setEditing(null);
      await loadData();
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : "Không cập nhật được lịch phỏng vấn."
      );
    } finally {
      setSaving(false);
    }
  }

  // Cập nhật trạng thái
  async function updateStatus(id: string, status: string) {
    const { error: updateError } = await supabase
      .from("interviews")
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (updateError) {
      alert("Không cập nhật được: " + updateError.message);
      return;
    }

    await loadData();
  }

  // Xóa lịch - chỉ Admin
  async function deleteInterview(id: string) {
    if (!isAdmin) return;

    const confirmed = window.confirm(
      "Bạn có chắc chắn muốn xóa lịch phỏng vấn này không?"
    );

    if (!confirmed) return;

    const { error: deleteError } = await supabase
      .from("interviews")
      .delete()
      .eq("id", id);

    if (deleteError) {
      alert("Không xóa được: " + deleteError.message);
      return;
    }

    alert("Đã xóa lịch phỏng vấn.");
    await loadData();
  }

  // Recruiter chỉ thấy lịch thuộc hồ sơ được phân công; Admin thấy toàn bộ
  const visibleInterviews = interviews.filter((item) => {
    if (isAdmin) return true;
    return item.applications?.assigned_to === currentUserId;
  });

  // Áp dụng tìm kiếm và các bộ lọc
  const filteredInterviews = visibleInterviews.filter((item) => {
    const keyword = searchTerm.trim().toLocaleLowerCase("vi-VN");

    const candidateName =
      item.applications?.candidates?.full_name?.toLocaleLowerCase("vi-VN") || "";
    const jobTitle =
      item.applications?.jobs?.title?.toLocaleLowerCase("vi-VN") || "";
    const companyName =
      item.applications?.jobs?.companies?.name?.toLocaleLowerCase("vi-VN") || "";

    const matchesSearch =
      !keyword ||
      candidateName.includes(keyword) ||
      jobTitle.includes(keyword) ||
      companyName.includes(keyword);

    const matchesStatus =
      statusFilter === "Tất cả" || item.status === statusFilter;

    const date = new Date(item.interview_date);
    const interviewLocalDate = [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0"),
    ].join("-");
    const matchesDate = !dateFilter || interviewLocalDate === dateFilter;

    const matchesRecruiter =
      !isAdmin ||
      recruiterFilter === "Tất cả" ||
      item.applications?.assigned_to === recruiterFilter;

    return matchesSearch && matchesStatus && matchesDate && matchesRecruiter;
  });

  const upcomingCount = visibleInterviews.filter(
    (item) => item.status === "Sắp diễn ra"
  ).length;

  const completedCount = visibleInterviews.filter(
    (item) => item.status === "Đã hoàn thành"
  ).length;

  const cancelledCount = visibleInterviews.filter(
    (item) => item.status === "Đã hủy"
  ).length;

  // Nhắc lịch: tính toán sau khi component mount để tránh dùng thời gian hiện tại khi prerender.
  const now = currentTime;
  const startOfToday = now
    ? new Date(now.getFullYear(), now.getMonth(), now.getDate())
    : null;
  const startOfTomorrow = now
    ? new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
    : null;
  const endOfNextSevenDays = now
    ? new Date(now.getFullYear(), now.getMonth(), now.getDate() + 8)
    : null;

  const pendingInterviews = visibleInterviews.filter(
    (item) => item.status === "Sắp diễn ra"
  );

  const overdueInterviews = now
    ? pendingInterviews
        .filter((item) => new Date(item.interview_date) < now)
        .sort(
          (a, b) =>
            new Date(a.interview_date).getTime() -
            new Date(b.interview_date).getTime()
        )
    : [];

  const todayInterviews =
    startOfToday && startOfTomorrow
      ? pendingInterviews
          .filter((item) => {
            const date = new Date(item.interview_date);
            return date >= startOfToday && date < startOfTomorrow;
          })
          .sort(
            (a, b) =>
              new Date(a.interview_date).getTime() -
              new Date(b.interview_date).getTime()
          )
      : [];

  const upcomingWeekInterviews =
    startOfTomorrow && endOfNextSevenDays
      ? pendingInterviews
          .filter((item) => {
            const date = new Date(item.interview_date);
            return date >= startOfTomorrow && date < endOfNextSevenDays;
          })
          .sort(
            (a, b) =>
              new Date(a.interview_date).getTime() -
              new Date(b.interview_date).getTime()
          )
      : [];

  function getInterviewCandidateName(item: Interview) {
    return item.applications?.candidates?.full_name || "Chưa có tên";
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-sky-50 via-white to-blue-50 p-5 text-slate-800 md:p-8">
      <div className="pointer-events-none absolute -left-24 top-24 h-72 w-72 rounded-full bg-sky-200/30 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 top-[28rem] h-80 w-80 rounded-full bg-blue-200/30 blur-3xl" />
      <div className="relative z-10 mx-auto max-w-7xl">

        {/* Tiêu đề */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <a
              href="/admin/dashboard"
              className="text-sm font-semibold text-sky-700"
            >
              ← Quay lại Dashboard
            </a>

            <h1 className="mt-4 text-3xl font-extrabold">
              Quản lý lịch phỏng vấn
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Theo dõi và quản lý lịch phỏng vấn ứng viên CVISION.
            </p>
          </div>

          <button
            onClick={loadData}
            className="rounded-xl border bg-white px-4 py-3 text-sm font-semibold hover:bg-slate-50"
          >
            Làm mới dữ liệu
          </button>
        </div>

        <div className="mb-6 rounded-xl border border-sky-100 bg-sky-50 p-4">
          <p className="text-sm font-semibold text-sky-800">
            {isAdmin
              ? "Admin: Xem và quản lý toàn bộ lịch phỏng vấn."
              : "Recruiter: Quản lý lịch phỏng vấn của hồ sơ được phân công."}
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Cảnh báo và nhắc lịch phỏng vấn */}
        <section className="mb-8">
          <div className="mb-4">
            <h2 className="text-xl font-bold">Nhắc lịch phỏng vấn</h2>
            <p className="mt-1 text-sm text-slate-500">
              Các cảnh báo được tính theo giờ địa phương trên thiết bị của bạn.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold text-red-800">Quá hạn cập nhật</p>
                <span className="rounded-full bg-red-100 px-3 py-1 text-lg font-bold text-red-700">
                  {loading ? "..." : overdueInterviews.length}
                </span>
              </div>
              {overdueInterviews.length === 0 ? (
                <p className="mt-3 text-sm text-red-700">
                  Không có lịch quá hạn.
                </p>
              ) : (
                <ul className="mt-3 space-y-3">
                  {overdueInterviews.slice(0, 4).map((item) => (
                    <li key={item.id} className="border-t border-red-200 pt-2">
                      <p className="text-sm font-semibold text-slate-800">
                        {getInterviewCandidateName(item)}
                      </p>
                      <p className="text-xs text-red-700">
                        {formatDate(item.interview_date)} · Chưa cập nhật trạng thái
                      </p>
                    </li>
                  ))}
                </ul>
              )}
              {overdueInterviews.length > 4 && (
                <p className="mt-2 text-xs text-red-700">
                  Còn {overdueInterviews.length - 4} lịch quá hạn khác.
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold text-amber-800">Phỏng vấn hôm nay</p>
                <span className="rounded-full bg-amber-100 px-3 py-1 text-lg font-bold text-amber-700">
                  {loading ? "..." : todayInterviews.length}
                </span>
              </div>
              {todayInterviews.length === 0 ? (
                <p className="mt-3 text-sm text-amber-800">
                  Không có lịch phỏng vấn hôm nay.
                </p>
              ) : (
                <ul className="mt-3 space-y-3">
                  {todayInterviews.slice(0, 4).map((item) => (
                    <li key={item.id} className="border-t border-amber-200 pt-2">
                      <p className="text-sm font-semibold text-slate-800">
                        {getInterviewCandidateName(item)}
                      </p>
                      <p className="text-xs text-amber-800">
                        {formatDate(item.interview_date)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
              {todayInterviews.length > 4 && (
                <p className="mt-2 text-xs text-amber-800">
                  Còn {todayInterviews.length - 4} lịch hôm nay khác.
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold text-blue-800">Trong 7 ngày tới</p>
                <span className="rounded-full bg-blue-100 px-3 py-1 text-lg font-bold text-blue-700">
                  {loading ? "..." : upcomingWeekInterviews.length}
                </span>
              </div>
              {upcomingWeekInterviews.length === 0 ? (
                <p className="mt-3 text-sm text-blue-800">
                  Chưa có lịch trong 7 ngày tới.
                </p>
              ) : (
                <ul className="mt-3 space-y-3">
                  {upcomingWeekInterviews.slice(0, 4).map((item) => (
                    <li key={item.id} className="border-t border-blue-200 pt-2">
                      <p className="text-sm font-semibold text-slate-800">
                        {getInterviewCandidateName(item)}
                      </p>
                      <p className="text-xs text-blue-800">
                        {formatDate(item.interview_date)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
              {upcomingWeekInterviews.length > 4 && (
                <p className="mt-2 text-xs text-blue-800">
                  Còn {upcomingWeekInterviews.length - 4} lịch khác trong 7 ngày tới.
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Thống kê */}
        <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Sắp diễn ra</p>
            <p className="mt-2 text-3xl font-extrabold text-blue-600">
              {loading ? "..." : upcomingCount}
            </p>
          </div>

          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Đã hoàn thành</p>
            <p className="mt-2 text-3xl font-extrabold text-sky-600">
              {loading ? "..." : completedCount}
            </p>
          </div>

          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Đã hủy</p>
            <p className="mt-2 text-3xl font-extrabold text-red-600">
              {loading ? "..." : cancelledCount}
            </p>
          </div>
        </section>

        {/* Form tạo lịch */}
        <section className="mb-8 rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-xl font-bold">
            + Tạo lịch phỏng vấn mới
          </h2>

          <form onSubmit={createInterview} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium">
                Ứng viên và vị trí tuyển dụng
              </label>

              <select
                required
                value={applicationId}
                onChange={(e) => setApplicationId(e.target.value)}
                className="w-full rounded-lg border bg-white p-3"
              >
                <option value="">-- Chọn hồ sơ ứng tuyển --</option>

                {applications.map((application) => (
                  <option key={application.id} value={application.id}>
                    {application.candidates?.full_name || "Chưa có tên"}
                    {" — "}
                    {application.jobs?.title || "Chưa có vị trí"}
                    {" — "}
                    {application.jobs?.companies?.name || "Chưa có công ty"}
                  </option>
                ))}
              </select>

              {applications.length === 0 && !loading && (
                <p className="mt-2 text-xs text-amber-600">
                  Chưa có hồ sơ được phân công để tạo lịch phỏng vấn.
                </p>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Ngày và giờ phỏng vấn
                </label>
                <input
                  required
                  type="datetime-local"
                  value={interviewDate}
                  onChange={(e) => setInterviewDate(e.target.value)}
                  className="w-full rounded-lg border p-3"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Hình thức phỏng vấn
                </label>
                <select
                  value={interviewType}
                  onChange={(e) => setInterviewType(e.target.value)}
                  className="w-full rounded-lg border bg-white p-3"
                >
                  <option value="Trực tiếp">Trực tiếp</option>
                  <option value="Online">Online</option>
                  <option value="Qua điện thoại">Qua điện thoại</option>
                </select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Địa điểm phỏng vấn
                </label>
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Ví dụ: Văn phòng công ty..."
                  className="w-full rounded-lg border p-3"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Link phỏng vấn online
                </label>
                <input
                  value={meetingLink}
                  onChange={(e) => setMeetingLink(e.target.value)}
                  placeholder="https://meet.google.com/..."
                  className="w-full rounded-lg border p-3"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Ghi chú
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Nội dung cần chuẩn bị, người phỏng vấn..."
                className="w-full rounded-lg border p-3"
              />
            </div>

            <button
              type="submit"
              disabled={saving || applications.length === 0}
              className="rounded-lg bg-sky-700 px-6 py-3 font-semibold text-white hover:bg-sky-800 disabled:opacity-50"
            >
              {saving ? "Đang lưu..." : "Tạo lịch phỏng vấn"}
            </button>
          </form>
        </section>

        {/* Danh sách lịch */}
        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-bold">
              Danh sách lịch phỏng vấn ({filteredInterviews.length})
            </h2>
            <span className="text-sm text-slate-500">
              Tổng số lịch: {visibleInterviews.length}
            </span>
          </div>

          {/* Tìm kiếm và bộ lọc */}
          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm ứng viên, vị trí, công ty..."
              className="w-full rounded-lg border p-3 text-sm outline-none focus:border-sky-600 focus:ring-1 focus:ring-sky-600"
            />

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-lg border bg-white p-3 text-sm"
            >
              <option value="Tất cả">Tất cả trạng thái</option>
              <option value="Sắp diễn ra">Sắp diễn ra</option>
              <option value="Đã hoàn thành">Đã hoàn thành</option>
              <option value="Đã hủy">Đã hủy</option>
            </select>

            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              aria-label="Lọc theo ngày phỏng vấn"
              className="w-full rounded-lg border p-3 text-sm"
            />

            {isAdmin ? (
              <select
                value={recruiterFilter}
                onChange={(e) => setRecruiterFilter(e.target.value)}
                className="w-full rounded-lg border bg-white p-3 text-sm"
              >
                <option value="Tất cả">Tất cả Recruiter</option>
                {staffProfiles.map((staff) => (
                  <option key={staff.id} value={staff.id}>
                    {staff.full_name || "Recruiter chưa có tên"}
                  </option>
                ))}
              </select>
            ) : (
              <div className="flex items-center rounded-lg border bg-slate-50 px-3 py-2 text-sm text-slate-500">
                Chỉ hiển thị lịch được phân công cho bạn
              </div>
            )}
          </div>

          <div className="mb-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setSearchTerm("");
                setStatusFilter("Tất cả");
                setDateFilter("");
                setRecruiterFilter("Tất cả");
              }}
              className="rounded-lg border px-4 py-2 text-sm font-semibold hover:bg-slate-50"
            >
              Xóa bộ lọc
            </button>
            <span className="text-xs text-slate-500">
              Kết quả phù hợp: {filteredInterviews.length} / {visibleInterviews.length} lịch
            </span>
          </div>

          {loading ? (
            <p className="py-8 text-center text-slate-400">
              Đang tải lịch phỏng vấn...
            </p>
          ) : visibleInterviews.length === 0 ? (
            <p className="py-8 text-center text-slate-400">
              Chưa có lịch phỏng vấn nào.
            </p>
          ) : filteredInterviews.length === 0 ? (
            <p className="py-8 text-center text-slate-400">
              Không tìm thấy lịch phỏng vấn phù hợp. Hãy thử thay đổi hoặc xóa bộ lọc.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] text-left text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="p-3">Ứng viên</th>
                    <th className="p-3">Vị trí</th>
                    <th className="p-3">Thời gian</th>
                    <th className="p-3">Hình thức</th>
                    <th className="p-3">Địa điểm / Link</th>
                    <th className="p-3">Trạng thái</th>
                    <th className="p-3">Thao tác</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredInterviews.map((item) => (
                    <tr key={item.id} className="border-b align-top">
                      <td className="p-3 font-semibold">
                        {item.applications?.candidates?.full_name || "Chưa có tên"}
                      </td>

                      <td className="p-3">
                        <p>{item.applications?.jobs?.title || "Chưa có vị trí"}</p>
                        <p className="mt-1 text-xs text-slate-400">
                          {item.applications?.jobs?.companies?.name || ""}
                        </p>
                      </td>

                      <td className="p-3 whitespace-nowrap">
                        {formatDate(item.interview_date)}
                      </td>

                      <td className="p-3">{item.interview_type}</td>

                      <td className="p-3">
                        {item.location && <p>{item.location}</p>}
                        {item.meeting_link && (
                          <a
                            href={item.meeting_link}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-1 block text-sky-700 underline"
                          >
                            Mở link phỏng vấn
                          </a>
                        )}
                        {!item.location && !item.meeting_link && "—"}
                      </td>

                      <td className="p-3">
                        <select
                          value={item.status}
                          onChange={(e) =>
                            updateStatus(item.id, e.target.value)
                          }
                          className="rounded-lg border bg-white p-2 text-xs"
                        >
                          <option value="Sắp diễn ra">Sắp diễn ra</option>
                          <option value="Đã hoàn thành">Đã hoàn thành</option>
                          <option value="Đã hủy">Đã hủy</option>
                        </select>

                        {item.notes && (
                          <p className="mt-2 max-w-48 text-xs text-slate-400">
                            {item.notes}
                          </p>
                        )}
                      </td>

                      <td className="p-3">
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => openEdit(item)}
                            className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                          >
                            Chỉnh sửa
                          </button>

                          {isAdmin && (
                            <button
                              onClick={() => deleteInterview(item.id)}
                              className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-100"
                            >
                              Xóa
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Form chỉnh sửa */}
        {editing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
            <div className="my-auto w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-xl font-bold">
                  Chỉnh sửa lịch phỏng vấn
                </h2>
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="text-2xl text-slate-400 hover:text-slate-700"
                >
                  ×
                </button>
              </div>

              <p className="mb-4 text-sm text-slate-500">
                Ứng viên:{" "}
                <strong>
                  {editing.applications?.candidates?.full_name || "Chưa có tên"}
                </strong>
              </p>

              <form onSubmit={saveEdit} className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Ngày và giờ phỏng vấn
                  </label>
                  <input
                    required
                    type="datetime-local"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full rounded-lg border p-3"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Hình thức phỏng vấn
                  </label>
                  <select
                    value={editType}
                    onChange={(e) => setEditType(e.target.value)}
                    className="w-full rounded-lg border p-3"
                  >
                    <option value="Trực tiếp">Trực tiếp</option>
                    <option value="Online">Online</option>
                    <option value="Qua điện thoại">Qua điện thoại</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Địa điểm
                  </label>
                  <input
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    className="w-full rounded-lg border p-3"
                    placeholder="Địa điểm phỏng vấn"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Link phỏng vấn online
                  </label>
                  <input
                    value={editLink}
                    onChange={(e) => setEditLink(e.target.value)}
                    className="w-full rounded-lg border p-3"
                    placeholder="https://meet.google.com/..."
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Ghi chú
                  </label>
                  <textarea
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    rows={3}
                    className="w-full rounded-lg border p-3"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditing(null)}
                    className="rounded-lg border px-5 py-3 font-semibold"
                  >
                    Hủy
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-lg bg-sky-700 px-5 py-3 font-semibold text-white hover:bg-sky-800 disabled:opacity-50"
                  >
                    {saving ? "Đang lưu..." : "Lưu thay đổi"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <p className="mt-8 text-center text-xs text-slate-400">
          CVISION Interview Management © 2026
        </p>
      </div>
    </main>
  );
}
