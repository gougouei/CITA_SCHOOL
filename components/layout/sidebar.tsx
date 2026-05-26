"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
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

interface SidebarProps {
  role: UserRole;
  userName: string;
  userInitials: string;
  avatarUrl?: string | null;
  sections: NavSection[];
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ role, userName, userInitials, avatarUrl, sections, isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router   = useRouter();

  // Chemin de la page profil pour le rôle courant
  const profilePath =
    role === "admin"     ? "/admin/profil"      :
    role === "professor" ? "/professeur/profil" :
                           "/etudiant/profil";

  const roleLabel =
    role === "admin"     ? "Administrateur" :
    role === "professor" ? "Professeur"      : "Étudiant";

  return (
    <>
      {/* Backdrop mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "w-[260px] bg-citsa-black text-white px-6 py-6 flex flex-col",
          "fixed top-0 left-0 bottom-0 overflow-y-auto z-50",
          "transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "-translate-x-full",
          "lg:translate-x-0"
        )}
      >
        {/* Logo + fermer mobile */}
        <div className="flex items-center justify-between pb-6 border-b border-white/[0.08] mb-6">
          <div className="flex items-center gap-3 min-w-0">
            <Image
              src="/logo-citsa.jpg"
              alt="CITSA"
              width={40}
              height={40}
              priority
              className="w-10 h-10 object-contain flex-shrink-0"
            />
            <span className="font-serif text-base font-semibold leading-tight truncate">
              {role === "admin" ? "CITSA Admin" : role === "professor" ? "Espace Prof." : "Espace Étudiant"}
            </span>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden w-8 h-8 flex items-center justify-center rounded-md text-white/50 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0 ml-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <nav className="flex-1">
          {sections.map((section) => (
            <div key={section.title} className="mb-6">
              <div className="text-[0.65rem] font-bold tracking-[0.12em] uppercase text-white/35 px-3 py-2">
                {section.title}
              </div>
              {section.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-3 px-3 py-[0.65rem] rounded-md text-sm font-medium transition-all duration-150 no-underline mb-0.5",
                    pathname === item.href || pathname.startsWith(item.href + "/")
                      ? "bg-[rgba(201,29,29,0.15)] text-citsa-red-light"
                      : "text-white/60 hover:bg-white/[0.05] hover:text-white"
                  )}
                >
                  <span className="w-[18px] h-[18px] opacity-70 flex-shrink-0">{item.icon}</span>
                  <span className="flex-1">{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="ml-auto bg-citsa-red-hex text-white text-[0.65rem] font-bold px-[0.4rem] py-[0.15rem] rounded-full">
                      {item.badge}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          ))}
        </nav>

        <div className="pt-4 border-t border-white/[0.08]">
          {/* Profil — cliquable pour ouvrir la page profil */}
          <Link
            href={profilePath}
            onClick={onClose}
            className={cn(
              "flex items-center gap-3 p-2 mb-2 rounded-md transition-colors no-underline",
              pathname.startsWith(profilePath)
                ? "bg-white/[0.08]"
                : "hover:bg-white/[0.05]"
            )}
          >
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt={userName}
                className="w-9 h-9 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-9 h-9 bg-gradient-to-br from-citsa-red-light to-citsa-red rounded-full flex items-center justify-center font-semibold text-[0.8rem] flex-shrink-0">
                {userInitials}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="text-[0.8rem] font-semibold text-white truncate">{userName}</div>
              <div className="text-[0.7rem] text-white/50">{roleLabel}</div>
            </div>
          </Link>

          <button
            onClick={async () => {
              const supabase = (await import("@/lib/supabase")).createClient();
              await supabase.auth.signOut();
              router.push("/connexion");
            }}
            className="flex items-center gap-3 px-3 py-[0.65rem] rounded-md text-sm font-medium text-white/60 hover:bg-white/[0.05] hover:text-white transition-all duration-150 w-full text-left"
          >
            <svg className="w-[18px] h-[18px] opacity-70 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1={21} y1={12} x2={9} y2={12}/>
            </svg>
            Déconnexion
          </button>
        </div>
      </aside>
    </>
  );
}
