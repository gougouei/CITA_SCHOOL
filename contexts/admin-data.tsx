"use client";

import { createContext, useContext, useState, ReactNode } from "react";

export interface ClassItem {
  id: string;
  name: string;
  description: string;
  students: number;
  professors: string[];
}

const INITIAL_CLASSES: ClassItem[] = [
  { id: "c1", name: "Initiation Niveau 1", description: "Cours fondamentaux d'initiation à la tradition", students: 8, professors: ["p1", "p2"] },
  { id: "c2", name: "Initiation Niveau 2", description: "Approfondissement des pratiques de base",        students: 6, professors: ["p2"] },
  { id: "c3", name: "Avancé",              description: "Techniques avancées et rituels intermédiaires",  students: 5, professors: ["p1", "p3"] },
  { id: "c4", name: "Maîtrise",            description: "Formation de maîtrise — niveau expert",          students: 3, professors: ["p3"] },
];

interface AdminDataContextType {
  classes: ClassItem[];
  setClasses: React.Dispatch<React.SetStateAction<ClassItem[]>>;
}

const AdminDataContext = createContext<AdminDataContextType | null>(null);

export function AdminDataProvider({ children }: { children: ReactNode }) {
  const [classes, setClasses] = useState<ClassItem[]>(INITIAL_CLASSES);
  return (
    <AdminDataContext.Provider value={{ classes, setClasses }}>
      {children}
    </AdminDataContext.Provider>
  );
}

export function useAdminData() {
  const ctx = useContext(AdminDataContext);
  if (!ctx) throw new Error("useAdminData must be used within AdminDataProvider");
  return ctx;
}
