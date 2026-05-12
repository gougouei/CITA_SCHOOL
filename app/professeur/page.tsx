import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";

const classes = [
  { name: "Initiation Niveau 1", students: 8 },
  { name: "Initiation Niveau 2", students: 6 },
];

export default function ProfesseurClassesPage() {
  return (
    <>
      <header className="bg-white border-b border-border px-4 py-4 sm:px-8 sm:py-5">
        <h1 className="font-serif text-xl sm:text-2xl font-semibold text-[#141414]">Mes Classes</h1>
      </header>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2">
          {classes.map((c) => (
            <Card key={c.name}>
              <CardBody>
                <h4 className="font-serif text-[1.25rem] font-semibold mb-3">{c.name}</h4>
                <p className="text-sm text-muted-fg mb-5">{c.students} étudiants</p>
                <div className="flex gap-3">
                  <Link href="/professeur/live">
                    <Button variant="accent" size="sm">Lancer un live</Button>
                  </Link>
                  <Link href="/professeur/exercices">
                    <Button variant="outline" size="sm">Exercices</Button>
                  </Link>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      </div>
    </>
  );
}
