
"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabase";

type SiteLogoProps = {
  size?: "small" | "large";
  className?: string;
};

export default function SiteLogo({
  size = "large",
  className = "",
}: SiteLogoProps) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadLogo() {
      const { data, error } = await supabase
        .from("site_settings")
        .select("logo_url")
        .eq("id", 1)
        .maybeSingle();

      if (!active || error || !data?.logo_url) return;
      setLogoUrl(data.logo_url);
    }

    loadLogo();

    const channel = supabase
      .channel("site-logo-updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "site_settings",
          filter: "id=eq.1",
        },
        (payload) => {
          const nextUrl = (
            payload.new as { logo_url?: string } | null
          )?.logo_url;

          if (nextUrl) setLogoUrl(nextUrl);
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const boxSize = size === "large" ? "h-11 w-11" : "h-9 w-9";
  const textSize = size === "large" ? "text-2xl" : "text-xl";

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {logoUrl ? (
        <div
          className={`relative ${boxSize} shrink-0 overflow-hidden rounded-xl bg-white`}
        >
          <Image
            src={logoUrl}
            alt="Logo CVISION"
            fill
            unoptimized
            sizes="44px"
            className="object-contain"
          />
        </div>
      ) : (
        <div
          className={`flex ${boxSize} shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-300 via-blue-500 to-blue-700 text-xl font-extrabold text-white shadow-lg shadow-blue-200`}
        >
          C
        </div>
      )}

      <span
        className={`bg-gradient-to-r from-sky-500 to-blue-700 bg-clip-text ${textSize} font-extrabold tracking-tight text-transparent`}
      >
        CVISION
      </span>
    </div>
  );
}
