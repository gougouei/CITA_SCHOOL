"use client";

import { useState } from "react";
import { Sidebar } from "./sidebar";
import type { UserRole } from "@/types";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: number;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

interface DashboardLayoutProps {
  children: React.ReactNode;
  role: UserRole;
  userName: string;
  userInitials: string;
  sections: NavSection[];
}

export function DashboardLayout({
  children,
  role,
  userName,
  userInitials,
  sections,
}: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const roleLabel =
    role === "admin"     ? "CITSA Admin"       :
    role === "professor" ? "Espace Professeur" : "Espace Étudiant";

  return (
    <div className="flex min-h-screen">
      <Sidebar
        role={role}
        userName={userName}
        userInitials={userInitials}
        sections={sections}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex-1 lg:ml-[260px] bg-secondary min-h-screen flex flex-col">
        {/* Barre mobile — cachée sur lg+ */}
        <div className="lg:hidden sticky top-0 z-30 bg-citsa-black text-white px-4 py-3 flex items-center gap-3 border-b border-white/10 flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="w-9 h-9 flex items-center justify-center rounded-md text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Ouvrir le menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <line x1={3} y1={6}  x2={21} y2={6}/>
              <line x1={3} y1={12} x2={21} y2={12}/>
              <line x1={3} y1={18} x2={21} y2={18}/>
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-gradient-to-br from-citsa-red to-citsa-red-dark rounded-sm flex items-center justify-center font-serif font-bold text-sm">
              C
            </div>
            <span className="font-serif text-sm font-semibold">{roleLabel}</span>
          </div>
        </div>

        {/* Contenu de la page */}
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
