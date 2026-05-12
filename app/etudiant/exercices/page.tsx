"use client";

import { Card } from "@/components/ui/card";

export default function EtudiantExercicesPage() {
  return (
    <>
      <header className="bg-white border-b border-border px-4 py-4 sm:px-8 sm:py-5">
        <h1 className="font-serif text-xl sm:text-2xl font-semibold text-[#141414]">Exercices</h1>
        <p className="text-sm text-muted-fg mt-0.5">Retrouvez ici vos exercices et quiz à compléter</p>
      </header>

      <div className="p-4 sm:p-6 lg:p-8">
        <Card>
          <div className="px-6 py-16 sm:py-20 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted-bg flex items-center justify-center">
              <svg className="w-7 h-7 text-muted-fg" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
            </div>
            <p className="text-[#141414] font-semibold mb-1">Aucun exercice disponible</p>
            <p className="text-muted-fg text-sm max-w-md mx-auto">
              Les exercices et quiz publiés par vos professeurs apparaîtront ici dès qu&apos;ils
              seront disponibles dans vos classes.
            </p>
          </div>
        </Card>
      </div>
    </>
  );
}
