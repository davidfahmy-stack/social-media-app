import React, { useState, useMemo } from "react";
import { KeyRound } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { PASSWORD_REGEX } from "../config/constants";
import toast from "react-hot-toast";

const SettingsInput = ({
  name,
  type = "password",
  label,
  placeholder,
  value,
  onChange,
  onBlur,
  error,
  hint,
}) => (
  <label className="block">
    <span className="mb-1.5 block text-sm font-bold text-slate-700">{label}</span>
    <input
      name={name}
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      className={`w-full rounded-xl border bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none transition ${
        error
          ? "border-rose-300 focus:border-rose-400"
          : "border-slate-200 focus:border-[#1877f2] focus:bg-white"
      }`}
    />
    {error ? (
      <span className="mt-1 block text-xs font-semibold text-rose-600">{error}</span>
    ) : hint ? (
      <span className="mt-1 block text-xs text-slate-500">{hint}</span>
    ) : null}
  </label>
);

export const SettingsPage = () => {
  const { changePassword, clearError, error, loading } = useAuth();

  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [touched, setTouched] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  });

  const [successMsg, setSuccessMsg] = useState("");

  const passwordHint =
    "At least 8 characters with uppercase, lowercase, number, and special character.";

  const errors = useMemo(() => {
    const errs = {};
    if (!form.currentPassword.trim()) {
      errs.currentPassword = "Current password is required.";
    }

    if (!form.newPassword.trim()) {
      errs.newPassword = "New password is required.";
    } else if (!PASSWORD_REGEX.test(form.newPassword.trim())) {
      errs.newPassword = passwordHint;
    }

    if (!form.confirmPassword.trim()) {
      errs.confirmPassword = "Please confirm your new password.";
    } else if (form.confirmPassword.trim() !== form.newPassword.trim()) {
      errs.confirmPassword = "Passwords do not match.";
    }

    return errs;
  }, [form]);

  const isValid =
    Boolean(
      form.currentPassword.trim() &&
        form.newPassword.trim() &&
        form.confirmPassword.trim()
    ) &&
    Object.keys(errors).length === 0 &&
    !loading;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSuccessMsg("");
    clearError();
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched({
      currentPassword: true,
      newPassword: true,
      confirmPassword: true,
    });
    setSuccessMsg("");
    clearError();

    if (Object.keys(errors).length > 0) return;

    try {
      await changePassword({
        password: form.currentPassword.trim(),
        newPassword: form.newPassword.trim(),
      });
      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setTouched({
        currentPassword: false,
        newPassword: false,
        confirmPassword: false,
      });
      setSuccessMsg("Password changed successfully.");
      toast.success("Password changed successfully");
    } catch {
      // Error handled by AuthContext
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      {/* Change Password Card matching demo exactly */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5 flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#e7f3ff] text-[#1877f2]">
            <KeyRound size={18} />
          </span>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 sm:text-2xl">
              Change Password
            </h1>
            <p className="text-sm text-slate-500">
              Keep your account secure by using a strong password.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <SettingsInput
            name="currentPassword"
            label="Current password"
            placeholder="Enter current password"
            value={form.currentPassword}
            onChange={handleChange}
            onBlur={() => handleBlur("currentPassword")}
            error={touched.currentPassword ? errors.currentPassword : undefined}
          />

          <SettingsInput
            name="newPassword"
            label="New password"
            placeholder="Enter new password"
            value={form.newPassword}
            onChange={handleChange}
            onBlur={() => handleBlur("newPassword")}
            error={touched.newPassword ? errors.newPassword : undefined}
            hint={passwordHint}
          />

          <SettingsInput
            name="confirmPassword"
            label="Confirm new password"
            placeholder="Re-enter new password"
            value={form.confirmPassword}
            onChange={handleChange}
            onBlur={() => handleBlur("confirmPassword")}
            error={touched.confirmPassword ? errors.confirmPassword : undefined}
          />

          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
              {error}
            </div>
          )}

          {successMsg && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
              {successMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={!isValid}
            className="inline-flex w-full items-center justify-center rounded-xl bg-[#1877f2] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#166fe5] disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
          >
            {loading ? "Updating password..." : "Update password"}
          </button>
        </form>
      </section>
    </div>
  );
};
