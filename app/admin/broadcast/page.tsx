"use client";

import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";

export default function AdminBroadcastPage() {
  return (
    <>
      <header className="bg-white border-b border-border px-8 py-5">
        <h1 className="font-serif text-2xl font-semibold text-[#141414]">Broadcasting Live</h1>
      </header>
      <div className="p-8">
        <Card>
          <CardBody className="p-8">
            {/* Video placeholder */}
            <div className="bg-citsa-black rounded-xl aspect-video flex flex-col items-center justify-center relative overflow-hidden max-w-[700px] mx-auto">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_hsla(0,75%,45%,0.15),_transparent_60%)]" />
              <button className="relative w-20 h-20 bg-citsa-red-hex rounded-full flex items-center justify-center cursor-pointer hover:scale-105 hover:bg-citsa-red-light transition-all duration-200">
                <svg fill="white" viewBox="0 0 24 24" className="w-8 h-8 ml-1">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              </button>
              <p className="relative mt-6 text-sm text-white/60">Cliquez pour démarrer la caméra</p>
            </div>

            <div className="text-center mt-8">
              <Button variant="accent" size="lg" className="gap-3">
                <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                Lancer le broadcast global
              </Button>
              <p className="mt-3 text-sm text-muted-fg">
                Une notification sera envoyée à tous les étudiants.
              </p>
            </div>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
