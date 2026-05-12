"use client";

import { Card } from "@/components/ui/card";

export default function EtudiantLivePage() {
  return (
    <>
      <header className="bg-white border-b border-border px-4 py-4 sm:px-8 sm:py-5">
        <h1 className="font-serif text-xl sm:text-2xl font-semibold text-[#141414]">Cours Live</h1>
        <p className="text-sm text-muted-fg mt-0.5">Rejoignez les sessions de cours en direct</p>
      </header>

      <div className="p-4 sm:p-6 lg:p-8">
        <Card>
          <div className="px-6 py-16 sm:py-20 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted-bg flex items-center justify-center">
              <svg className="w-7 h-7 text-muted-fg" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <polygon points="23 7 16 12 23 17 23 7"/>
                <rect x={1} y={5} width={15} height={14} rx={2} ry={2}/>
              </svg>
            </div>
            <p className="text-[#141414] font-semibold mb-1">Aucun cours en direct</p>
            <p className="text-muted-fg text-sm max-w-md mx-auto">
              Vous serez notifié dès qu&apos;un professeur lancera un cours live dans l&apos;une
              de vos classes.
            </p>
          </div>
        </Card>
      </div>
    </>
  );
}
