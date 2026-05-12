import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function EtudiantExercicesPage() {
  return (
    <>
      <header className="bg-white border-b border-border px-8 py-5">
        <h1 className="font-serif text-2xl font-semibold text-[#141414]">Exercices</h1>
      </header>
      <div className="p-8">
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {["Titre", "Statut", "Date limite", "Action"].map((h) => (
                    <th key={h} className="text-left px-6 py-3 text-[0.7rem] font-bold tracking-[0.08em] uppercase text-muted-fg bg-secondary border-b border-border">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <ExerciseRow title="QCM — Rituels" status="todo" deadline="15 Jan" />
                <ExerciseRow title="Exercice — Méditation" status="done" deadline="10 Jan" />
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </>
  );
}

function ExerciseRow({
  title, status, deadline,
}: {
  title: string; status: "todo" | "done"; deadline: string;
}) {
  return (
    <tr className={`border-b border-border last:border-0 hover:bg-muted-bg ${status === "todo" ? "bg-[hsla(0,75%,45%,0.03)]" : ""}`}>
      <td className="px-6 py-[0.875rem] text-sm font-semibold">{title}</td>
      <td className="px-6 py-[0.875rem] text-sm">
        {status === "todo" ? <Badge variant="warning">À faire</Badge> : <Badge variant="success">Complété</Badge>}
      </td>
      <td className="px-6 py-[0.875rem] text-sm text-muted-fg">{deadline}</td>
      <td className="px-6 py-[0.875rem] text-sm">
        {status === "todo"
          ? <Button variant="accent" size="sm">Commencer</Button>
          : <Button variant="outline" size="sm">Voir</Button>}
      </td>
    </tr>
  );
}
