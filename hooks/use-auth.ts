"use client";

import { useEffect, useState } from "react";
import { AuthService } from "@/services/auth.service";
import type { Profile } from "@/types";

export function useAuth() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AuthService.getCurrentUser().then((result) => {
      setProfile(result?.profile ?? null);
      setLoading(false);
    });

    const { data: subscription } = AuthService.onAuthStateChange((p) => {
      setProfile(p);
      setLoading(false);
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  return { profile, loading, isAuthenticated: !!profile };
}
