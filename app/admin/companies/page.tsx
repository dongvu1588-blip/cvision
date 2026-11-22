import { redirect } from "next/navigation";

export default function CompaniesPage() {
  // Chuyển mục Quản lý công ty cũ sang khu vực Quản lý việc làm.
  redirect("/admin/jobs");
}
