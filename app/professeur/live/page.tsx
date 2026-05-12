"use client";

import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";

export default function ProfesseurLivePage() {
  return (
    <>
      <header className="bg-white border-b border-border px-8 py-5">
        <h1 className="font-serif text-2xl font-semibold text-[#141414]">Cours en Live</h1>
      </header>
      <div className="p-8">
        <Card>
          <CardBody className="p-8">
            <div className="bg-citsa-black rounded-xl aspect-video flex flex-col items-center justify-center relative overflow-hidden max-w-[600px]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_hsla(0,75%,45%,0.15),_transparent_60%)]" />
              <button className="relative w-20 h-20 bg-citsa-red-hex rounded-full flex items-center justify-center hover:scale-105 hover:bg-citsa-red-light transition-all duration-200">
                <svg fill="white" viewBox="0 0 24 24" className="w-8 h-8 ml-1">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              </button>
              <p className="relative mt-6 text-sm text-white/60">Prévisualisation webcam</p>
            </div>
            <div className="mt-6">
              <Button variant="accent" size="lg" className="gap-3">
                <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                Démarrer le live
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
