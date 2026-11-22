
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Thiếu cấu hình Supabase server.");
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function verifyAdmin(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  const token = authorization?.startsWith("Bearer ")
    ? authorization.slice(7)
    : "";

  if (!token) {
    return {
      error: "Bạn chưa đăng nhập.",
      status: 401 as const,
    };
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !anonKey) {
    return {
      error: "Thiếu cấu hình Supabase.",
      status: 500 as const,
    };
  }

  const authClient = createClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data, error } = await authClient.auth.getUser(token);

  if (error || !data.user) {
    return {
      error: "Phiên đăng nhập không hợp lệ.",
      status: 401 as const,
    };
  }

  const adminClient = getAdminClient();

  const { data: profile, error: profileError } =
    await adminClient
      .from("profiles")
      .select("id, role")
      .eq("id", data.user.id)
      .single();

  if (profileError || profile?.role !== "admin") {
    return {
      error: "Chỉ Admin mới được quản lý tài khoản.",
      status: 403 as const,
    };
  }

  return {
    adminClient,
    user: data.user,
  };
}

// Lấy danh sách tài khoản nhân viên
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAdmin(request);

    if ("error" in auth) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      );
    }

    const { data, error } = await auth.adminClient
      .from("profiles")
      .select("id, full_name, role")
      .in("role", ["admin", "recruiter"])
      .order("full_name", { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      users: data || [],
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Lỗi máy chủ.";

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

// Tạo tài khoản nhân viên mới
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAdmin(request);

    if ("error" in auth) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      );
    }

    const body = await request.json();

    const fullName = String(body.full_name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");

    const role =
      body.role === "admin" ? "admin" : "recruiter";

    if (!fullName || !email || !password) {
      return NextResponse.json(
        {
          error:
            "Vui lòng nhập đầy đủ họ tên, email và mật khẩu.",
        },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        {
          error: "Mật khẩu phải có ít nhất 8 ký tự.",
        },
        { status: 400 }
      );
    }

    // Tạo tài khoản trong Supabase Auth
    const { data: created, error: createError } =
      await auth.adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
        },
      });

    if (createError || !created.user) {
      return NextResponse.json(
        {
          error:
            createError?.message ||
            "Không tạo được tài khoản.",
        },
        { status: 400 }
      );
    }

    // Lưu thông tin nhân viên vào bảng profiles
    const { error: profileError } = await auth.adminClient
      .from("profiles")
      .upsert(
        {
          id: created.user.id,
          full_name: fullName,
          role: role,
        },
        {
          onConflict: "id",
        }
      );

    // Nếu lưu profiles thất bại thì xóa tài khoản vừa tạo
    if (profileError) {
      await auth.adminClient.auth.admin.deleteUser(
        created.user.id
      );

      return NextResponse.json(
        {
          error:
            "Tạo hồ sơ nhân viên thất bại: " +
            profileError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: "Tạo tài khoản nhân viên thành công.",
        user: {
          id: created.user.id,
          email: email,
          full_name: fullName,
          role: role,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Lỗi máy chủ.";

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
