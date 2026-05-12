"use client";

import { Card } from "@/components/ui/card";

export default function EtudiantMesseriePage() {
  return (
    <>
      <header className="bg-white border-b border-border px-4 py-4 sm:px-8 sm:py-5">
        <h1 className="font-serif text-xl sm:text-2xl font-semibold text-[#141414]">Messagerie</h1>
        <p className="text-sm text-muted-fg mt-0.5">Échangez avec vos professeurs et camarades de classe</p>
      </header>

      <div className="p-4 sm:p-6 lg:p-8">
        <Card>
          <div className="px-6 py-16 sm:py-20 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted-bg flex items-center justify-center">
              <svg className="w-7 h-7 text-muted-fg" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <p className="text-[#141414] font-semibold mb-1">Aucune conversation</p>
            <p className="text-muted-fg text-sm max-w-md mx-auto">
              Vous serez automatiquement ajouté aux canaux de discussion de vos classes
              dès que vous y serez inscrit.
            </p>
          </div>
        </Card>
      </div>
    </>
  );
}
