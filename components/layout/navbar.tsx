"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-[100] bg-[rgba(20,20,20,0.95)] backdrop-blur-[12px] border-b border-white/[0.08] px-4 sm:px-8 py-3 sm:py-4 flex justify-between items-center">
      <Link href="/" className="flex items-center gap-2 sm:gap-3 no-underline text-white">
        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-citsa-red to-citsa-red-dark rounded-md flex items-center justify-center font-serif font-bold text-lg sm:text-xl text-white flex-shrink-0">
          C
        </div>
        <span className="font-serif text-base sm:text-xl font-semibold tracking-[-0.01em]">
          CITSA <span className="text-citsa-red-light hidden xs:inline">International</span>
        </span>
      </Link>
      <Link href="/connexion">
        <Button variant="ghost" size="sm">Connexion</Button>
      </Link>
    </nav>
  );
}
