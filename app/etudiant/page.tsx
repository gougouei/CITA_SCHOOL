import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";

export default function EtudiantDashboardPage() {
  return (
    <>
      <header className="bg-white border-b border-border px-4 py-4 sm:px-8 sm:py-5">
        <h1 className="font-serif text-xl sm:text-2xl font-semibold text-[#141414]">Tableau de bord</h1>
      </header>
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Live banner */}
        <div className="mb-6 bg-white border-2 border-citsa-red-hex rounded-xl px-4 py-3 sm:px-6 sm:py-4 flex items-center gap-3 sm:gap-6 flex-wrap">
          <div className="flex items-center gap-2 bg-[hsla(0,84%,60%,0.12)] text-destructive px-4 py-2 rounded-full text-[0.7rem] font-bold uppercase tracking-[0.05em]">
            <span className="w-1.5 h-1.5 bg-destructive rounded-full animate-pulse" />
            EN DIRECT
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-[0.9rem]">Méditation — Séance 3</h4>
            <p className="text-sm text-muted-fg">Prof. Diallo</p>
          </div>
          <Link href="/etudiant/live">
            <Button variant="accent">Rejoindre</Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
          {/* Notifications */}
          <Card>
            <CardHeader className="px-6 py-5 border-b border-border">
              <CardTitle>Notifications</CardTitle>
            </CardHeader>
            <CardBody className="p-0">
              <div className="divide-y divide-border">
                <NotifItem icon="🎬" iconColor="red" title="Live en cours" meta="Maintenant" />
                <NotifItem icon="📄" iconColor="blue" title="Nouveau QCM disponible" meta="Il y a 2h" />
              </div>
            </CardBody>
          </Card>

          {/* Classes */}
          <Card>
            <CardHeader className="px-6 py-5 border-b border-border">
              <CardTitle>Mes Classes</CardTitle>
            </CardHeader>
            <CardBody className="flex flex-col gap-3">
              <div className="p-4 bg-secondary rounded-lg">
                <h4 className="font-semibold text-sm">Initiation Niveau 1</h4>
                <p className="text-sm text-muted-fg">8 étudiants</p>
              </div>
              <div className="p-4 bg-secondary rounded-lg">
                <h4 className="font-semibold text-sm">Initiation Niveau 2</h4>
                <p className="text-sm text-muted-fg">6 étudiants</p>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}

function NotifItem({
  icon, iconColor, title, meta,
}: {
  icon: string; iconColor: "red" | "blue" | "green"; title: string; meta: string;
}) {
  const bgMap = {
    red: "bg-[hsla(0,75%,45%,0.12)] text-citsa-red-hex",
    green: "bg-[hsla(142,70%,35%,0.12)] text-[hsl(142,70%,35%)]",
    blue: "bg-[hsla(220,70%,50%,0.12)] text-[hsl(220,70%,50%)]",
  };
  return (
    <div className="flex gap-4 px-6 py-4">
      <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${bgMap[iconColor]}`}>
        {icon}
      </div>
      <div className="flex-1">
        <div className="text-sm font-medium">{title}</div>
        <div className="text-[0.75rem] text-muted-fg mt-[0.25rem]">{meta}</div>
      </div>
    </div>
  );
}
