import { DashboardLayout } from "@/components/layout/dashboard-layout";

const professorSections = [
  {
    title: "Enseignement",
    items: [
      {
        label: "Mes Classes",
        href: "/professeur",
        icon: (
          <svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
          </svg>
        ),
      },
      {
        label: "Cours Live",
        href: "/professeur/live",
        icon: (
          <svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <polygon points="23 7 16 12 23 17 23 7" />
            <rect x={1} y={5} width={15} height={14} rx={2} ry={2} />
          </svg>
        ),
      },
      {
        label: "Exercices",
        href: "/professeur/exercices",
        icon: (
          <svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
        ),
      },
      {
        label: "Bibliothèques",
        href: "/professeur/bibliotheques",
        icon: (
          <svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          </svg>
        ),
      },
    ],
  },
  {
    title: "Communication",
    items: [
      {
        label: "Messagerie",
        href: "/professeur/messagerie",
        badge: 3,
        icon: (
          <svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        ),
      },
    ],
  },
];

export default function ProfesseurLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout
      role="professor"
      userName="Prof. Diallo"
      userInitials="AD"
      sections={professorSections}
    >
      {children}
    </DashboardLayout>
  );
}
