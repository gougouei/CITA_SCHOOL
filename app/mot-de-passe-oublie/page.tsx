"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Mail, MessageCircle, KeyRound } from "lucide-react";

export default function MotDePasseOubliePage() {
  const [username, setUsername] = useState("");
  const [copied, setCopied] = useState(false);

  const contactEmail = "admin@citsa-school.com";
  const whatsappNumber = "+22900000000"; // À remplacer par le vrai numéro

  function copyMessage() {
    const message = `Bonjour, je suis ${username || "[votre nom]"}, et j'ai oublié mon mot de passe d'accès à CITSA School. Merci de bien vouloir le réinitialiser.`;
    navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="min-h-screen bg-citsa-black flex items-center justify-center px-4 sm:px-8 py-8 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_100%_100%_at_50%_100%,_hsla(0,75%,45%,0.12),_transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,_hsla(30,40%,25%,0.15),_transparent_40%)]" />

      <div className="relative w-full max-w-[480px] bg-[rgba(30,30,30,0.8)] backdrop-blur-[20px] border border-white/[0.08] rounded-2xl px-6 sm:px-10 py-10 sm:py-12 shadow-elevated">
        {/* Header */}
        <div className="text-center mb-7">
          <div className="w-14 h-14 bg-gradient-to-br from-citsa-red to-citsa-red-dark rounded-lg flex items-center justify-center mx-auto mb-5">
            <KeyRound size={26} className="text-white" />
          </div>
          <h1 className="font-serif text-[1.5rem] font-semibold text-white mb-2">Mot de passe oublié</h1>
          <p className="text-sm text-white/60 leading-relaxed">
            Pour des raisons de sécurité, seul l&apos;administrateur peut réinitialiser votre mot de passe.
          </p>
        </div>

        {/* Form: username pour personnaliser le message */}
        <div className="flex flex-col gap-[0.4rem] mb-6">
          <label className="text-[0.8rem] font-medium text-white/70">Votre nom d&apos;utilisateur (optionnel)</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="ex. jean.dupont"
            className="font-sans text-sm bg-white/[0.05] border border-white/10 text-white rounded-md px-[0.875rem] h-10 outline-none placeholder:text-white/30 focus:border-citsa-red-hex focus:bg-white/[0.08] transition-all"
          />
          <p className="text-[0.7rem] text-white/40 mt-1">
            Indiquer votre username permettra à l&apos;admin de vous retrouver plus vite.
          </p>
        </div>

        {/* Méthodes de contact */}
        <div className="flex flex-col gap-3 mb-6">
          <a
            href={`mailto:${contactEmail}?subject=Réinitialisation%20de%20mot%20de%20passe%20-%20CITSA&body=${encodeURIComponent(
              `Bonjour,\n\nJe suis ${username || "[votre nom]"} et j'ai oublié mon mot de passe d'accès à mon espace CITSA School. Merci de bien vouloir le réinitialiser.\n\nCordialement,`
            )}`}
            className="group flex items-center gap-4 px-4 py-4 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/20 transition-all"
          >
            <div className="w-10 h-10 rounded-lg bg-[hsla(200,70%,50%,0.15)] flex items-center justify-center flex-shrink-0">
              <Mail size={18} className="text-[hsl(200,70%,65%)]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white">Email administrateur</p>
              <p className="text-[0.78rem] text-white/50 truncate">{contactEmail}</p>
            </div>
            <span className="text-[0.7rem] text-white/40 group-hover:text-white/70 transition-colors">Envoyer →</span>
          </a>

          <a
            href={`https://wa.me/${whatsappNumber.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
              `Bonjour, je suis ${username || "[votre nom]"} et j'ai oublié mon mot de passe CITSA School. Merci de le réinitialiser.`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-4 px-4 py-4 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/20 transition-all"
          >
            <div className="w-10 h-10 rounded-lg bg-[hsla(142,70%,40%,0.15)] flex items-center justify-center flex-shrink-0">
              <MessageCircle size={18} className="text-[hsl(142,70%,55%)]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white">WhatsApp</p>
              <p className="text-[0.78rem] text-white/50">{whatsappNumber}</p>
            </div>
            <span className="text-[0.7rem] text-white/40 group-hover:text-white/70 transition-colors">Ouvrir →</span>
          </a>
        </div>

        {/* Copier le message */}
        <Button
          variant="outline"
          size="sm"
          onClick={copyMessage}
          className="w-full border-white/15 text-white/70 hover:bg-white/[0.06] hover:text-white"
        >
          {copied ? "✓ Message copié" : "Copier un message type"}
        </Button>

        {/* Aide */}
        <div className="mt-6 px-4 py-3 rounded-lg bg-[hsla(38,90%,50%,0.08)] border border-[hsla(38,90%,50%,0.2)]">
          <p className="text-[0.72rem] text-[hsl(38,80%,75%)] leading-relaxed">
            💡 L&apos;administrateur vous fournira un nouveau mot de passe que vous pourrez utiliser immédiatement pour vous connecter.
          </p>
        </div>

        {/* Footer */}
        <div className="text-center mt-7">
          <Link href="/connexion" className="text-[0.8rem] text-white/50 hover:text-white transition-colors no-underline">
            ← Retour à la connexion
          </Link>
        </div>
      </div>
    </div>
  );
}
