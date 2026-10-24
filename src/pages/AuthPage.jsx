import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User, AtSign, Calendar, Users, KeyRound } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_REGEX = /^[a-z0-9_]{3,30}$/;
const PASSWORD_REGEX = /^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{8,}$/;

const StatBadge = ({ value, label }) => (
  <div className="rounded-xl border border-[#c9d5ff] bg-[#f2f6ff] px-3 py-2">
    <p className="text-base font-extrabold text-[#00298d]">{value}</p>
    <p className="text-[11px] font-bold uppercase tracking-wide text-slate-600">{label}</p>
  </div>
);

const FormInput = ({ name, type = "text", placeholder, icon, error, onChange }) => (
  <div>
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
        {icon}
      </span>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        className={`w-full rounded-xl border bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-800 outline-none transition focus:bg-white ${
          error ? "border-rose-300 focus:border-rose-400" : "border-slate-200 focus:border-[#00298d]"
        }`}
        onChange={onChange}
      />
    </div>
    {error ? (
      <p className="mt-1 text-xs font-semibold text-rose-600">{error}</p>
    ) : null}
  </div>
);

export const AuthPage = () => {
  const { token, signIn, signUp, loading, error, clearError } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState("signin");
  const [errors, setErrors] = useState({});

  const isSignIn = tab === "signin";
  const title = useMemo(
    () => (isSignIn ? "Log in to Route Posts" : "Create a new account"),
    [isSignIn]
  );

  useEffect(() => {
    document.title = isSignIn ? "Sign In | Route Posts" : "Create Account | Route Posts";
  }, [isSignIn]);

  useEffect(() => {
    if (token) {
      navigate("/feed", { replace: true });
    }
  }, [token, navigate]);

  const validate = (formData) => {
    const values = {
      name: String(formData.get("name") || "").trim(),
      username: String(formData.get("username") || "").trim(),
      email: String(formData.get("email") || "").trim(),
      login: String(formData.get("login") || "").trim(),
      password: String(formData.get("password") || "").trim(),
      rePassword: String(formData.get("rePassword") || "").trim(),
      gender: String(formData.get("gender") || "").trim(),
      dateOfBirth: String(formData.get("dateOfBirth") || "").trim(),
    };

    const newErrors = {};

    if (isSignIn) {
      if (!values.login) {
        newErrors.login = "Email or username is required.";
      } else if (values.login.length < 3) {
        newErrors.login = "Please enter a valid email or username.";
      }

      if (!values.password) {
        newErrors.password = "Password is required.";
      } else if (!PASSWORD_REGEX.test(values.password)) {
        newErrors.password = "Password must include uppercase, lowercase, number, and special character.";
      }
    } else {
      if (!values.name) {
        newErrors.name = "Full name is required.";
      } else if (values.name.length < 2) {
        newErrors.name = "Name must be at least 2 characters.";
      }

      if (values.username && !USERNAME_REGEX.test(values.username)) {
        newErrors.username = "Username must be 3-30 chars (a-z, 0-9, _).";
      }

      if (!values.email) {
        newErrors.email = "Email is required.";
      } else if (!EMAIL_REGEX.test(values.email)) {
        newErrors.email = "Please enter a valid email address.";
      }

      if (!values.password) {
        newErrors.password = "Password is required.";
      } else if (!PASSWORD_REGEX.test(values.password)) {
        newErrors.password = "Password must include uppercase, lowercase, number, and special character.";
      }

      if (!values.rePassword) {
        newErrors.rePassword = "Please confirm your password.";
      } else if (values.rePassword !== values.password) {
        newErrors.rePassword = "Passwords do not match.";
      }

      if (!values.gender) {
        newErrors.gender = "Please choose a valid gender.";
      } else if (!["male", "female"].includes(values.gender)) {
        newErrors.gender = "Please choose a valid gender.";
      }

      if (!values.dateOfBirth) {
        newErrors.dateOfBirth = "Date of birth is required.";
      } else {
        const d = new Date(values.dateOfBirth);
        if (Number.isNaN(d.getTime())) {
          newErrors.dateOfBirth = "Invalid date.";
        } else if (d > new Date()) {
          newErrors.dateOfBirth = "Date of birth cannot be in the future.";
        }
      }
    }

    setErrors(newErrors);
    return {
      valid: Object.keys(newErrors).length === 0,
      values,
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    const { valid, values } = validate(new FormData(e.currentTarget));
    if (valid) {
      if (isSignIn) {
        await signIn({ login: values.login, password: values.password });
      } else {
        await signUp({
          name: values.name,
          email: values.email,
          password: values.password,
          rePassword: values.rePassword,
          username: values.username || undefined,
          gender: values.gender,
          dateOfBirth: values.dateOfBirth,
        });
      }
    }
  };

  const switchTab = (newTab) => {
    setTab(newTab);
    setErrors({});
    clearError();
  };

  return (
    <div
      className="min-h-screen bg-[#f0f2f5] px-4 py-8 sm:py-12 lg:flex lg:items-center"
      style={{ fontFamily: "Cairo, sans-serif" }}
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-6 sm:gap-8 lg:flex-row lg:items-center lg:justify-between">
        {/* Left Section */}
        <section className="order-2 w-full max-w-xl text-center lg:order-1 lg:text-left">
          <h1 className="hidden text-5xl font-extrabold tracking-tight text-[#00298d] sm:text-6xl lg:block">
            Route Posts
          </h1>
          <p className="hidden mt-4 text-2xl font-medium leading-snug text-slate-800 lg:block">
            Connect with friends and the world around you on Route Posts.
          </p>
          <div className="mt-6 rounded-2xl border border-[#c9d5ff] bg-white/80 p-4 shadow-sm backdrop-blur sm:p-5">
            <p className="text-sm font-extrabold uppercase tracking-[0.14em] text-[#00298d]">
              About Route Academy
            </p>
            <p className="mt-1 text-lg font-bold text-slate-900">
              Egypt's Leading IT Training Center Since 2012
            </p>
            <p className="mt-2 text-sm leading-relaxed text-slate-700">
              Route Academy is the premier IT training center in Egypt, established in 2012. We
              specialize in delivering high-quality training courses in programming, web development,
              and application development. We've identified the unique challenges people may face when
              learning new technology and made efforts to provide strategies to overcome them.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
              <StatBadge value="2012" label="Founded" />
              <StatBadge value="40K+" label="Graduates" />
              <StatBadge value="50+" label="Partner Companies" />
              <StatBadge value="5" label="Branches" />
              <StatBadge value="20" label="Diplomas Available" />
            </div>
          </div>
        </section>

        {/* Right Section */}
        <section className="order-1 w-full max-w-[430px] lg:order-2">
          <div className="rounded-2xl bg-white p-4 sm:p-6">
            <div className="mb-4 text-center lg:hidden">
              <h1 className="text-3xl font-extrabold tracking-tight text-[#00298d]">
                Route Posts
              </h1>
              <p className="mt-1 text-base font-medium leading-snug text-slate-700">
                Connect with friends and the world around you on Route Posts.
              </p>
            </div>

            <div className="mb-5 grid grid-cols-2 rounded-xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => switchTab("signin")}
                className={`rounded-lg py-2 text-sm font-extrabold transition ${
                  isSignIn
                    ? "bg-white text-[#00298d] shadow-sm"
                    : "text-slate-600 hover:text-slate-800"
                }`}
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => switchTab("signup")}
                className={`rounded-lg py-2 text-sm font-extrabold transition ${
                  isSignIn
                    ? "text-slate-600 hover:text-slate-800"
                    : "bg-white text-[#00298d] shadow-sm"
                }`}
              >
                Register
              </button>
            </div>

            <h2 className="text-2xl font-extrabold text-slate-900">{title}</h2>
            <p className="mt-1 text-sm text-slate-500">
              {isSignIn
                ? "Log in and continue your social journey."
                : "It is quick and easy."}
            </p>

            <form onSubmit={handleSubmit} noValidate className="mt-5 space-y-3.5">
              {isSignIn ? (
                <FormInput
                  name="login"
                  icon={<User size={18} />}
                  placeholder="Email or username"
                  error={errors.login}
                  onChange={() => setErrors((prev) => ({ ...prev, login: undefined }))}
                />
              ) : (
                <>
                  <FormInput
                    name="name"
                    icon={<User size={18} />}
                    placeholder="Full name"
                    error={errors.name}
                    onChange={() => setErrors((prev) => ({ ...prev, name: undefined }))}
                  />
                  <FormInput
                    name="username"
                    icon={<AtSign size={18} />}
                    placeholder="Username (optional)"
                    error={errors.username}
                    onChange={() => setErrors((prev) => ({ ...prev, username: undefined }))}
                  />
                  <FormInput
                    name="email"
                    type="email"
                    icon={<AtSign size={18} />}
                    placeholder="Email address"
                    error={errors.email}
                    onChange={() => setErrors((prev) => ({ ...prev, email: undefined }))}
                  />
                  <div>
                    <div className="relative">
                      <Users
                        size={18}
                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                      />
                      <select
                        name="gender"
                        className={`w-full rounded-xl border bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-800 outline-none transition focus:bg-white ${
                          errors.gender
                            ? "border-rose-300 focus:border-rose-400"
                            : "border-slate-200 focus:border-[#00298d]"
                        }`}
                        onChange={() => setErrors((prev) => ({ ...prev, gender: undefined }))}
                      >
                        <option value="">Select gender</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                      </select>
                    </div>
                    {errors.gender ? (
                      <p className="mt-1 text-xs font-semibold text-rose-600">{errors.gender}</p>
                    ) : null}
                  </div>
                  <FormInput
                    name="dateOfBirth"
                    type="date"
                    icon={<Calendar size={18} />}
                    placeholder="Date of birth"
                    error={errors.dateOfBirth}
                    onChange={() => setErrors((prev) => ({ ...prev, dateOfBirth: undefined }))}
                  />
                </>
              )}

              <FormInput
                name="password"
                type="password"
                icon={<KeyRound size={18} />}
                placeholder="Password"
                error={errors.password}
                onChange={() => setErrors((prev) => ({ ...prev, password: undefined }))}
              />

              {!isSignIn && (
                <FormInput
                  name="rePassword"
                  type="password"
                  icon={<KeyRound size={18} />}
                  placeholder="Confirm password"
                  error={errors.rePassword}
                  onChange={() => setErrors((prev) => ({ ...prev, rePassword: undefined }))}
                />
              )}

              <button
                disabled={loading}
                className="w-full rounded-xl py-3 text-base font-extrabold text-white transition disabled:opacity-60 bg-[#00298d] hover:bg-[#001f6b]"
              >
                {loading ? "Please wait..." : isSignIn ? "Log In" : "Create New Account"}
              </button>

              {isSignIn && (
                <button
                  type="button"
                  className="mx-auto block text-sm font-semibold text-[#00298d] transition hover:underline"
                >
                  Forgot password?
                </button>
              )}

              {error && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700">
                  {error}
                </div>
              )}
            </form>
          </div>
        </section>
      </div>
    </div>
  );
};
