import { Card } from "@/components/ui/card";

export default function EtudiantLivePage() {
  return (
    <>
      <header className="bg-white border-b border-border px-8 py-5">
        <h1 className="font-serif text-2xl font-semibold text-[#141414]">Cours Live</h1>
      </header>
      <div className="p-8">
        <Card>
          <div className="bg-citsa-black px-6 py-4 flex items-center gap-4">
            <div className="flex items-center gap-2 bg-[hsla(0,84%,60%,0.12)] text-destructive px-3 py-1 rounded-full text-[0.7rem] font-bold uppercase tracking-[0.05em]">
              <span className="w-1.5 h-1.5 bg-destructive rounded-full animate-pulse" />
              EN DIRECT
            </div>
            <h3 className="font-serif text-base font-semibold text-white">Méditation — Séance 3</h3>
          </div>
          <div className="bg-citsa-black aspect-video flex flex-col items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_hsla(0,75%,45%,0.15),_transparent_60%)]" />
            <button className="relative w-20 h-20 bg-citsa-red-hex rounded-full flex items-center justify-center hover:scale-105 hover:bg-citsa-red-light transition-all duration-200">
              <svg fill="white" viewBox="0 0 24 24" className="w-8 h-8 ml-1">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            </button>
          </div>
        </Card>
      </div>
    </>
  );
}
