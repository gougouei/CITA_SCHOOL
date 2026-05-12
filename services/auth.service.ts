import { createClient } from "@/lib/supabase";
import type { Profile } from "@/types";

const CITSA_DOMAIN = "citsa.internal";

function toInternalEmail(username: string): string {
  return `${username.toLowerCase().trim()}@${CITSA_DOMAIN}`;
}

export const AuthService = {
  async signIn(username: string, password: string) {
    const supabase = createClient();
    const email = toInternalEmail(username);

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    const profile = await this.getProfileById(data.user.id);
    if (!profile) throw new Error("Profil introuvable");
    if (!profile.is_active) {
      await supabase.auth.signOut();
      throw new Error("Votre compte est désactivé. Contactez l'administration.");
    }

    return { user: data.user, profile };
  },

  async signOut() {
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getCurrentUser(): Promise<{ profile: Profile } | null> {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    const profile = await this.getProfileById(session.user.id);
    if (!profile || !profile.is_active) return null;

    return { profile };
  },

  async getProfileById(userId: string): Promise<Profile | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) return null;
    return data as Profile;
  },

  onAuthStateChange(callback: (profile: Profile | null) => void) {
    const supabase = createClient();
    return supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session) return callback(null);
      const profile = await this.getProfileById(session.user.id);
      callback(profile);
    });
  },
};
