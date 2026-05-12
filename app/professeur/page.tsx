"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { createClient } from "@/lib/supabase";

interface MyClass {
  id:           string;
  name:         string;
  description:  string;
  studentCount: number;
}

export default function ProfesseurClassesPage() {
  const supabase = createClient();
  const [classes, setClasses] = useState<MyClass[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadClasses() {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Classes du professeur
        const { data: myMemberships } = await supabase
          .from("class_members")
          .select("class_id")
          .eq("user_id", user.id)
          .eq("role", "professor");

        const classIds = (myMemberships ?? []).map((m) => m.class_id);
        if (classIds.length === 0) {
          setClasses([]);
          return;
        }

        const [classesRes, membersRes] = await Promise.all([
          supabase.from("classes").select("id, name, description").in("id", classIds),
          supabase.from("class_members").select("class_id, role").in("class_id", classIds),
        ]);

        const enriched: MyClass[] = (classesRes.data ?? []).map((c) => ({
          id:           c.id,
          name:         c.name,
          description:  c.description ?? "",
          studentCount: (membersRes.data ?? []).filter(
            (m) => m.class_id === c.id && m.role === "student"
          ).length,
        }));

        setClasses(enriched);
      } finally {
        setLoading(false);
      }
    }
    loadClasses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <header className="bg-white border-b border-border px-4 py-4 sm:px-8 sm:py-5">
        <h1 className="font-serif text-xl sm:text-2xl font-semibold text-[#141414]">Mes Classes</h1>
        <p className="text-sm text-muted-fg mt-0.5">Vos classes assignées par l&apos;administration</p>
      </header>

      <div className="p-4 sm:p-6 lg:p-8">
        {loading ? (
          <div className="text-center py-20 text-muted-fg text-sm">Chargement…</div>
        ) : classes.length === 0 ? (
          <div className="text-center py-16 sm:py-20 border-2 border-dashed border-border rounded-2xl">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted-bg flex items-center justify-center text-2xl">📚</div>
            <p className="text-[#141414] font-semibold mb-1">Aucune classe assignée</p>
            <p className="text-muted-fg text-sm max-w-md mx-auto">
              Contactez l&apos;administration de CITSA pour qu&apos;une classe vous soit assignée.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2">
            {classes.map((c) => (
              <Card key={c.id}>
                <CardBody>
                  <h4 className="font-serif text-[1.1rem] sm:text-[1.25rem] font-semibold mb-2">
                    {c.name}
                  </h4>
                  {c.description && (
                    <p className="text-[0.8rem] text-muted-fg mb-3 line-clamp-2">{c.description}</p>
                  )}
                  <p className="text-sm text-muted-fg mb-5">
                    {c.studentCount} étudiant{c.studentCount > 1 ? "s" : ""}
                  </p>
                  <div className="flex flex-wrap gap-2">
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
        )}
      </div>
    </>
  );
}
