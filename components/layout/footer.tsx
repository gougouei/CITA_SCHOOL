import Link from "next/link";

export function Footer() {
  return (
    <footer className="bg-citsa-black text-white px-8 pt-16 pb-8 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-citsa-red-hex to-transparent" />
      <div className="max-w-[1200px] mx-auto">
        <div className="flex justify-between items-start flex-wrap gap-12 pb-12 border-b border-white/10">
          <div className="max-w-[300px]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 bg-gradient-to-br from-citsa-red to-citsa-red-dark rounded-sm flex items-center justify-center font-serif font-bold text-base text-white">
                C
              </div>
              <span className="font-serif text-[1.1rem] font-semibold">CITSA International</span>
            </div>
            <p className="text-sm text-white/50 leading-relaxed">
              École dédiée à la transmission de la sagesse ancestrale africaine.
            </p>
          </div>

          <div className="flex gap-16">
            <div>
              <h4 className="text-[0.7rem] font-bold tracking-[0.1em] uppercase text-white/40 mb-4">
                Navigation
              </h4>
              <nav className="flex flex-col gap-1">
                <Link href="/" className="text-sm text-white/70 hover:text-white transition-colors py-[0.35rem] no-underline">
                  Accueil
                </Link>
                <Link href="/#admission" className="text-sm text-white/70 hover:text-white transition-colors py-[0.35rem] no-underline">
                  Admission
                </Link>
                <Link href="/connexion" className="text-sm text-white/70 hover:text-white transition-colors py-[0.35rem] no-underline">
                  Connexion
                </Link>
              </nav>
            </div>
          </div>
        </div>

        <div className="pt-8 flex justify-between items-center flex-wrap gap-4 text-[0.8rem] text-white/40">
          <span>© 2025 CITSA. Tous droits réservés.</span>
        </div>
      </div>
    </footer>
  );
}
