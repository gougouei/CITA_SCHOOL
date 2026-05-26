"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";

export function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-[100] bg-[rgba(20,20,20,0.95)] backdrop-blur-[12px] border-b border-white/[0.08] px-4 sm:px-8 py-3 sm:py-4 flex justify-between items-center">
      <Link href="/" className="flex items-center no-underline text-white">
        <Image
          src="/logo-citsa.jpg"
          alt="CITSA"
          width={48}
          height={48}
          priority
          className="w-9 h-9 sm:w-11 sm:h-11 object-contain flex-shrink-0"
        />
      </Link>
      <Link href="/connexion">
        <Button variant="ghost" size="sm">Connexion</Button>
      </Link>
    </nav>
  );
}
