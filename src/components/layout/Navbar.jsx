import React, { useState, useRef, useEffect } from "react";
import { Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import { House, User, MessageCircle, Menu, Settings } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../context/AuthContext";
import { DEFAULT_PROFILE_IMAGE, ROUTE_LOGO } from "../../config/constants";

export const Navbar = ({ unreadCount = 0 }) => {
  const { me, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleFeedClick = async (e) => {
    if (location.pathname.startsWith("/feed")) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
      setIsRefreshing(true);
      try {
        await queryClient.resetQueries({ queryKey: ["posts", "feed"], exact: false });
        await queryClient.refetchQueries({ queryKey: ["posts", "feed"], type: "active" });
      } finally {
        setTimeout(() => setIsRefreshing(false), 250);
      }
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-slate-200/90 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-2 py-1.5 sm:gap-3 sm:px-3">
          {/* Brand Logo & Name */}
          <Link
            to="/feed"
            onClick={handleFeedClick}
            className="flex items-center gap-3 transition hover:opacity-90"
          >
            <img
              src={ROUTE_LOGO}
              alt="Route Posts"
              className="h-9 w-9 rounded-xl object-cover"
            />
            <p className="hidden text-xl font-extrabold text-slate-900 sm:block">
              Route Posts
            </p>
          </Link>

          {/* Navigation Pill Center */}
          <nav className="flex min-w-0 items-center gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-slate-50/90 px-1 py-1 sm:px-1.5">
            <NavLink
              to="/feed"
              onClick={handleFeedClick}
              className={({ isActive }) =>
                `relative flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-sm font-extrabold transition sm:gap-2 sm:px-3.5 ${
                  isActive
                    ? "bg-white text-[#1f6fe5] shadow-xs"
                    : "text-slate-600 hover:bg-white/90 hover:text-slate-900"
                }`
              }
            >
              <House size={20} />
              <span className="hidden sm:inline">Feed</span>
              <span className="sr-only sm:hidden">Feed</span>
            </NavLink>

            <NavLink
              to="/profile"
              className={({ isActive }) =>
                `relative flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-sm font-extrabold transition sm:gap-2 sm:px-3.5 ${
                  isActive
                    ? "bg-white text-[#1f6fe5] shadow-xs"
                    : "text-slate-600 hover:bg-white/90 hover:text-slate-900"
                }`
              }
            >
              <User size={20} />
              <span className="hidden sm:inline">Profile</span>
              <span className="sr-only sm:hidden">Profile</span>
            </NavLink>

            <NavLink
              to="/notifications"
              className={({ isActive }) =>
                `relative flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-sm font-extrabold transition sm:gap-2 sm:px-3.5 ${
                  isActive
                    ? "bg-white text-[#1f6fe5] shadow-xs"
                    : "text-slate-600 hover:bg-white/90 hover:text-slate-900"
                }`
              }
            >
              <span className="relative inline-flex items-center">
                <MessageCircle size={20} />
                {unreadCount > 0 && (
                  <span className="absolute -right-2 -top-2 inline-flex min-w-[16px] items-center justify-center rounded-full bg-[#ef4444] px-1 text-[10px] font-black leading-4 text-white">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </span>
              <span className="hidden sm:inline">Notifications</span>
              <span className="sr-only sm:hidden">Notifications</span>
            </NavLink>
          </nav>

          {/* User Profile Pill & Dropdown (with hamburger icon trigger) */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1.5 transition hover:bg-slate-100 cursor-pointer"
              onClick={() => setDropdownOpen((prev) => !prev)}
            >
              <img
                src={me?.photo || DEFAULT_PROFILE_IMAGE}
                alt={me?.name || "user"}
                className="h-8 w-8 rounded-full object-cover"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = DEFAULT_PROFILE_IMAGE;
                }}
              />
              <span className="hidden max-w-[140px] truncate text-sm font-semibold text-slate-800 md:block">
                {me?.name}
              </span>
              <Menu size={15} className="text-slate-500" />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 z-50 mt-2 w-52 rounded-xl border border-slate-200 bg-white p-2 shadow-lg animate-in fade-in zoom-in-95 duration-100">
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
                  onClick={() => {
                    setDropdownOpen(false);
                    navigate("/profile");
                  }}
                >
                  <User size={16} />
                  <span>Profile</span>
                </button>

                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
                  onClick={() => {
                    setDropdownOpen(false);
                    navigate("/settings");
                  }}
                >
                  <Settings size={16} />
                  <span>Settings</span>
                </button>

                <div className="my-1 border-t border-slate-200" />

                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50 cursor-pointer"
                  onClick={() => {
                    setDropdownOpen(false);
                    logout();
                  }}
                >
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Timeline Refresh Overlay matching demo */}
      {isRefreshing && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/20 backdrop-blur-[2px]">
          <div className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-xl">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#1877f2] border-t-transparent" />
            <p className="text-sm font-semibold text-slate-700">
              Refreshing your timeline...
            </p>
          </div>
        </div>
      )}
    </>
  );
};
