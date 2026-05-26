import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { AdminDataProvider } from "@/contexts/admin-data";

const adminSections = [
  {
    title: "Principal",
    items: [
      {
        label: "Vue d'ensemble",
        href: "/admin",
        icon: (
          <svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <rect x={3} y={3} width={7} height={7} /><rect x={14} y={3} width={7} height={7} />
            <rect x={14} y={14} width={7} height={7} /><rect x={3} y={14} width={7} height={7} />
          </svg>
        ),
      },
    ],
  },
  {
    title: "Gestion",
    items: [
      {
        label: "Étudiants",
        href: "/admin/etudiants",
        icon: (
          <svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx={9} cy={7} r={4} />
          </svg>
        ),
      },
      {
        label: "Professeurs",
        href: "/admin/professeurs",
        icon: (
          <svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx={12} cy={7} r={4} />
          </svg>
        ),
      },
      {
        label: "Classes",
        href: "/admin/classes",
        icon: (
          <svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
          </svg>
        ),
      },
      {
        label: "Bibliothèques",
        href: "/admin/bibliotheques",
        icon: (
          <svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          </svg>
        ),
      },
      {
        label: "Admissions",
        href: "/admin/admissions",
        icon: (
          <svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
        ),
      },
      {
        label: "Calendrier",
        href: "/admin/calendrier",
        icon: (
          <svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <rect x={3} y={4} width={18} height={18} rx={2} ry={2}/>
            <line x1={16} y1={2} x2={16} y2={6}/><line x1={8} y1={2} x2={8} y2={6}/>
            <line x1={3} y1={10} x2={21} y2={10}/>
          </svg>
        ),
      },
    ],
  },
  {
    title: "Communication",
    items: [
      {
        label: "CitsaOccultBlog",
        href: "/admin/communaute",
        icon: (
          <svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
          </svg>
        ),
      },
      {
        label: "Broadcast Live",
        href: "/admin/broadcast",
        icon: (
          <svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <polygon points="23 7 16 12 23 17 23 7" />
            <rect x={1} y={5} width={15} height={14} rx={2} ry={2} />
          </svg>
        ),
      },
      {
        label: "Historique lives",
        href: "/admin/historique-lives",
        icon: (
          <svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <circle cx={12} cy={12} r={10} />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        ),
      },
      {
        label: "Notifications",
        href: "/admin/notifications",
        icon: (
          <svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        ),
      },
    ],
  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout
      role="admin"
      sections={adminSections}
    >
      <AdminDataProvider>
        {children}
      </AdminDataProvider>
    </DashboardLayout>
  );
}
