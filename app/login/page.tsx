"use client";

import { FormEvent, useState } from "react";
import { Scissors, Eye, EyeOff, Loader2, ArrowRight, UserRoundPlus } from "lucide-react";

type Mode = "login" | "register";

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("admin@barberservice.local");
  const [password, setPassword] = useState("Admin123!");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
    const payload = mode === "login" ? { email, password } : { name, email, password };
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      window.location.assign(data.data?.role === "CLIENT" ? "/" : "/dashboard");
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error?.message || data.error || "No fue posible continuar");
      setLoading(false);
    }
  }

  const switchMode = (next: Mode) => {
    setMode(next);
    setError("");
    setEmail("");
    setPassword("");
  };

  return (
    <main className="min-h-screen grid lg:grid-cols-2 bg-zinc-950">
      <section className="hidden lg:flex relative overflow-hidden bg-zinc-950 text-white p-12 flex-col justify-between">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_30%_30%,white,transparent_28%),radial-gradient(circle_at_80%_70%,#737373,transparent_24%)]" />
        <div className="relative flex items-center gap-3"><div className="h-10 w-10 rounded-xl bg-white text-zinc-950 grid place-items-center font-black"><Scissors size={20}/></div><div><div className="font-bold">BarberService</div><div className="text-xs text-zinc-400">Administración</div></div></div>
        <div className="relative max-w-xl"><p className="text-sm uppercase tracking-[0.2em] text-zinc-400">Controla tu negocio</p><h1 className="mt-4 text-5xl font-semibold tracking-tight">Agenda, clientes y caja en un solo lugar.</h1><p className="mt-6 text-zinc-400 leading-7">Una base moderna y preparada para crecer con Next.js, Prisma, Neon y Vercel.</p></div>
        <div className="relative text-xs text-zinc-500">BarberService · Plataforma de gestión</div>
      </section>
      <section className="bg-white flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-10"><div className="h-10 w-10 rounded-xl bg-zinc-950 text-white grid place-items-center"><Scissors size={20}/></div><div><div className="font-bold">BarberService</div><div className="text-xs text-zinc-500">Administración</div></div></div>

          <div className="flex rounded-xl bg-zinc-100 p-1">
            {(["login", "register"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => switchMode(m)}
                className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-colors ${mode === m ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"}`}
              >
                {m === "login" ? "Iniciar sesión" : "Registrarse"}
              </button>
            ))}
          </div>

          <div className="mt-8">
            {mode === "login" ? (
              <>
                <h2 className="text-3xl font-semibold tracking-tight">Bienvenido</h2>
                <p className="mt-2 text-sm text-zinc-500">Ingresa para administrar tu barbería.</p>
              </>
            ) : (
              <>
                <h2 className="text-3xl font-semibold tracking-tight">Crea tu cuenta</h2>
                <p className="mt-2 text-sm text-zinc-500">Regístrate como cliente para agendar tus citas.</p>
              </>
            )}
          </div>

          <form onSubmit={submit} className="mt-8 space-y-5">
            {mode === "register" && (
              <label className="block text-sm font-medium">Nombre completo<input value={name} onChange={e=>setName(e.target.value)} type="text" required className="mt-2 h-11 w-full rounded-xl border border-zinc-200 px-4 text-sm shadow-sm focus:border-zinc-900" placeholder="Tu nombre" /></label>
            )}
            <label className="block text-sm font-medium">Correo<input value={email} onChange={e=>setEmail(e.target.value)} type="email" required className="mt-2 h-11 w-full rounded-xl border border-zinc-200 px-4 text-sm shadow-sm focus:border-zinc-900" /></label>
            <label className="block text-sm font-medium">Contraseña<div className="relative mt-2"><input value={password} onChange={e=>setPassword(e.target.value)} type={show ? "text" : "password"} required minLength={mode === "register" ? 8 : undefined} className="h-11 w-full rounded-xl border border-zinc-200 px-4 pr-12 text-sm shadow-sm focus:border-zinc-900" /><button type="button" className="absolute right-2 top-2 h-7 w-8 grid place-items-center text-zinc-500" onClick={()=>setShow(!show)}>{show ? <EyeOff size={17}/> : <Eye size={17}/>}</button></div>{mode === "register" && <span className="mt-1 block text-xs text-zinc-400">Mínimo 8 caracteres.</span>}</label>
            {error && <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
            <button disabled={loading} className="h-11 w-full rounded-xl bg-zinc-950 text-white font-semibold text-sm flex items-center justify-center gap-2 hover:bg-zinc-800 disabled:opacity-60">{loading ? <Loader2 className="animate-spin" size={17}/> : mode === "login" ? <>Iniciar sesión <ArrowRight size={16}/></> : <><UserRoundPlus size={16}/> Crear cuenta</>}</button>
          </form>

          <div className="mt-7 rounded-xl bg-zinc-50 border border-zinc-200 p-4 text-xs text-zinc-500"><strong className="text-zinc-800">Demo:</strong> admin@barberservice.local / Admin123!</div>
        </div>
      </section>
    </main>
  );
}