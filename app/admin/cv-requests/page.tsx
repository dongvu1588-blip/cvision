
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type CVRequest = {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
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

export default function CVRequestsPage() {
  const [requests, setRequests] = useState<CVRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedRequest, setSelectedRequest] =
    useState<CVRequest | null>(null);

  async function loadRequests() {
    setLoading(true);

    const { data, error } = await supabase
      .from("cv_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      alert("Không tải được yêu cầu CV: " + error.message);
    } else {
      setRequests(data || []);
    }

    setLoading(false);
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

    setSelectedRequest(null);
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
        <a
          href="/admin/dashboard"
          className="text-sm font-medium text-emerald-700"
        >
          ← Quay lại Dashboard
        </a>

        <div className="mb-8 mt-4">
          <h1 className="text-3xl font-extrabold">
            Quản lý dịch vụ CV
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Tiếp nhận và theo dõi yêu cầu dịch vụ từ khách hàng.
          </p>
        </div>

        <section className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            { title: "Tổng yêu cầu", value: requests.length },
            {
              title: "Mới tiếp nhận",
              value: requests.filter((r) => r.status === "Mới tiếp nhận").length,
            },
            {
              title: "Đang xử lý",
              value: requests.filter((r) => r.status === "Đang xử lý").length,
            },
            {
              title: "Hoàn thành",
              value: requests.filter((r) => r.status === "Hoàn thành").length,
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-xl border bg-white p-5 shadow-sm"
            >
              <p className="text-sm text-slate-500">{item.title}</p>
              <p className="mt-3 text-3xl font-extrabold text-emerald-700">
                {loading ? "..." : item.value}
              </p>
            </div>
          ))}
        </section>

        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-xl font-bold">
              Danh sách yêu cầu ({filteredRequests.length})
            </h2>

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm tên, số điện thoại, email..."
              className="w-full rounded-lg border p-3 md:w-80"
            />
          </div>

          {loading ? (
            <p className="py-8 text-center text-slate-400">
              Đang tải dữ liệu...
            </p>
          ) : filteredRequests.length === 0 ? (
            <p className="py-8 text-center text-slate-400">
              Chưa có yêu cầu dịch vụ CV nào.
            </p>
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
                      <td className="p-3 font-semibold">
                        {request.full_name}
                      </td>
                      <td className="p-3">
                        <p>{request.phone}</p>
                        <p className="text-xs text-slate-400">
                          {request.email || "Không có email"}
                        </p>
                      </td>
                      <td className="p-3">
                        {request.service_type || "Khác"}
                      </td>
                      <td className="p-3">
                        {new Date(request.created_at).toLocaleDateString("vi-VN")}
                      </td>
                      <td className="p-3">
                        <select
                          value={request.status}
                          onChange={(e) =>
                            updateStatus(request.id, e.target.value)
                          }
                          className={`rounded-lg border-0 p-2 text-xs font-semibold ${statusColor(request.status)}`}
                        >
                          {statuses.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-3">
                        <button
                          onClick={() => setSelectedRequest(request)}
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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-xl font-bold">Chi tiết yêu cầu</h2>
                <button
                  onClick={() => setSelectedRequest(null)}
                  className="text-xl text-slate-400"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 text-sm">
                <p>
                  <strong>Khách hàng:</strong> {selectedRequest.full_name}
                </p>
                <p>
                  <strong>Số điện thoại:</strong> {selectedRequest.phone}
                </p>
                <p>
                  <strong>Email:</strong> {selectedRequest.email || "—"}
                </p>
                <p>
                  <strong>Dịch vụ:</strong> {selectedRequest.service_type || "—"}
                </p>
                <p>
                  <strong>Yêu cầu:</strong>
                </p>
                <div className="rounded-lg bg-slate-50 p-4 leading-6">
                  {selectedRequest.description || "Khách hàng chưa mô tả thêm."}
                </div>
              </div>

              <button
                onClick={() => setSelectedRequest(null)}
                className="mt-6 w-full rounded-lg bg-emerald-700 p-3 font-semibold text-white"
              >
                Đóng
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
