#!/usr/bin/env bash
# Redéploie Agent Ops Lab si la branche suivie a changé sur GitHub.
# Lancé toutes les 2 minutes par agent-ops-lab-update.timer (voir install.sh).
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/agent-ops-lab}"
APP_USER="${APP_USER:-agentops}"
BRANCH="${BRANCH:-main}"
LOCK=/run/agent-ops-lab-update.lock

exec 9>"$LOCK"
flock -n 9 || exit 0 # une mise à jour est déjà en cours

as_app() { sudo -u "$APP_USER" env NEXT_TELEMETRY_DISABLED=1 "$@"; }

cd "$APP_DIR"
as_app git fetch --quiet origin "$BRANCH"
LOCAL="$(as_app git rev-parse HEAD)"
REMOTE="$(as_app git rev-parse "origin/$BRANCH")"
[ "$LOCAL" = "$REMOTE" ] && exit 0

echo "Nouvelle version : ${LOCAL:0:7} → ${REMOTE:0:7}"
as_app git reset --quiet --hard "origin/$BRANCH"

# On compile dans le dossier courant ; si la compilation échoue, on revient à la version précédente.
if as_app npm ci --no-audit --no-fund --loglevel=error && as_app npm run build; then
  systemctl restart agent-ops-lab.service
  echo "Déployé : $(as_app git log -1 --format='%h %s')"
else
  echo "Échec de compilation, retour à ${LOCAL:0:7}" >&2
  as_app git reset --quiet --hard "$LOCAL"
  as_app npm ci --no-audit --no-fund --loglevel=error && as_app npm run build && systemctl restart agent-ops-lab.service
  exit 1
fi
