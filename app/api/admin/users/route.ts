
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

async function verifyAdmin(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return {
      error: "Bạn chưa đăng nhập.",
      status: 401,
      adminClient: null,
      userId: null,
    };
  }

  const token = authorization.replace("Bearer ", "");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !anonKey || !serviceKey) {
    return {
      error: "Thiếu cấu hình Supabase trong file .env.local.",
      status: 500,
      adminClient: null,
      userId: null,
    };
  }

  const authClient = createClient(supabaseUrl, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data: userData, error: authError } =
    await authClient.auth.getUser(token);

  if (authError || !userData.user) {
    return {
      error: "Phiên đăng nhập không hợp lệ.",
      status: 401,
      adminClient: null,
      userId: null,
    };
  }

  const adminClient = createClient(supabaseUrl, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data: profile, error: profileError } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .single();

  if (profileError || profile?.role !== "admin") {
    return {
      error: "Bạn không có quyền thực hiện thao tác này.",
      status: 403,
      adminClient: null,
      userId: null,
    };
  }

  return {
    error: null,
    status: 200,
    adminClient,
    userId: userData.user.id,
  };
}

// GET: Lấy danh sách nhân viên và trạng thái tài khoản
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAdmin(request);

    if (auth.error || !auth.adminClient) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      );
    }

    const { data: profiles, error: profileError } = await auth.adminClient
      .from("profiles")
      .select("id, full_name, role, created_at")
      .order("created_at", { ascending: false });

    if (profileError) throw profileError;

    const { data: authUsers, error: authUsersError } =
      await auth.adminClient.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });

    if (authUsersError) throw authUsersError;

    const users = (profiles || []).map((profile) => {
      const authUser = authUsers.users.find(
        (user) => user.id === profile.id
      );

      const bannedUntil = authUser?.banned_until || null;

      const isBanned =
        !!bannedUntil &&
        new Date(bannedUntil).getTime() > Date.now();

      return {
        ...profile,
        is_banned: isBanned,
        banned_until: bannedUntil,
        email: authUser?.email || "",
      };
    });

    return NextResponse.json({ users });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Lỗi máy chủ.";

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

// POST: Tạo tài khoản Recruiter
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAdmin(request);

    if (auth.error || !auth.adminClient) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      );
    }

    const body = await request.json();

    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const fullName = String(body.full_name || "").trim();

    if (!email || !password || !fullName) {
      return NextResponse.json(
        { error: "Vui lòng nhập đầy đủ họ tên, email và mật khẩu." },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Mật khẩu phải có ít nhất 8 ký tự." },
        { status: 400 }
      );
    }

    const { data: newUser, error: createError } =
      await auth.adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
        },
      });

    if (createError || !newUser.user) {
      return NextResponse.json(
        { error: createError?.message || "Không tạo được tài khoản." },
        { status: 400 }
      );
    }

    const { error: insertError } = await auth.adminClient
      .from("profiles")
      .insert({
        id: newUser.user.id,
        full_name: fullName,
        role: "recruiter",
      });

    if (insertError) {
      await auth.adminClient.auth.admin.deleteUser(newUser.user.id);

      return NextResponse.json(
        { error: "Không tạo được hồ sơ nhân viên: " + insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Tạo tài khoản Recruiter thành công!",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Lỗi máy chủ.";

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

// PATCH: Sửa tên hoặc khóa/mở khóa tài khoản Recruiter
export async function PATCH(request: NextRequest) {
  try {
    const auth = await verifyAdmin(request);

    if (auth.error || !auth.adminClient || !auth.userId) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      );
    }

    const body = await request.json();
    const userId = String(body.user_id || "").trim();
    const action = String(body.action || "");

    if (!userId) {
      return NextResponse.json(
        { error: "Thiếu mã nhân viên." },
        { status: 400 }
      );
    }

    if (userId === auth.userId) {
      return NextResponse.json(
        { error: "Bạn không thể tự khóa hoặc sửa tài khoản Admin đang đăng nhập." },
        { status: 400 }
      );
    }

    const { data: targetProfile, error: targetError } =
      await auth.adminClient
        .from("profiles")
        .select("id, role")
        .eq("id", userId)
        .single();

    if (targetError || !targetProfile) {
      return NextResponse.json(
        { error: "Không tìm thấy nhân viên." },
        { status: 404 }
      );
    }

    if (targetProfile.role !== "recruiter") {
      return NextResponse.json(
        { error: "Chỉ có thể thao tác với tài khoản Recruiter." },
        { status: 403 }
      );
    }

    if (action === "update_name") {
      const fullName = String(body.full_name || "").trim();

      if (!fullName) {
        return NextResponse.json(
          { error: "Họ tên không được để trống." },
          { status: 400 }
        );
      }

      const { error: updateProfileError } = await auth.adminClient
        .from("profiles")
        .update({ full_name: fullName })
        .eq("id", userId);

      if (updateProfileError) throw updateProfileError;

      const { data: authUserData } =
        await auth.adminClient.auth.admin.getUserById(userId);

      const oldMetadata = authUserData.user?.user_metadata || {};

      const { error: updateAuthError } =
        await auth.adminClient.auth.admin.updateUserById(userId, {
          user_metadata: {
            ...oldMetadata,
            full_name: fullName,
          },
        });

      if (updateAuthError) throw updateAuthError;

      return NextResponse.json({
        message: "Cập nhật họ tên thành công.",
      });
    }

    if (action === "toggle_status") {
      const shouldBan = body.is_banned === true;

      const { error: banError } =
        await auth.adminClient.auth.admin.updateUserById(userId, {
          ban_duration: shouldBan ? "876000h" : "none",
        });

      if (banError) throw banError;

      return NextResponse.json({
        message: shouldBan
          ? "Đã khóa tài khoản Recruiter."
          : "Đã mở khóa tài khoản Recruiter.",
      });
    }

    return NextResponse.json(
      { error: "Thao tác không hợp lệ." },
      { status: 400 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Lỗi máy chủ.";

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
