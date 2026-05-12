"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { createClient } from "@/lib/supabase";

interface MyClass {
  id:           string;
  name:         string;
  studentCount: number;
}

export default function EtudiantDashboardPage() {
  const supabase = createClient();
  const [classes, setClasses] = useState<MyClass[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadClasses() {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Récupérer les classes où l'étudiant est inscrit
        const { data: myMemberships } = await supabase
          .from("class_members")
          .select("class_id")
          .eq("user_id", user.id)
          .eq("role", "student");

        const classIds = (myMemberships ?? []).map((m) => m.class_id);
        if (classIds.length === 0) {
          setClasses([]);
          return;
        }

        const [classesRes, allMembersRes] = await Promise.all([
          supabase.from("classes").select("id, name").in("id", classIds),
          supabase.from("class_members").select("class_id, role").in("class_id", classIds),
        ]);

        const enriched: MyClass[] = (classesRes.data ?? []).map((c) => ({
          id:           c.id,
          name:         c.name,
          studentCount: (allMembersRes.data ?? []).filter(
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
        <h1 className="font-serif text-xl sm:text-2xl font-semibold text-[#141414]">Tableau de bord</h1>
        <p className="text-sm text-muted-fg mt-0.5">Bienvenue dans votre espace étudiant</p>
      </header>

      <div className="p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">

          {/* Notifications */}
          <Card>
            <CardHeader className="px-6 py-5 border-b border-border">
              <CardTitle>Notifications</CardTitle>
            </CardHeader>
            <CardBody className="p-0">
              <div className="px-6 py-10 text-center text-muted-fg text-sm">
                Aucune notification pour le moment.
              </div>
            </CardBody>
          </Card>

          {/* Mes Classes */}
          <Card>
            <CardHeader className="px-6 py-5 border-b border-border">
              <CardTitle>Mes Classes</CardTitle>
            </CardHeader>
            <CardBody className="flex flex-col gap-3">
              {loading ? (
                <p className="text-center text-muted-fg text-sm py-6">Chargement…</p>
              ) : classes.length === 0 ? (
                <p className="text-center text-muted-fg text-sm py-6">
                  Vous n&apos;êtes inscrit dans aucune classe pour le moment.
                </p>
              ) : (
                classes.map((c) => (
                  <div key={c.id} className="p-4 bg-secondary rounded-lg">
                    <h4 className="font-semibold text-sm">{c.name}</h4>
                    <p className="text-sm text-muted-fg">
                      {c.studentCount} étudiant{c.studentCount > 1 ? "s" : ""}
                    </p>
                  </div>
                ))
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
