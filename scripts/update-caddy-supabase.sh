#!/usr/bin/env bash
# ==============================================================================
# Script: update-caddy-supabase.sh
# Purpose: Configure Caddy on VPS to reverse-proxy Supabase Auth, REST, and
#          Edge Functions through port 80 to Kong (localhost:8000), eliminating
#          the need to expose port 8000 externally or configure firewall rules.
# ==============================================================================

set -e

echo "=== Updating Caddyfile for Unified Port 80 Proxy ==="

CADDYFILE_PATH="/etc/caddy/Caddyfile"
BACKUP_PATH="/etc/caddy/Caddyfile.bak-$(date +%Y%m%d%H%M%S)"

if [ -f "$CADDYFILE_PATH" ]; then
    echo "Creating backup at $BACKUP_PATH..."
    sudo cp "$CADDYFILE_PATH" "$BACKUP_PATH"
fi

echo "Writing new Caddy configuration..."
sudo tee "$CADDYFILE_PATH" > /dev/null <<'EOF'
:80 {
    encode gzip

    header {
        X-Content-Type-Options nosniff
        X-Frame-Options SAMEORIGIN
        X-XSS-Protection "1; mode=block"
        Referrer-Policy strict-origin-when-cross-origin
        -Server
    }

    # Supabase Auth, REST, Realtime, and Edge Functions via Kong API Gateway
    handle /auth/* {
        reverse_proxy localhost:8000
    }
    handle /rest/* {
        reverse_proxy localhost:8000
    }
    handle /functions/* {
        reverse_proxy localhost:8000
    }
    handle /realtime/* {
        reverse_proxy localhost:8000
    }

    # Next.js Application
    handle {
        reverse_proxy localhost:3000 {
            header_up Host {host}
            header_up X-Real-IP {remote_host}
            header_up X-Forwarded-For {remote_host}
            header_up X-Forwarded-Proto {scheme}
        }
    }
}
EOF

echo "Validating Caddy configuration..."
sudo caddy validate --config "$CADDYFILE_PATH" --adapter caddyfile

echo "Reloading Caddy..."
sudo systemctl reload caddy

echo "=== Caddy updated successfully! All Supabase endpoints are now live on Port 80 ==="
