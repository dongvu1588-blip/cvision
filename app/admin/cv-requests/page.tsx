"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type CVRequest = {
  id: string;
  full_name: string;
  date_of_birth: string | null;
  phone: string;
  email: string | null;
  address: string | null;
  photo_url: string | null;
  work_experience: string | null;
  skills: string | null;
  languages: string | null;
  interests: string | null;
  career_objective: string | null;
  education: string | null;
  certificates: string | null;
  awards: string | null;
  referee: string | null;
  consent_to_share: boolean | null;
  service_type: string | null;
  description: string | null;
  status: string;
  created_at: string;
};

const statuses = [
  "Mới tiếp nhận",
  "Đang liên hệ",
  "Đang xử lý",
  "Hoàn thành",
  "Đã hủy",
];

function formatDate(value: string | null | undefined) {
  if (!value) return "Chưa cung cấp";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("vi-VN");
}

function DetailField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-800">
        {value?.trim() ? value : "Chưa cung cấp"}
      </p>
    </div>
  );
}

export default function CVRequestsPage() {
  const [requests, setRequests] = useState<CVRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedRequest, setSelectedRequest] = useState<CVRequest | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoLoading, setPhotoLoading] = useState(false);

  async function loadRequests() {
    setLoading(true);

    const { data, error } = await supabase
      .from("cv_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      alert("Không tải được yêu cầu CV: " + error.message);
    } else {
      setRequests((data || []) as CVRequest[]);
    }

    setLoading(false);
  }

  async function openDetails(request: CVRequest) {
    setSelectedRequest(request);
    setPhotoUrl(null);

    if (!request.photo_url) return;

    setPhotoLoading(true);
    const { data, error } = await supabase.storage
      .from("candidate-cvs")
      .createSignedUrl(request.photo_url, 60 * 60);

    if (error) {
      console.error("Không tạo được đường dẫn ảnh CV:", error.message);
    } else {
      setPhotoUrl(data.signedUrl);
    }
    setPhotoLoading(false);
  }

  async function updateStatus(id: string, newStatus: string) {
    const { error } = await supabase
      .from("cv_requests")
      .update({ status: newStatus })
      .eq("id", id);

    if (error) {
      alert("Không cập nhật được trạng thái: " + error.message);
      return;
    }

    if (selectedRequest?.id === id) {
      setSelectedRequest({ ...selectedRequest, status: newStatus });
    }
    await loadRequests();
  }

  useEffect(() => {
    loadRequests();
  }, []);

  const filteredRequests = requests.filter((request) =>
    `${request.full_name} ${request.phone} ${request.email || ""} ${request.service_type || ""}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const statusColor = (status: string) => {
    switch (status) {
      case "Hoàn thành":
        return "bg-green-100 text-green-700";
      case "Đang xử lý":
        return "bg-blue-100 text-blue-700";
      case "Đang liên hệ":
        return "bg-amber-100 text-amber-700";
      case "Đã hủy":
        return "bg-red-100 text-red-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 p-5 text-slate-800 md:p-8">
      <div className="mx-auto max-w-7xl">
        <a href="/admin/dashboard" className="text-sm font-medium text-emerald-700">
          ← Quay lại Dashboard
        </a>

        <div className="mb-8 mt-4">
          <h1 className="text-3xl font-extrabold">Quản lý dịch vụ CV</h1>
          <p className="mt-2 text-sm text-slate-500">
            Tiếp nhận và theo dõi yêu cầu dịch vụ từ khách hàng.
          </p>
        </div>

        <section className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            { title: "Tổng yêu cầu", value: requests.length },
            { title: "Mới tiếp nhận", value: requests.filter((r) => r.status === "Mới tiếp nhận").length },
            { title: "Đang xử lý", value: requests.filter((r) => r.status === "Đang xử lý").length },
            { title: "Hoàn thành", value: requests.filter((r) => r.status === "Hoàn thành").length },
          ].map((item) => (
            <div key={item.title} className="rounded-xl border bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">{item.title}</p>
              <p className="mt-3 text-3xl font-extrabold text-emerald-700">
                {loading ? "..." : item.value}
              </p>
            </div>
          ))}
        </section>

        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-xl font-bold">Danh sách yêu cầu ({filteredRequests.length})</h2>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm tên, số điện thoại, email..."
              className="w-full rounded-lg border p-3 md:w-80"
            />
          </div>

          {loading ? (
            <p className="py-8 text-center text-slate-400">Đang tải dữ liệu...</p>
          ) : filteredRequests.length === 0 ? (
            <p className="py-8 text-center text-slate-400">Chưa có yêu cầu dịch vụ CV nào.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="p-3">Khách hàng</th>
                    <th className="p-3">Liên hệ</th>
                    <th className="p-3">Dịch vụ</th>
                    <th className="p-3">Ngày gửi</th>
                    <th className="p-3">Trạng thái</th>
                    <th className="p-3">Chi tiết</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRequests.map((request) => (
                    <tr key={request.id} className="border-b hover:bg-slate-50">
                      <td className="p-3 font-semibold">{request.full_name}</td>
                      <td className="p-3">
                        <p>{request.phone}</p>
                        <p className="text-xs text-slate-400">{request.email || "Không có email"}</p>
                      </td>
                      <td className="p-3">{request.service_type || "Khác"}</td>
                      <td className="p-3">{formatDate(request.created_at)}</td>
                      <td className="p-3">
                        <select
                          value={request.status}
                          onChange={(e) => updateStatus(request.id, e.target.value)}
                          className={`rounded-lg border-0 p-2 text-xs font-semibold ${statusColor(request.status)}`}
                        >
                          {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
                        </select>
                      </td>
                      <td className="p-3">
                        <button
                          onClick={() => openDetails(request)}
                          className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                        >
                          Xem chi tiết
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {selectedRequest && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 md:p-6"
            onClick={() => setSelectedRequest(null)}
          >
            <div
              className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b px-6 py-5">
                <div>
                  <h2 className="text-xl font-extrabold">Chi tiết hồ sơ khách hàng</h2>
                  <p className="mt-1 text-sm text-slate-500">{selectedRequest.full_name}</p>
                </div>
                <button
                  onClick={() => setSelectedRequest(null)}
                  aria-label="Đóng chi tiết"
                  className="rounded-lg px-3 py-2 text-xl text-slate-400 hover:bg-slate-100"
                >
                  ✕
                </button>
              </div>

              <div className="overflow-y-auto p-5 md:p-7">
                <section className="mb-7">
                  <h3 className="mb-4 text-base font-bold text-emerald-800">1. Ảnh hồ sơ</h3>
                  {photoLoading ? (
                    <p className="text-sm text-slate-500">Đang tải ảnh...</p>
                  ) : photoUrl ? (
                    <a href={photoUrl} target="_blank" rel="noreferrer" className="inline-block">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photoUrl} alt={`Ảnh hồ sơ ${selectedRequest.full_name}`} className="max-h-72 rounded-xl border object-contain" />
                      <span className="mt-2 block text-xs font-semibold text-emerald-700">Mở ảnh kích thước đầy đủ</span>
                    </a>
                  ) : (
                    <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                      {selectedRequest.photo_url ? "Không tải được ảnh. Hãy kiểm tra quyền truy cập bucket candidate-cvs." : "Khách hàng chưa tải ảnh lên."}
                    </p>
                  )}
                </section>

                <section className="mb-7">
                  <h3 className="mb-4 text-base font-bold text-emerald-800">2. Thông tin cá nhân</h3>
                  <div className="grid gap-3 md:grid-cols-2">
                    <DetailField label="Họ và tên" value={selectedRequest.full_name} />
                    <DetailField label="Ngày sinh" value={formatDate(selectedRequest.date_of_birth)} />
                    <DetailField label="Số điện thoại" value={selectedRequest.phone} />
                    <DetailField label="Email" value={selectedRequest.email} />
                    <div className="md:col-span-2"><DetailField label="Địa chỉ hiện tại" value={selectedRequest.address} /></div>
                  </div>
                </section>

                <section className="mb-7">
                  <h3 className="mb-4 text-base font-bold text-emerald-800">3. Nội dung hồ sơ CV</h3>
                  <div className="grid gap-3">
                    <DetailField label="Kinh nghiệm làm việc" value={selectedRequest.work_experience} />
                    <DetailField label="Kỹ năng" value={selectedRequest.skills} />
                    <DetailField label="Ngoại ngữ" value={selectedRequest.languages} />
                    <DetailField label="Sở thích" value={selectedRequest.interests} />
                    <DetailField label="Mục tiêu nghề nghiệp" value={selectedRequest.career_objective} />
                    <DetailField label="Học vấn" value={selectedRequest.education} />
                    <DetailField label="Chứng chỉ" value={selectedRequest.certificates} />
                    <DetailField label="Giải thưởng" value={selectedRequest.awards} />
                    <DetailField label="Người tham chiếu" value={selectedRequest.referee} />
                  </div>
                </section>

                <section className="mb-7">
                  <h3 className="mb-4 text-base font-bold text-emerald-800">4. Thông tin dịch vụ</h3>
                  <div className="grid gap-3 md:grid-cols-2">
                    <DetailField label="Gói dịch vụ đã chọn" value={selectedRequest.service_type} />
                    <DetailField label="Ngày gửi yêu cầu" value={new Date(selectedRequest.created_at).toLocaleString("vi-VN")} />
                    <div className="md:col-span-2"><DetailField label="Mô tả gói và yêu cầu bổ sung" value={selectedRequest.description} /></div>
                    <div className="md:col-span-2">
                      <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Đồng ý chia sẻ CV với doanh nghiệp/nhà tuyển dụng</p>
                        <p className={`text-sm font-bold ${selectedRequest.consent_to_share ? "text-emerald-700" : "text-amber-700"}`}>
                          {selectedRequest.consent_to_share ? "Có đồng ý chia sẻ" : "Không đồng ý / Chưa xác nhận"}
                        </p>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="mb-2">
                  <h3 className="mb-4 text-base font-bold text-emerald-800">5. Theo dõi xử lý</h3>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                      <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">Trạng thái yêu cầu</label>
                      <select
                        value={selectedRequest.status}
                        onChange={(e) => updateStatus(selectedRequest.id, e.target.value)}
                        className={`w-full rounded-lg border-0 p-3 text-sm font-semibold ${statusColor(selectedRequest.status)}`}
                      >
                        {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
                      </select>
                    </div>
                    <DetailField label="Mã yêu cầu" value={selectedRequest.id} />
                  </div>
                </section>
              </div>

              <div className="border-t bg-white px-6 py-4">
                <button
                  onClick={() => setSelectedRequest(null)}
                  className="w-full rounded-lg bg-emerald-700 p-3 font-semibold text-white hover:bg-emerald-800"
                >
                  Đóng chi tiết
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
