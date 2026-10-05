#!/usr/bin/env bash
# Deploy the Lab Companion to the team's Ubuntu VM (Proxmox) behind Caddy.
#
#   deploy/deploy.sh setup    # once: install Caddy on the VM and configure the site
#   deploy/deploy.sh          # every release: build, upload, done
#
# Configuration (environment or deploy/.env):
#   DEPLOY_HOST   ssh target, e.g. ubuntu@10.0.0.42 or an ~/.ssh/config alias   (required)
#   LAB_DOMAIN    public domain, e.g. lab.example.org; its DNS must point at the VM (setup only)
#   LAB_ROOT      directory served on the VM (default /srv/lab-companion)
set -euo pipefail

here="$(cd "$(dirname "$0")" && pwd)"
repo="$(cd "$here/.." && pwd)"
[ -f "$here/.env" ] && . "$here/.env"
: "${DEPLOY_HOST:?set DEPLOY_HOST (e.g. ubuntu@10.0.0.42)}"
LAB_ROOT="${LAB_ROOT:-/srv/lab-companion}"

setup() {
  : "${LAB_DOMAIN:?set LAB_DOMAIN (e.g. lab.example.org) — Caddy needs it for the HTTPS certificate}"
  echo "→ installing Caddy on $DEPLOY_HOST (official apt repository)"
  ssh -t "$DEPLOY_HOST" 'set -e
    if ! command -v caddy >/dev/null; then
      sudo apt-get update
      sudo apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl gpg
      curl -1sLf https://dl.cloudsmith.io/public/caddy/stable/gpg.key | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
      curl -1sLf https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt | sudo tee /etc/apt/sources.list.d/caddy-stable.list >/dev/null
      sudo apt-get update && sudo apt-get install -y caddy
    fi'
  echo "→ site directory $LAB_ROOT and Caddyfile for $LAB_DOMAIN"
  ssh -t "$DEPLOY_HOST" "sudo mkdir -p '$LAB_ROOT' && sudo chown \"\$USER\" '$LAB_ROOT'"
  scp "$here/Caddyfile" "$DEPLOY_HOST:/tmp/Caddyfile"
  ssh -t "$DEPLOY_HOST" "set -e
    sudo mv /tmp/Caddyfile /etc/caddy/Caddyfile
    printf 'LAB_DOMAIN=%s\nLAB_ROOT=%s\n' '$LAB_DOMAIN' '$LAB_ROOT' | sudo tee /etc/caddy/lab.env >/dev/null
    sudo mkdir -p /etc/systemd/system/caddy.service.d
    printf '[Service]\nEnvironmentFile=/etc/caddy/lab.env\n' | sudo tee /etc/systemd/system/caddy.service.d/lab.conf >/dev/null
    sudo systemctl daemon-reload
    sudo caddy validate --config /etc/caddy/Caddyfile --envfile /etc/caddy/lab.env
    sudo systemctl enable --now caddy && sudo systemctl reload caddy"
  echo "✓ setup done. Open ports 80 and 443 to the VM, then run: deploy/deploy.sh"
}

release() {
  echo "→ building"
  (cd "$repo/web" && npm ci --no-audit --no-fund && npm run build)
  echo "→ uploading to $DEPLOY_HOST:$LAB_ROOT"
  # sw.js and index.html last, so a phone never gets a service worker that points at missing files
  rsync -az --delete --exclude sw.js --exclude index.html "$repo/web/dist/" "$DEPLOY_HOST:$LAB_ROOT/"
  rsync -az "$repo/web/dist/index.html" "$repo/web/dist/sw.js" "$DEPLOY_HOST:$LAB_ROOT/"
  echo "✓ deployed $(git -C "$repo" rev-parse --short HEAD). Phones show an \"Update\" button on their next visit."
}

case "${1:-release}" in
  setup) setup ;;
  release) release ;;
  *) echo "usage: $0 [setup|release]" >&2; exit 2 ;;
esac
