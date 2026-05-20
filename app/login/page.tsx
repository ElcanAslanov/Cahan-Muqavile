"use client";

import { useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e?: FormEvent) {
    if (e) e.preventDefault();

    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    const user = data.user;

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (!profile) {
      alert("Profile not found");
      setLoading(false);
      return;
    }

    // ✅ ROLE ROUTING
    if (profile.role === "ADMIN") {
      router.push("/admin/dashboard");
      return;
    }

    if (profile.role === "HOLDING_MANAGER") {
      router.push("/holding");
      return;
    }

    if (profile.role === "COMPANY_MANAGER") {
      router.push("/company");
      return;
    }

    if (profile.role === "ACCOUNTANT") {
      router.push("/accountant");
      return;
    }

    setLoading(false);
  }

  async function handleForgotPassword() {
    if (!email) {
      alert("Zəhmət olmasa əvvəlcə email daxil edin");
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo:
        process.env.NODE_ENV === "development"
          ? "http://localhost:3000/reset-password"
          : "https://your-netlify-domain.netlify.app/reset-password",
    });

    if (error) {
      alert(error.message);
      return;
    }

    alert("Şifrə yeniləmə linki email ünvanınıza göndərildi");
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#eef5ff] text-slate-950">
      {/* ANIMATED BACKGROUND */}
      <div className="orb orb-one" />
      <div className="orb orb-two" />
      <div className="orb orb-three" />

      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.55)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.55)_1px,transparent_1px)] bg-[size:42px_42px] opacity-40" />

      <main className="relative z-10 flex min-h-screen items-center justify-center px-4 py-8 sm:px-6">
        <div className="login-shell grid w-full max-w-6xl overflow-hidden rounded-[34px] border border-white/80 bg-white/70 shadow-2xl shadow-blue-950/10 backdrop-blur-2xl lg:grid-cols-[1fr_0.9fr]">
          {/* LEFT VISUAL */}
          <section className="relative hidden overflow-hidden bg-gradient-to-br from-blue-600 via-sky-500 to-cyan-400 p-10 text-white lg:block">
            <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/20 blur-3xl" />
            <div className="absolute bottom-[-110px] left-10 h-80 w-80 rounded-full bg-blue-900/20 blur-3xl" />

            <div className="relative z-10 flex h-full min-h-[660px] flex-col justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/20 px-4 py-2 text-sm font-black text-white shadow-lg shadow-blue-900/10 backdrop-blur">
                  <span className="h-2.5 w-2.5 rounded-full bg-white shadow-[0_0_0_6px_rgba(255,255,255,0.18)]" />
                  Müqavilə Paneli
                </div>

                <h1 className="mt-8 max-w-xl text-5xl font-black leading-[1.05] tracking-[-0.06em]">
                  Müqavilələrinizi rahat idarə edin
                </h1>

                <p className="mt-5 max-w-lg text-base leading-8 text-blue-50">
                  Şirkət, arxiv, bildiriş və müqavilə nəzarəti üçün vahid giriş
                  paneli.
                </p>
              </div>

              <div className="space-y-4">
                <div className="glass-card">
                  <div className="flex items-center gap-4">
                    <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 text-3xl">
                      📄
                    </span>

                    <div>
                      <p className="text-sm font-black uppercase tracking-wide text-blue-50">
                        Müqavilələr
                      </p>
                      <p className="mt-1 text-2xl font-black tracking-[-0.04em]">
                        Aktiv nəzarət
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="mini-glass">
                    <span className="text-3xl">🏢</span>
                    <p className="mt-3 text-sm font-black">Şirkətlər</p>
                  </div>

                  <div className="mini-glass">
                    <span className="text-3xl">⏰</span>
                    <p className="mt-3 text-sm font-black">Xatırlatmalar</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* LOGIN FORM */}
          <section className="relative flex min-h-[660px] items-center justify-center p-5 sm:p-8 lg:p-10">
            <div className="form-card w-full max-w-md">
              <div className="mb-8 text-center">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[28px] bg-gradient-to-br from-blue-600 to-sky-400 text-4xl shadow-xl shadow-blue-500/25">
                  🔐
                </div>

                <h2 className="mt-6 text-3xl font-black tracking-[-0.05em] text-slate-950">
                  Xoş gəlmisiniz
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Hesabınıza daxil olmaq üçün məlumatlarınızı yazın.
                </p>
              </div>

              <form
                onSubmit={handleLogin}
                className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-xl shadow-blue-950/5 sm:p-6"
              >
                <div className="space-y-5">
                  <div>
                    <label className="mb-2 block text-sm font-black text-slate-700">
                      Email
                    </label>

                    <div className="relative">
                      <span className="pointer-events-none absolute left-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                        ✉️
                      </span>

                      <input
                        type="email"
                        placeholder="Email ünvanınızı daxil edin"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 pl-16 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-black text-slate-700">
                      Şifrə
                    </label>

                    <div className="relative">
                      <span className="pointer-events-none absolute left-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                        🔑
                      </span>

                      <input
                        type={showPassword ? "text" : "password"}
                        placeholder="Şifrənizi daxil edin"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 pl-16 pr-14 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
                      />

                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                        aria-label="Şifrəni göstər və ya gizlət"
                      >
                        {showPassword ? "🙈" : "👁"}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-sm font-black text-blue-600 transition hover:text-blue-700 hover:underline"
                  >
                    Şifrəni unutmusunuz?
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="login-button mt-6 inline-flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-blue-600 to-sky-500 px-5 py-4 text-sm font-black text-white shadow-xl shadow-blue-500/25 transition hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-blue-500/30 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                >
                  {loading ? (
                    <>
                      <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/35 border-t-white" />
                      Daxil olunur...
                    </>
                  ) : (
                    <>
                      Daxil ol
                      <span className="text-lg">→</span>
                    </>
                  )}
                </button>
              </form>

              <p className="mt-6 text-center text-xs font-semibold text-slate-400">
                Müqavilə idarəetmə sistemi
              </p>
            </div>
          </section>
        </div>
      </main>

      <style jsx>{`
        .login-shell {
          animation: shellIn 0.75s ease both;
        }

        .form-card {
          animation: formIn 0.85s ease 0.12s both;
        }

        .glass-card {
          border: 1px solid rgba(255, 255, 255, 0.28);
          background: rgba(255, 255, 255, 0.18);
          border-radius: 28px;
          padding: 22px;
          box-shadow: 0 24px 60px rgba(30, 64, 175, 0.18);
          backdrop-filter: blur(16px);
          animation: floatCard 5.5s ease-in-out infinite;
        }

        .mini-glass {
          border: 1px solid rgba(255, 255, 255, 0.24);
          background: rgba(255, 255, 255, 0.16);
          border-radius: 26px;
          padding: 20px;
          box-shadow: 0 18px 44px rgba(30, 64, 175, 0.16);
          backdrop-filter: blur(16px);
          animation: floatCard 6.2s ease-in-out infinite;
        }

        .mini-glass:nth-child(2) {
          animation-delay: 0.45s;
        }

        .login-button {
          position: relative;
          overflow: hidden;
        }

        .login-button::before {
          content: "";
          position: absolute;
          inset: 0;
          transform: translateX(-120%);
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.32),
            transparent
          );
          transition: transform 0.75s ease;
        }

        .login-button:hover::before {
          transform: translateX(120%);
        }

        .orb {
          position: absolute;
          border-radius: 999px;
          filter: blur(18px);
          opacity: 0.55;
          pointer-events: none;
        }

        .orb-one {
          width: 340px;
          height: 340px;
          left: -130px;
          top: -120px;
          background: rgba(14, 165, 233, 0.35);
          animation: orbMoveOne 11s ease-in-out infinite alternate;
        }

        .orb-two {
          width: 360px;
          height: 360px;
          right: -150px;
          top: 18%;
          background: rgba(37, 99, 235, 0.26);
          animation: orbMoveTwo 13s ease-in-out infinite alternate;
        }

        .orb-three {
          width: 300px;
          height: 300px;
          left: 38%;
          bottom: -150px;
          background: rgba(125, 211, 252, 0.38);
          animation: orbMoveThree 12s ease-in-out infinite alternate;
        }

        @keyframes shellIn {
          from {
            opacity: 0;
            transform: translateY(18px) scale(0.985);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes formIn {
          from {
            opacity: 0;
            transform: translateX(18px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes floatCard {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        @keyframes orbMoveOne {
          from {
            transform: translate(0, 0) scale(1);
          }
          to {
            transform: translate(45px, 35px) scale(1.08);
          }
        }

        @keyframes orbMoveTwo {
          from {
            transform: translate(0, 0) scale(1);
          }
          to {
            transform: translate(-40px, 50px) scale(1.06);
          }
        }

        @keyframes orbMoveThree {
          from {
            transform: translateY(0) scale(1);
          }
          to {
            transform: translateY(-45px) scale(1.05);
          }
        }

        @media (max-width: 1023px) {
          .login-shell {
            max-width: 520px;
          }
        }
      `}</style>
    </div>
  );
}