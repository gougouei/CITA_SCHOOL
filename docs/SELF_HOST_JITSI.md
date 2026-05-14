# Auto-hébergement de Jitsi Meet pour CITSA School

## Pourquoi auto-héberger ?

L'instance publique `meet.jit.si` fonctionne mais a deux limites pour notre usage :
- L'enregistrement intégré ne marche qu'en passant par un compte Dropbox personnel
- Les fonctionnalités modérateur (lobby, kick, mute-all) peuvent être restreintes côté serveur

Avec une instance Jitsi auto-hébergée + **Jibri** (le composant d'enregistrement officiel) :
- Vous contrôlez 100 % de la salle (durée, modération, recording)
- Les enregistrements sont sauvegardés automatiquement sur **votre serveur** (puis pushable sur S3, Supabase Storage, etc.)
- Plus aucune dépendance à Dropbox

> **Note importante** : les appels sur `meet.jit.si` ne sont **pas limités à 5 minutes**.
> Si vous avez vu un message « installez Jitsi pour des appels plus longs », il venait probablement
> d'une autre application (Jitsi as a Service / JaaS, qui est l'offre cloud payante d'8x8).
> Cette doc concerne l'auto-hébergement de la version open-source, gratuite et illimitée.

---

## Pré-requis

| Élément | Valeur recommandée |
|---------|--------------------|
| **VPS** | Ubuntu 22.04 LTS — 4 vCPU / 8 GB RAM / 100 GB SSD |
| **Hébergeur** | Hetzner (~10 €/mois), Scaleway, OVH, DigitalOcean… |
| **Domaine** | Un sous-domaine, ex : `live.citsa-school.com` (DNS A → IP du VPS) |
| **Ports ouverts** | 80/TCP, 443/TCP, 10000/UDP, 22/TCP (SSH) |
| **Email** | Pour Let's Encrypt |

**Jibri (recording) ajoute** : il a besoin d'un **second VPS** dédié (4 vCPU / 8 GB) car il lance un vrai Chrome headless qui consomme beaucoup. Un Jibri = un seul enregistrement à la fois.

---

## Étape 1 — Préparer le VPS Jitsi

Connectez-vous en SSH :
```bash
ssh root@<IP-DU-VPS>
```

Mettez à jour le système et installez les pré-requis :
```bash
apt update && apt upgrade -y
apt install -y curl gnupg2 nginx-full sudo apt-transport-https
```

Configurez le **hostname** pour qu'il corresponde au sous-domaine :
```bash
hostnamectl set-hostname live.citsa-school.com
echo "127.0.0.1 live.citsa-school.com" >> /etc/hosts
```

Vérifiez que le DNS pointe bien sur votre VPS (depuis votre machine locale) :
```bash
dig +short live.citsa-school.com  # doit afficher l'IP du VPS
```

---

## Étape 2 — Installer Jitsi Meet

Ajoutez le repo officiel Jitsi :
```bash
curl -sL https://download.jitsi.org/jitsi-key.gpg.key | gpg --dearmor > /usr/share/keyrings/jitsi.gpg
echo "deb [signed-by=/usr/share/keyrings/jitsi.gpg] https://download.jitsi.org stable/" > /etc/apt/sources.list.d/jitsi-stable.list
apt update
```

Installez le pack Jitsi Meet (l'installeur va vous poser 2 questions) :
```bash
apt install -y jitsi-meet
```

Lors de l'installation, répondez :
- **Hostname** : `live.citsa-school.com`
- **Certificat SSL** : choisir « Generate a new self-signed certificate », puis basculer vers Let's Encrypt à l'étape suivante.

Activez **Let's Encrypt** (gratuit, valide 90 jours, auto-renouvelé) :
```bash
/usr/share/jitsi-meet/scripts/install-letsencrypt-cert.sh
```
→ Entrez votre email Let's Encrypt.

À ce stade, ouvrez **https://live.citsa-school.com** dans votre navigateur. Vous devez voir l'écran d'accueil Jitsi. Testez en démarrant une room.

---

## Étape 3 — Restreindre la création de rooms (recommandé)

Par défaut, n'importe qui peut créer une room. Pour CITSA, mieux vaut limiter ça aux profs/admin.

Éditez `/etc/prosody/conf.avail/live.citsa-school.com.cfg.lua` :
```lua
VirtualHost "live.citsa-school.com"
    authentication = "internal_hashed"   -- au lieu de "anonymous"
    ...

VirtualHost "guest.live.citsa-school.com"
    authentication = "anonymous"
    c2s_require_encryption = false
```

Éditez `/etc/jitsi/meet/live.citsa-school.com-config.js` :
```js
var config = {
  ...
  hosts: {
    domain: 'live.citsa-school.com',
    anonymousdomain: 'guest.live.citsa-school.com',
    ...
  },
};
```

Éditez `/etc/jitsi/jicofo/jicofo.conf` :
```hocon
jicofo {
  authentication: {
    enabled: true
    type: XMPP
    login-url: live.citsa-school.com
  }
}
```

Créez un compte modérateur pour chaque professeur (one-off, depuis le VPS) :
```bash
prosodyctl register prof_nom live.citsa-school.com <mot_de_passe_solide>
```

Redémarrez :
```bash
systemctl restart prosody jicofo jitsi-videobridge2
```

> Désormais, ouvrir une room demande une auth XMPP. Les étudiants rejoignent en invités, sans login.
> Côté app CITSA, on peut générer ces tokens automatiquement via [JWT (lib-jitsi-meet)](https://github.com/jitsi/lib-jitsi-meet/blob/master/doc/tokens.md) — étape avancée, optionnelle.

---

## Étape 4 — Pointer l'application CITSA sur votre instance

Dans `.env.local` puis sur Vercel (Production + Preview) :
```env
NEXT_PUBLIC_JITSI_DOMAIN=live.citsa-school.com
```

Redéployez. La prochaine fois qu'un prof lance un live, l'app utilisera votre Jitsi au lieu de `meet.jit.si`. Aucun autre changement de code n'est nécessaire.

---

## Étape 5 — Installer Jibri (recording côté serveur)

Jibri tourne **sur un second VPS** (4 vCPU / 8 GB). Il faut :
1. Configurer Prosody (sur le serveur Jitsi) pour autoriser Jibri
2. Installer Jibri sur le 2e VPS
3. Le pointer vers le serveur Jitsi via XMPP

### 5.1 Sur le serveur Jitsi — préparer Prosody

Éditez `/etc/prosody/conf.avail/live.citsa-school.com.cfg.lua` :
```lua
VirtualHost "recorder.live.citsa-school.com"
    modules_enabled = { "ping" }
    authentication = "internal_hashed"

Component "internal.auth.live.citsa-school.com" "muc"
    storage = "memory"
    modules_enabled = { "ping" }
    admins = { "focus@auth.live.citsa-school.com", "jvb@auth.live.citsa-school.com" }
    muc_room_locking = false
    muc_room_default_public_jids = true
```

Créez les comptes Jibri :
```bash
prosodyctl register jibri auth.live.citsa-school.com <pass_jibri>
prosodyctl register recorder recorder.live.citsa-school.com <pass_recorder>
```

Activez le recording dans `/etc/jitsi/meet/live.citsa-school.com-config.js` :
```js
fileRecordingsEnabled: true,
liveStreamingEnabled: false,
hiddenDomain: 'recorder.live.citsa-school.com',
```

Activez le recording dans `/etc/jitsi/jicofo/jicofo.conf` :
```hocon
jicofo {
  jibri {
    brewery-jid: "JibriBrewery@internal.auth.live.citsa-school.com"
    pending-timeout: 90 seconds
  }
}
```

Redémarrez :
```bash
systemctl restart prosody jicofo
```

### 5.2 Sur le 2e VPS — installer Jibri

```bash
apt update && apt install -y openjdk-11-jre-headless ffmpeg curl alsa-utils kmod
curl -sL https://download.jitsi.org/jitsi-key.gpg.key | gpg --dearmor > /usr/share/keyrings/jitsi.gpg
echo "deb [signed-by=/usr/share/keyrings/jitsi.gpg] https://download.jitsi.org unstable/" > /etc/apt/sources.list.d/jitsi-unstable.list
apt update
apt install -y jibri
```

Installez Google Chrome + Chromedriver :
```bash
curl -sL https://dl.google.com/linux/linux_signing_key.pub | apt-key add -
echo "deb http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google-chrome.list
apt update && apt install -y google-chrome-stable
```

Préparez ALSA loopback (Jibri capture l'audio via une carte virtuelle) :
```bash
echo "snd-aloop" >> /etc/modules
modprobe snd-aloop
```

Ajoutez l'utilisateur `jibri` aux groupes nécessaires :
```bash
usermod -aG adm,audio,video,plugdev jibri
```

Configurez Jibri — éditez `/etc/jitsi/jibri/jibri.conf` :
```hocon
jibri {
  recording {
    recordings-directory = "/srv/recordings"
    finalize-script = "/etc/jitsi/jibri/finalize.sh"
  }
  api {
    xmpp {
      environments = [
        {
          name = "prod"
          xmpp-server-hosts = [ "live.citsa-school.com" ]
          xmpp-domain = "live.citsa-school.com"

          control-muc {
            domain = "internal.auth.live.citsa-school.com"
            room-name = "JibriBrewery"
            nickname = "jibri-nickname"
          }

          control-login {
            domain = "auth.live.citsa-school.com"
            username = "jibri"
            password = "<pass_jibri>"
          }

          call-login {
            domain = "recorder.live.citsa-school.com"
            username = "recorder"
            password = "<pass_recorder>"
          }

          room-jid-domain-string-from-session-id = "conference.live.citsa-school.com"
          usage-timeout = 0
          trust-all-xmpp-certs = true
        }
      ]
    }
  }
}
```

Créez le dossier d'enregistrement :
```bash
mkdir -p /srv/recordings && chown jibri:jibri /srv/recordings
```

Lancez Jibri :
```bash
systemctl enable --now jibri
systemctl status jibri   # doit afficher "active (running)"
```

### 5.3 Tester

Relancez Jicofo sur le serveur Jitsi (`systemctl restart jicofo`), puis :
1. Ouvrez https://live.citsa-school.com depuis un compte prof
2. Démarrez une room
3. Cliquez sur le bouton ⏺ « Démarrer l'enregistrement »
4. Vous devriez maintenant voir une option **« Enregistrer sur le serveur »** (sans Dropbox)
5. Après ~30 secondes, un badge « REC » apparaît
6. À la fin du live, le fichier `.mp4` apparaît dans `/srv/recordings/` du VPS Jibri

### 5.4 (Optionnel) Upload auto vers Supabase Storage

Créez `/etc/jitsi/jibri/finalize.sh` :
```bash
#!/bin/bash
# Reçoit le dossier de l'enregistrement en argument
RECORDING_DIR="$1"
MP4_FILE=$(find "$RECORDING_DIR" -name "*.mp4" | head -1)
[ -z "$MP4_FILE" ] && exit 0

# Upload vers Supabase Storage via signed URL
# (à compléter avec un appel à votre API CITSA qui génère l'URL et notifie l'app)
curl -X POST https://citsa-school.vercel.app/api/jibri/recording-ready \
  -H "Authorization: Bearer $JIBRI_SHARED_SECRET" \
  -H "Content-Type: application/json" \
  -d "{\"file\": \"$MP4_FILE\"}"
```

Rendez-le exécutable :
```bash
chmod +x /etc/jitsi/jibri/finalize.sh
```

> Côté CITSA, vous créeriez une route `/api/jibri/recording-ready` qui :
> 1. Vérifie le secret partagé
> 2. Upload le fichier dans le bucket `library-files`
> 3. Crée la ligne `library_files` + `library_classes`
> 4. Met à jour `live_sessions.recording_file_id`
>
> C'est un projet à part entière mais entièrement faisable.

---

## Étape 6 — Sauvegardes & maintenance

### Renouvellement SSL (automatique mais à vérifier)
```bash
certbot renew --dry-run
```

### Sauvegardes
- Snapshot du VPS toutes les nuits (option chez la plupart des hébergeurs : ~1 €/mois)
- Exporter `/etc/prosody`, `/etc/jitsi`, et la liste des comptes XMPP

### Monitoring
```bash
systemctl status prosody jicofo jitsi-videobridge2
journalctl -u jitsi-videobridge2 -f   # logs en temps réel
```

### Mises à jour mensuelles
```bash
apt update && apt upgrade -y
systemctl restart prosody jicofo jitsi-videobridge2
```

---

## Récapitulatif des coûts mensuels (Hetzner Allemagne)

| Ressource | Type | Prix indicatif |
|-----------|------|----------------|
| VPS Jitsi | CX31 (4 vCPU / 8 GB / 80 GB) | ~10 € |
| VPS Jibri | CX31 | ~10 € |
| Domaine | .com / .fr | ~10 €/an |
| **Total** | | **~20 €/mois** |

Pour une dizaine de profs et 200 étudiants, c'est largement suffisant. Le coût supplémentaire principal serait le stockage des vidéos enregistrées (peut être hors-VPS, dans Supabase Storage qui inclut 1 GB gratuit + ~0.021 $/GB/mois ensuite).

---

## En résumé

1. **Sans urgence** : continuer sur `meet.jit.si` avec le flow manuel actuel (le prof enregistre via OBS/QuickTime et téléverse après le live). C'est déjà fonctionnel dans CITSA depuis v0.8.0.

2. **Quand vous voudrez automatiser** : suivre cette doc — comptez 3-4 h pour Jitsi seul, +4-6 h pour Jibri.

3. **Variante intermédiaire** : utiliser [JaaS (Jitsi as a Service)](https://jaas.8x8.vc/) — l'offre cloud payante d'8x8 — qui inclut recording cloud, modération, JWT auth. Tarif : ~99 $/mois pour 100 utilisateurs actifs. Zéro infra à gérer mais un coût récurrent élevé.
