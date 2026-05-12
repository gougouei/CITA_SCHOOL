import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function AdminAdmissionsPage() {
  return (
    <>
      <header className="bg-white border-b border-border px-8 py-5">
        <h1 className="font-serif text-2xl font-semibold text-[#141414]">Demandes d&apos;Admission</h1>
      </header>
      <div className="p-8">
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {["Nom complet", "Pays", "Profession", "Date", "Statut", "Actions"].map((h) => (
                    <th key={h} className="text-left px-6 py-3 text-[0.7rem] font-bold tracking-[0.08em] uppercase text-muted-fg bg-secondary border-b border-border">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <AdmissionRow
                  name="Kouamé Aya"
                  country="Côte d'Ivoire"
                  profession="Médecin"
                  date="10 Jan 2025"
                  status="pending"
                />
                <AdmissionRow
                  name="Ouattara Moussa"
                  country="Bénin"
                  profession="Enseignant"
                  date="8 Jan 2025"
                  status="approved"
                />
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </>
  );
}

function AdmissionRow({
  name, country, profession, date, status,
}: {
  name: string; country: string; profession: string; date: string; status: "pending" | "approved" | "rejected";
}) {
  const badgeMap = {
    pending: <Badge variant="warning">En attente</Badge>,
    approved: <Badge variant="success">Approuvé</Badge>,
    rejected: <Badge variant="destructive">Rejeté</Badge>,
  };
  return (
    <tr className="hover:bg-muted-bg border-b border-border last:border-0">
      <td className="px-6 py-[0.875rem] text-sm font-semibold">{name}</td>
      <td className="px-6 py-[0.875rem] text-sm text-muted-fg">{country}</td>
      <td className="px-6 py-[0.875rem] text-sm text-muted-fg">{profession}</td>
      <td className="px-6 py-[0.875rem] text-sm text-muted-fg">{date}</td>
      <td className="px-6 py-[0.875rem] text-sm">{badgeMap[status]}</td>
      <td className="px-6 py-[0.875rem] text-sm">
        {status === "pending" && (
          <div className="flex gap-2">
            <Button variant="accent" size="sm">Approuver</Button>
            <Button variant="outline" size="sm">Rejeter</Button>
          </div>
        )}
      </td>
    </tr>
  );
}
