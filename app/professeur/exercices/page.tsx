import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function ProfesseurExercicesPage() {
  return (
    <>
      <header className="bg-white border-b border-border px-8 py-5 flex justify-between items-center">
        <h1 className="font-serif text-2xl font-semibold text-[#141414]">Exercices & Quiz</h1>
        <Button variant="accent">+ Créer un Quiz</Button>
      </header>
      <div className="p-8">
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {["Titre", "Type", "Classe", "Soumissions", "Actions"].map((h) => (
                    <th key={h} className="text-left px-6 py-3 text-[0.7rem] font-bold tracking-[0.08em] uppercase text-muted-fg bg-secondary border-b border-border">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <ExerciseRow title="QCM — Rituels" type="QCM" classe="Initiation Niv.1" submissions="6/8" />
                <ExerciseRow title="Exercice — Méditation" type="PDF" classe="Initiation Niv.2" submissions="10/14" />
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </>
  );
}

function ExerciseRow({
  title, type, classe, submissions,
}: {
  title: string; type: string; classe: string; submissions: string;
}) {
  return (
    <tr className="hover:bg-muted-bg border-b border-border last:border-0">
      <td className="px-6 py-[0.875rem] text-sm font-semibold">{title}</td>
      <td className="px-6 py-[0.875rem] text-sm"><Badge variant="muted">{type}</Badge></td>
      <td className="px-6 py-[0.875rem] text-sm text-muted-fg">{classe}</td>
      <td className="px-6 py-[0.875rem] text-sm text-muted-fg">{submissions}</td>
      <td className="px-6 py-[0.875rem] text-sm">
        <div className="flex gap-2">
          <Button variant="outline" size="sm">Voir résultats</Button>
          <Button variant="destructive" size="sm">Supprimer</Button>
        </div>
      </td>
    </tr>
  );
}
