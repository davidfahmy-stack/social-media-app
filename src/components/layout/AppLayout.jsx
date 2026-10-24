import React from "react";
import { Outlet } from "react-router-dom";
import { Navbar } from "./Navbar";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../context/AuthContext";

export const AppLayout = () => {
  const { token, request } = useAuth();

  const { data: notifData } = useQuery({
    queryKey: ["notifications", "unread-count", token],
    enabled: !!token,
    queryFn: () => request({ path: "/notifications/unread-count" }),
    staleTime: 5000,
    refetchInterval: 30000,
  });

  const unreadCount = token ? notifData?.data?.unreadCount ?? 0 : 0;

  return (
    <div className="min-h-screen bg-[#f0f2f5]">
      <Navbar unreadCount={unreadCount} />
      <div className="mx-auto max-w-7xl px-3 py-3.5">
        <main className="min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
