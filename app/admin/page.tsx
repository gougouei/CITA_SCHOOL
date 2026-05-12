import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";

export default function AdminOverviewPage() {
  return (
    <>
      <header className="bg-white border-b border-border px-4 py-4 sm:px-8 sm:py-5 flex justify-between items-center gap-3 flex-wrap">
        <h1 className="font-serif text-xl sm:text-2xl font-semibold text-[#141414]">Vue d&apos;ensemble</h1>
        <Link href="/admin/broadcast">
          <Button variant="accent" size="sm">Lancer un broadcast</Button>
        </Link>
      </header>

      <div className="p-4 sm:p-6 lg:p-8">
        {/* KPI Grid */}
        <div className="grid grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8 lg:grid-cols-4">
          <KpiCard label="Étudiants" value="24" change="+3 ce mois" positive />
          <KpiCard label="Professeurs" value="6" change="+1" positive />
          <KpiCard label="Classes" value="4" change="stable" />
          <KpiCard label="Bibliothèques" value="12" change="+2" positive />
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
          {/* Activity */}
          <Card>
            <div className="px-6 py-5 border-b border-border flex justify-between items-center">
              <CardTitle>Activité récente</CardTitle>
            </div>
            <CardBody className="p-0">
              <div className="divide-y divide-border">
                <ActivityItem
                  icon="👤"
                  iconColor="green"
                  title="Nouvel étudiant inscrit"
                  meta="Kouamé Aya · Il y a 2h"
                />
                <ActivityItem
                  icon="🎬"
                  iconColor="red"
                  title="Live terminé"
                  meta="Prof. Diallo · Il y a 5h"
                />
              </div>
            </CardBody>
          </Card>

          {/* Admissions */}
          <Card>
            <div className="px-6 py-5 border-b border-border">
              <CardTitle>Dernières admissions</CardTitle>
            </div>
            <div>
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="text-left px-6 py-3 text-[0.7rem] font-bold tracking-[0.08em] uppercase text-muted-fg bg-secondary border-b border-border">
                      Nom
                    </th>
                    <th className="text-left px-6 py-3 text-[0.7rem] font-bold tracking-[0.08em] uppercase text-muted-fg bg-secondary border-b border-border">
                      Statut
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="hover:bg-muted-bg">
                    <td className="px-6 py-[0.875rem] text-sm border-b border-border">Kouamé Aya</td>
                    <td className="px-6 py-[0.875rem] text-sm border-b border-border">
                      <Badge variant="warning">En attente</Badge>
                    </td>
                  </tr>
                  <tr className="hover:bg-muted-bg">
                    <td className="px-6 py-[0.875rem] text-sm">Ouattara Moussa</td>
                    <td className="px-6 py-[0.875rem] text-sm">
                      <Badge variant="success">Validé</Badge>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}

function KpiCard({
  label,
  value,
  change,
  positive,
}: {
  label: string;
  value: string;
  change: string;
  positive?: boolean;
}) {
  return (
    <div className="bg-white rounded-xl px-6 py-6 border border-border">
      <div className="text-[0.75rem] font-semibold tracking-[0.05em] uppercase text-muted-fg mb-2">
        {label}
      </div>
      <div className="font-serif text-[2.25rem] font-semibold text-[#141414] leading-none">
        {value}
      </div>
      <div
        className={`text-[0.75rem] mt-2 flex items-center gap-1 ${
          positive ? "text-[hsl(142,70%,35%)]" : "text-muted-fg"
        }`}
      >
        {positive && "↑"} {change}
      </div>
    </div>
  );
}

function ActivityItem({
  icon,
  iconColor,
  title,
  meta,
}: {
  icon: string;
  iconColor: "red" | "green" | "blue";
  title: string;
  meta: string;
}) {
  const bgMap = {
    red: "bg-[hsla(0,75%,45%,0.12)] text-citsa-red-hex",
    green: "bg-[hsla(142,70%,35%,0.12)] text-[hsl(142,70%,35%)]",
    blue: "bg-[hsla(220,70%,50%,0.12)] text-[hsl(220,70%,50%)]",
  };

  return (
    <div className="flex gap-4 px-6 py-4">
      <div
        className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${bgMap[iconColor]}`}
      >
        {icon}
      </div>
      <div className="flex-1">
        <div className="text-sm font-medium">{title}</div>
        <div className="text-[0.75rem] text-muted-fg mt-[0.25rem]">{meta}</div>
      </div>
    </div>
  );
}
