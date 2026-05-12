"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";

export default function ConnexionPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const username = formData.get("username") as string;
    const password = formData.get("password") as string;

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Identifiants incorrects");
        return;
      }

      const role = data.role as string;
      if (role === "admin") router.push("/admin");
      else if (role === "professor") router.push("/professeur");
      else router.push("/etudiant");
    } catch {
      setError("Erreur de connexion. Veuillez réessayer.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-citsa-black flex items-center justify-center px-8 relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_100%_100%_at_50%_100%,_hsla(0,75%,45%,0.12),_transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,_hsla(30,40%,25%,0.15),_transparent_40%)]" />
      {/* Pattern */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='40' cy='40' r='30' fill='none' stroke='white' stroke-width='1'/%3E%3Ccircle cx='40' cy='40' r='15' fill='none' stroke='white' stroke-width='1'/%3E%3Cline x1='40' y1='0' x2='40' y2='80' stroke='white' stroke-width='0.5'/%3E%3Cline x1='0' y1='40' x2='80' y2='40' stroke='white' stroke-width='0.5'/%3E%3C/svg%3E")`,
          backgroundSize: "80px 80px",
        }}
      />

      <div className="relative w-full max-w-[420px] bg-[rgba(30,30,30,0.8)] backdrop-blur-[20px] border border-white/[0.08] rounded-2xl px-10 py-12 shadow-elevated">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-gradient-to-br from-citsa-red to-citsa-red-dark rounded-lg flex items-center justify-center font-serif font-bold text-[1.5rem] text-white mx-auto mb-5">
            C
          </div>
          <h1 className="font-serif text-[1.5rem] font-semibold text-white mb-2">Connexion</h1>
          <p className="text-sm text-white/50">Accédez à votre espace personnel</p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-[hsl(0,84%,60%,0.12)] border border-[hsl(0,84%,60%,0.25)] text-[hsl(0,70%,35%)] text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-[0.4rem]">
            <label className="text-[0.8rem] font-medium text-white/70">Nom d&apos;utilisateur</label>
            <input
              name="username"
              type="text"
              placeholder="Entrez votre identifiant"
              required
              autoComplete="username"
              className="font-sans text-sm bg-white/[0.05] border border-white/10 text-white rounded-md px-[0.875rem] h-10 outline-none placeholder:text-white/30 focus:border-citsa-red-hex focus:bg-white/[0.08] transition-all"
            />
          </div>

          <div className="flex flex-col gap-[0.4rem]">
            <label className="text-[0.8rem] font-medium text-white/70">Mot de passe</label>
            <div className="relative">
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Entrez votre mot de passe"
                required
                autoComplete="current-password"
                className="font-sans text-sm bg-white/[0.05] border border-white/10 text-white rounded-md px-[0.875rem] pr-10 h-10 w-full outline-none placeholder:text-white/30 focus:border-citsa-red-hex focus:bg-white/[0.08] transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors bg-none border-none cursor-pointer p-1"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="flex justify-end">
            <Link href="/mot-de-passe-oublie" className="text-[0.8rem] text-citsa-red-light hover:underline no-underline">
              Mot de passe oublié ?
            </Link>
          </div>

          <Button
            type="submit"
            variant="accent"
            size="lg"
            className="w-full mt-2"
            disabled={isLoading}
          >
            {isLoading ? "Connexion en cours..." : "Se connecter"}
          </Button>
        </form>

        <div className="text-center mt-6">
          <Link href="/" className="text-[0.8rem] text-white/50 hover:text-white transition-colors no-underline">
            ← Retour à l&apos;accueil
          </Link>
        </div>
      </div>
    </div>
  );
}
