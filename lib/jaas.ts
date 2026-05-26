import jwt from "jsonwebtoken";

/**
 * Helpers pour Jitsi as a Service (JaaS) — https://jaas.8x8.vc/
 *
 * JaaS exige un JWT signé en RS256 avec la clé privée fournie par 8x8.
 * Le JWT autorise un utilisateur à rejoindre une room donnée, avec ou sans
 * privilèges de modérateur.
 */

export interface JaasTokenOptions {
  /** Nom de la room (sans préfixe AppID) — ou "*" pour toutes les rooms */
  room: string;
  /** Identifiant interne de l'utilisateur (Supabase user id) */
  userId: string;
  /** Nom affiché dans la conférence */
  userName: string;
  /** Email (optionnel) */
  userEmail?: string;
  /** URL avatar (optionnel) */
  userAvatar?: string;
  /** Cet utilisateur est-il modérateur de la room ? */
  isModerator: boolean;
  /** Durée de validité du token en secondes (par défaut 4 h) */
  ttlSeconds?: number;
}

export interface JaasConfig {
  appId: string;
  kid: string;
  privateKey: string;
}

/**
 * Lit la config JaaS depuis les variables d'environnement.
 * Retourne null si JaaS n'est pas configuré (ex. instance meet.jit.si ou self-hosted sans JWT).
 */
export function getJaasConfig(): JaasConfig | null {
  const appId      = process.env.JAAS_APP_ID;
  const kid        = process.env.JAAS_KID;
  const privateKey = process.env.JAAS_PRIVATE_KEY;

  if (!appId || !kid || !privateKey) return null;

  // Les clés privées sont souvent stockées avec "\n" littéral dans les env vars
  const normalizedKey = privateKey.includes("\\n")
    ? privateKey.replace(/\\n/g, "\n")
    : privateKey;

  return { appId, kid, privateKey: normalizedKey };
}

/**
 * Signe un JWT JaaS pour autoriser un utilisateur à rejoindre une room.
 * Lève une erreur si la config est manquante.
 */
export function signJaasToken(opts: JaasTokenOptions): string {
  const config = getJaasConfig();
  if (!config) {
    throw new Error("JaaS n'est pas configuré (JAAS_APP_ID / JAAS_KID / JAAS_PRIVATE_KEY manquants)");
  }

  const ttl = opts.ttlSeconds ?? 4 * 60 * 60; // 4 h par défaut
  const now = Math.floor(Date.now() / 1000);

  const payload = {
    aud: "jitsi",
    iss: "chat",
    sub: config.appId,
    room: opts.room,
    iat: now,
    nbf: now - 10,
    exp: now + ttl,
    context: {
      user: {
        id:        opts.userId,
        name:      opts.userName,
        email:     opts.userEmail ?? "",
        avatar:    opts.userAvatar ?? "",
        moderator: opts.isModerator,
      },
      features: {
        livestreaming: false,
        recording:     false,
        transcription: false,
        "outbound-call": false,
      },
    },
  };

  return jwt.sign(payload, config.privateKey, {
    algorithm: "RS256",
    header: { alg: "RS256", kid: config.kid, typ: "JWT" },
  });
}

/**
 * Préfixe une room name avec l'AppID JaaS (requis par 8x8.vc).
 * Si JaaS n'est pas configuré, retourne le nom de la room tel quel
 * (utile pour meet.jit.si ou self-hosted).
 */
export function getJaasRoomName(roomName: string): string {
  const config = getJaasConfig();
  if (!config) return roomName;
  return `${config.appId}/${roomName}`;
}
