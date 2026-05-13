"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { Button } from "@/components/ui/button";

interface LiveRoomProps {
  sessionId: string;
  onLeave:   () => void;
  isHost?:   boolean;
  onEnd?:    () => Promise<void> | void;
}

interface AccessData {
  room_name:    string;
  user_name:    string;
  title:        string;
  is_moderator: boolean;
}

// Types minimaux pour l'API Jitsi
interface JitsiMeetExternalAPI {
  dispose: () => void;
  executeCommand: (command: string, ...args: unknown[]) => void;
  addListener: (event: string, listener: (...args: unknown[]) => void) => void;
  removeListener: (event: string, listener: (...args: unknown[]) => void) => void;
}
type JitsiCtor = new (domain: string, opts: Record<string, unknown>) => JitsiMeetExternalAPI;
declare global {
  interface Window { JitsiMeetExternalAPI?: JitsiCtor; }
}

const JITSI_DOMAIN = process.env.NEXT_PUBLIC_JITSI_DOMAIN ?? "meet.jit.si";

export function LiveRoom({ sessionId, onLeave, isHost, onEnd }: LiveRoomProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef       = useRef<JitsiMeetExternalAPI | null>(null);

  const [scriptLoaded, setScriptLoaded] = useState(() =>
    typeof window !== "undefined" && typeof window.JitsiMeetExternalAPI === "function"
  );
  const [access,  setAccess]  = useState<AccessData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  // ─── 1. Vérifier l'accès dès le mount ──────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    async function check() {
      try {
        const res = await fetch("/api/live/access", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ session_id: sessionId }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Accès refusé");
        if (!cancelled) setAccess(data);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Erreur d'accès");
          setLoading(false);
        }
      }
    }
    check();

    // Polling de secours si le script Jitsi est déjà chargé mais onLoad n'a pas tiré
    const interval = setInterval(() => {
      if (typeof window.JitsiMeetExternalAPI === "function") {
        setScriptLoaded(true);
        clearInterval(interval);
      }
    }, 200);
    const timeout = setTimeout(() => clearInterval(interval), 5000);

    return () => {
      cancelled = true;
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [sessionId]);

  // ─── 2. Instancier Jitsi quand script + access sont prêts ─────────────────
  useEffect(() => {
    if (!scriptLoaded || !access || !containerRef.current) return;
    if (!window.JitsiMeetExternalAPI) {
      setError("Jitsi non chargé. Vérifiez votre connexion réseau.");
      setLoading(false);
      return;
    }

    if (typeof window.RTCPeerConnection === "undefined") {
      setError("WebRTC est indisponible dans ce navigateur. Essayez Chrome, Firefox ou Safari à jour, ou désactivez les extensions bloquantes.");
      setLoading(false);
      return;
    }

    // Nettoyer une instance précédente
    if (apiRef.current) {
      try { apiRef.current.dispose(); } catch { /* ignore */ }
      apiRef.current = null;
    }

    const api = new window.JitsiMeetExternalAPI(JITSI_DOMAIN, {
      roomName: access.room_name,
      parentNode: containerRef.current,
      width:  "100%",
      height: "100%",
      userInfo: {
        displayName: access.user_name,
      },
      sandbox: "allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-presentation",
      configOverwrite: {
        prejoinPageEnabled: false,
        disableDeepLinking: true,
        startWithAudioMuted: !access.is_moderator,
        startWithVideoMuted: false,
        enableLobbyChat: false,
        lobby: { enableChat: false, autoKnock: false },
        toolbarButtons: access.is_moderator
          ? [
              "microphone", "camera", "desktop", "chat", "raisehand",
              "participants-pane", "tileview", "select-background",
              "recording", "mute-everyone",
              "settings", "videoquality", "fullscreen", "stats",
              "hangup",
            ]
          : [
              "microphone", "camera", "chat", "raisehand",
              "tileview", "select-background",
              "settings", "videoquality", "fullscreen",
              "hangup",
            ],
      },
      interfaceConfigOverwrite: {
        SHOW_JITSI_WATERMARK:      false,
        SHOW_WATERMARK_FOR_GUESTS: false,
        DEFAULT_BACKGROUND:        "#0d0d0d",
        DISABLE_VIDEO_BACKGROUND:  false,
      },
    });

    apiRef.current = api;

    api.addListener("videoConferenceJoined", () => {
      setLoading(false);
    });

    api.addListener("readyToClose", () => {
      onLeave();
    });

    api.addListener("cameraError", () => {
      setError("Impossible d'accéder à la caméra. Vérifiez qu'elle n'est pas déjà utilisée par un autre onglet ou application.");
      setLoading(false);
    });

    api.addListener("connectionFailed", () => {
      setError("La connexion à la salle a échoué. Réessayez plus tard.");
      setLoading(false);
    });

    api.addListener("passwordRequired", () => {
      setError("Cette salle requiert un mot de passe.");
      setLoading(false);
    });

    return () => {
      if (apiRef.current) {
        try { apiRef.current.dispose(); } catch { /* ignore */ }
        apiRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scriptLoaded, access]);

  async function handleEndLive() {
    if (!confirm("Terminer le cours en direct pour tous les participants ?")) return;
    if (onEnd) await onEnd();
    onLeave();
  }

  return (
    <>
      <Script
        src={`https://${JITSI_DOMAIN}/external_api.js`}
        strategy="afterInteractive"
        onLoad={() => setScriptLoaded(true)}
        onError={() => {
          setError("Impossible de charger Jitsi");
          setLoading(false);
        }}
      />

      <div className="fixed inset-0 bg-[#0d0d0d] z-[100] flex flex-col">
        {/* Barre du haut */}
        <div className="px-4 sm:px-6 py-3 bg-black/60 border-b border-white/10 flex items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center gap-2 bg-[hsla(0,84%,60%,0.15)] text-[hsl(0,84%,70%)] px-3 py-1 rounded-full text-[0.65rem] font-bold uppercase tracking-wider flex-shrink-0">
              <span className="w-1.5 h-1.5 bg-[hsl(0,84%,65%)] rounded-full animate-pulse" />
              En direct
            </div>
            <p className="text-white text-sm font-semibold truncate">
              {access?.title ?? "Connexion…"}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {isHost && !error && (
              <Button variant="destructive" size="sm" onClick={handleEndLive}>
                Terminer le live
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={onLeave}
              className="bg-white/10 text-white border-white/20 hover:bg-white/20"
            >
              {error ? "Retour" : "Quitter"}
            </Button>
          </div>
        </div>

        {/* Zone vidéo */}
        <div className="flex-1 relative">
          <div ref={containerRef} className="absolute inset-0" />

          {loading && !error && (
            <div className="absolute inset-0 flex items-center justify-center text-white/60 text-sm pointer-events-none">
              Connexion à la salle…
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 bg-[#0d0d0d]">
              <svg className="w-12 h-12 text-[hsl(0,84%,65%)]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <circle cx={12} cy={12} r={10}/>
                <line x1={12} y1={8} x2={12} y2={12}/>
                <line x1={12} y1={16} x2={12.01} y2={16}/>
              </svg>
              <div className="bg-[hsla(0,84%,60%,0.15)] border border-[hsla(0,84%,60%,0.3)] text-[hsl(0,84%,80%)] px-4 py-3 rounded-lg text-sm max-w-md text-center">
                {error}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
