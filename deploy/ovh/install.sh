#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Agent Ops Lab : installation sur un VPS (OVH ou autre) Debian / Ubuntu.
#
# Usage (en root ou avec sudo) :
#   curl -fsSL https://raw.githubusercontent.com/m6rdxc9g4t-beep/agent-ops-lab/main/deploy/ovh/install.sh | sudo bash
#
# Avec un nom de domaine (HTTPS automatique via Let's Encrypt) :
#   curl -fsSL https://raw.githubusercontent.com/m6rdxc9g4t-beep/agent-ops-lab/main/deploy/ovh/install.sh | sudo DOMAIN=ops.mondomaine.fr bash
#
# Ce que fait le script (relançable sans risque) :
#   1. installe git, Node.js 22 et Caddy (serveur web + certificats HTTPS) ;
#   2. ajoute un fichier d'échange (swap) si le serveur a peu de mémoire, pour que la compilation passe ;
#   3. clone le dépôt dans /opt/agent-ops-lab et compile l'application ;
#   4. la lance en service systemd (redémarrage automatique) sur 127.0.0.1:3000 ;
#   5. configure Caddy pour la servir sur le port 80 (ou en HTTPS sur DOMAIN) ;
#   6. installe une mise à jour automatique : toutes les 2 minutes, le serveur regarde GitHub
#      et redéploie si la branche a changé.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/m6rdxc9g4t-beep/agent-ops-lab.git}"
BRANCH="${BRANCH:-main}"
APP_DIR="${APP_DIR:-/opt/agent-ops-lab}"
APP_USER="${APP_USER:-agentops}"
PORT="${PORT:-3000}"
DOMAIN="${DOMAIN:-}"

log() { printf '\n\033[1;35m▶ %s\033[0m\n' "$*"; }
die() { printf '\n\033[1;31m✗ %s\033[0m\n' "$*" >&2; exit 1; }

[ "$(id -u)" -eq 0 ] || die "Lancez ce script en root (ou avec sudo)."
command -v apt-get >/dev/null || die "Ce script vise Debian ou Ubuntu (apt-get introuvable)."
export DEBIAN_FRONTEND=noninteractive

log "Paquets de base"
apt-get update -qq
apt-get install -y -qq sudo git curl ca-certificates gnupg debian-keyring debian-archive-keyring apt-transport-https >/dev/null

log "Node.js 22"
NODE_MAJOR="$(node -v 2>/dev/null | sed -E 's/^v([0-9]+).*/\1/' || echo 0)"
if [ "${NODE_MAJOR:-0}" -lt 20 ]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash - >/dev/null
  apt-get install -y -qq nodejs >/dev/null
fi
node -v

log "Caddy (serveur web et HTTPS)"
if ! command -v caddy >/dev/null; then
  curl -1sLf https://dl.cloudsmith.io/public/caddy/stable/gpg.key | gpg --dearmor --yes -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -qq
  apt-get install -y -qq caddy >/dev/null
fi
caddy version

log "Mémoire d'échange"
MEM_MB="$(awk '/MemTotal/ {print int($2/1024)}' /proc/meminfo)"
if [ "$MEM_MB" -lt 3000 ] && ! swapon --show | grep -q .; then
  fallocate -l 2G /swapfile 2>/dev/null || dd if=/dev/zero of=/swapfile bs=1M count=2048 status=none
  chmod 600 /swapfile
  mkswap /swapfile >/dev/null
  swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
  echo "swap de 2 Go ajouté (RAM : ${MEM_MB} Mo)"
else
  echo "rien à faire (RAM : ${MEM_MB} Mo)"
fi

log "Utilisateur ${APP_USER}"
id "$APP_USER" >/dev/null 2>&1 || useradd --system --create-home --shell /usr/sbin/nologin "$APP_USER"

log "Code source"
if [ -d "$APP_DIR/.git" ]; then
  sudo -u "$APP_USER" git -C "$APP_DIR" fetch --quiet origin "$BRANCH"
  sudo -u "$APP_USER" git -C "$APP_DIR" reset --quiet --hard "origin/$BRANCH"
else
  mkdir -p "$APP_DIR"
  chown "$APP_USER:$APP_USER" "$APP_DIR"
  sudo -u "$APP_USER" git clone --quiet --branch "$BRANCH" "$REPO_URL" "$APP_DIR"
fi
sudo -u "$APP_USER" git -C "$APP_DIR" log -1 --format='%h %s'

log "Compilation (quelques minutes la première fois)"
cd "$APP_DIR"
sudo -u "$APP_USER" env NEXT_TELEMETRY_DISABLED=1 npm ci --no-audit --no-fund --loglevel=error
sudo -u "$APP_USER" env NEXT_TELEMETRY_DISABLED=1 npm run build

log "Service systemd"
cat > /etc/systemd/system/agent-ops-lab.service <<EOF
[Unit]
Description=Agent Ops Lab (Next.js)
After=network.target

[Service]
Type=simple
User=${APP_USER}
WorkingDirectory=${APP_DIR}
Environment=NODE_ENV=production
Environment=NEXT_TELEMETRY_DISABLED=1
ExecStart=$(command -v npm) run start -- -H 127.0.0.1 -p ${PORT}
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

log "Mise à jour automatique depuis GitHub"
install -m 755 "$APP_DIR/deploy/ovh/update.sh" /usr/local/bin/agent-ops-lab-update
cat > /etc/systemd/system/agent-ops-lab-update.service <<EOF
[Unit]
Description=Agent Ops Lab : mise à jour depuis GitHub

[Service]
Type=oneshot
Environment=APP_DIR=${APP_DIR}
Environment=APP_USER=${APP_USER}
Environment=BRANCH=${BRANCH}
ExecStart=/usr/local/bin/agent-ops-lab-update
EOF
cat > /etc/systemd/system/agent-ops-lab-update.timer <<EOF
[Unit]
Description=Agent Ops Lab : vérifie GitHub toutes les 2 minutes

[Timer]
OnBootSec=1min
OnUnitActiveSec=2min

[Install]
WantedBy=timers.target
EOF

systemctl daemon-reload
systemctl enable --now agent-ops-lab.service >/dev/null
systemctl restart agent-ops-lab.service
systemctl enable --now agent-ops-lab-update.timer >/dev/null

log "Caddy"
if [ -n "$DOMAIN" ]; then SITE="$DOMAIN"; else SITE=":80"; fi
cat > /etc/caddy/Caddyfile <<EOF
# Généré par agent-ops-lab/deploy/ovh/install.sh
${SITE} {
	encode zstd gzip
	reverse_proxy 127.0.0.1:${PORT}
}
EOF
systemctl enable caddy >/dev/null
systemctl reload caddy 2>/dev/null || systemctl restart caddy

if command -v ufw >/dev/null && ufw status | grep -q "Status: active"; then
  log "Pare-feu"
  ufw allow 80/tcp >/dev/null
  ufw allow 443/tcp >/dev/null
fi

log "Vérification"
for _ in $(seq 1 30); do
  if curl -fsS -o /dev/null "http://127.0.0.1:${PORT}/"; then OK=1; break; fi
  sleep 1
done
[ "${OK:-0}" = 1 ] || die "L'application ne répond pas. Journal : journalctl -u agent-ops-lab -n 50"

IP="$(curl -fsS -4 https://ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')"
printf '\n\033[1;32m✓ Agent Ops Lab est en ligne\033[0m\n'
if [ -n "$DOMAIN" ]; then
  echo "  → https://${DOMAIN}  (le domaine doit pointer vers ${IP} : enregistrement A dans la zone DNS OVH)"
else
  echo "  → http://${IP}"
  echo "  Pour un nom de domaine en HTTPS : relancez avec DOMAIN=ops.mondomaine.fr"
fi
echo "  Mises à jour : automatiques à chaque push sur « ${BRANCH} » (journal : journalctl -u agent-ops-lab-update)"
