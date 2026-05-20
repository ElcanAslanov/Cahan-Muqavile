"use client";

import Link from "next/link";

export default function CompanySettingsPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-100 text-slate-950">
      {/* BACKGROUND */}
      <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-blue-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-cyan-400/20 blur-3xl" />

      <main className="relative z-10 mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* HERO */}
        <section className="relative overflow-hidden rounded-[28px] border border-white/20 bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 p-6 text-white shadow-2xl shadow-slate-900/20 sm:p-8">
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-sky-400/20 blur-2xl" />
          <div className="pointer-events-none absolute bottom-[-90px] left-1/3 h-56 w-56 rounded-full bg-indigo-500/20 blur-2xl" />

          <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-sm font-bold text-blue-100">
                <span className="h-2 w-2 rounded-full bg-sky-400 shadow-[0_0_0_5px_rgba(56,189,248,0.16)]" />
                Hesab parametrləri
              </div>

              <h1 className="text-3xl font-black tracking-[-0.05em] sm:text-4xl">
                Parametrlər
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                Hesab təhlükəsizliyi və giriş məlumatlarınızı buradan idarə
                edə bilərsiniz.
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/10 p-5 shadow-xl backdrop-blur">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-300">
                Bölmə
              </p>
              <div className="mt-2 flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 text-xl">
                  ⚙️
                </span>
                <div>
                  <p className="text-lg font-black">Settings</p>
                  <p className="text-xs text-slate-300">Company panel</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CONTENT */}
        <section className="mt-6 grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          {/* INFO CARD */}
          <aside className="rounded-[26px] border border-slate-200 bg-white/90 p-6 shadow-xl shadow-slate-900/5 backdrop-blur">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-2xl text-blue-700">
              🔐
            </div>

            <h2 className="mt-5 text-2xl font-black tracking-[-0.04em] text-slate-950">
              Təhlükəsizlik mərkəzi
            </h2>

            <p className="mt-3 text-sm leading-7 text-slate-600">
              Şifrənizi mütəmadi dəyişmək hesabınızın qorunmasına kömək edir.
              Yeni şifrə seçərkən böyük hərf, kiçik hərf, rəqəm və simvoldan
              istifadə etməyiniz tövsiyə olunur.
            </p>

            <div className="mt-6 space-y-3">
              <div className="flex gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-100 text-green-700">
                  ✓
                </span>
                <div>
                  <p className="font-black text-slate-900">Təhlükəsiz giriş</p>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Hesab məlumatlarınızı yalnız özünüz idarə edin.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                  🛡️
                </span>
                <div>
                  <p className="font-black text-slate-900">Şifrə qorunması</p>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Şifrə dəyişmək üçün hazırkı şifrə tələb olunur.
                  </p>
                </div>
              </div>
            </div>
          </aside>

          {/* SETTINGS CARD */}
          <div className="rounded-[26px] border border-slate-200 bg-white/90 p-6 shadow-xl shadow-slate-900/5 backdrop-blur">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-black tracking-[-0.04em] text-slate-950">
                  Security
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Hesabınızın təhlükəsizlik ayarları
                </p>
              </div>

              <span className="inline-flex w-fit items-center gap-2 rounded-full border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-black text-green-700">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                Aktiv
              </span>
            </div>

            <div className="space-y-4">
              <Link
                href="/company/settings/password"
                className="group flex items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-5 text-slate-950 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-900/10"
              >
                <div className="flex items-center gap-4">
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-2xl text-blue-700 transition group-hover:bg-blue-600 group-hover:text-white">
                    🔑
                  </span>

                  <div>
                    <div className="text-base font-black tracking-[-0.02em]">
                      Şifrəni dəyiş
                    </div>
                    <div className="mt-1 text-sm leading-6 text-slate-500">
                      Hesab şifrənizi təhlükəsiz şəkildə yeniləyin
                    </div>
                  </div>
                </div>

                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-2xl text-slate-400 transition group-hover:border-blue-200 group-hover:bg-blue-50 group-hover:text-blue-700">
                  ›
                </span>
              </Link>

              <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50/80 p-5">
                <div className="flex items-start gap-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-xl text-amber-700">
                    ℹ️
                  </span>

                  <div>
                    <h3 className="font-black text-slate-900">
                      Qeyd
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      Şifrə dəyişdirildikdən sonra yeni şifrə növbəti girişlər
                      üçün aktiv olacaq.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}