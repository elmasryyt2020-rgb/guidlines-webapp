# Server Documentation — Guidelines Webapp

> **Last updated:** 2026-07-31  
> **Server:** `41.33.93.208` (SSH port `2222`)  
> **User:** `seif`

---

## Architecture

```
Internet
    │
    ▼  port 80 (requires cloud firewall rule)
┌──────────────────────────────────────────────┐
│  VPS  41.33.93.208      SSH port 2222        │
│                                              │
│  Caddy :80  ──────────►  Next.js :3000       │
│  (reverse proxy)          (PM2, ~57 MB)      │
│                                              │
│  Supabase (Docker Compose):                  │
│    Kong       :8000   API gateway (public)   │
│    Auth                GoTrue                │
│    DB         :5432   PostgreSQL 17 (local)  │
│    REST                PostgREST v14         │
│    Realtime            WebSockets            │
│    Pooler     :6543   Supavisor (local)      │
│    Studio     :3001   (SSH tunnel only)      │
│    Meta                postgres-meta         │
│    Imgproxy            image processing      │
└──────────────────────────────────────────────┘
```

### Port access

| Port | Service | Binding | Access |
|------|---------|---------|--------|
| 80 | Caddy → Next.js | `0.0.0.0` | Public (needs cloud firewall rule) |
| 8000 | Kong (Supabase API) | `0.0.0.0` | Public (needs cloud firewall rule) |
| 3000 | Next.js | `0.0.0.0` | Internal (behind Caddy) |
| 5432 | Supavisor (pooler) | `127.0.0.1` | Localhost only |
| 6543 | Supavisor (transaction) | `127.0.0.1` | Localhost only |
| 3001 | Supabase Studio | Internal Docker | SSH tunnel only |
| 2222 | SSH | `0.0.0.0` | Public |

---

## Software versions

| Component | Version |
|-----------|---------|
| Ubuntu | 22.04 LTS |
| Node.js | v20.20.2 |
| npm | 10.8.2 |
| Docker | 29.6.2 |
| Caddy | 2.11.4 |
| PM2 | latest |
| Next.js | 16.2.9 |
| PostgreSQL | 17.6.1.136 (Supabase image) |
| Kong | 3.9.1 |
| GoTrue | v2.189.0 |
| PostgREST | v14.12 |
| Supavisor | 2.9.5 |

---

## File locations

| What | Path |
|------|------|
| Next.js app | `/home/seif/guidlines-webapp/` |
| App env vars | `/home/seif/guidlines-webapp/.env.local` |
| Supabase stack | `/home/seif/supabase-docker/` |
| Supabase env | `/home/seif/supabase-docker/.env` |
| Supabase compose | `/home/seif/supabase-docker/docker-compose.yml` |
| Pooler config | `/home/seif/supabase-docker/volumes/pooler/pooler.exs` |
| Caddy config | `/etc/caddy/Caddyfile` |
| PM2 dump | `/home/seif/.pm2/dump.pm2` |
| PM2 logs | `/home/seif/.pm2/logs/` |
| DB backups | `/home/seif/backups/` |

---

## SSH access

```bash
ssh -p 2222 seif@41.33.93.208
# Password: Gothi2027
```

---

## Common operations

### App management (PM2)

```bash
# Status
pm2 ls

# Logs (live tail)
pm2 logs guidlines-webapp

# Logs (last N lines, no tail)
pm2 logs guidlines-webapp --nostream --lines 50

# Restart
pm2 restart guidlines-webapp

# Rebuild after code changes
cd /home/seif/guidlines-webapp
npm run build
pm2 restart guidlines-webapp

# Save state (survives reboot)
pm2 save
```

### Supabase management (Docker Compose)

```bash
cd /home/seif/supabase-docker

# Status of all services
docker compose ps

# Logs for a specific service
docker compose logs auth --tail=50
docker compose logs kong --tail=50
docker compose logs rest --tail=50
docker compose logs supavisor --tail=50

# Restart a single service
docker compose restart auth
docker compose restart rest

# Restart everything
docker compose down && docker compose up -d

# Full rebuild (pulls latest images)
docker compose pull
docker compose up -d
```

### Database access

```bash
# psql shell
docker exec -it supabase-db psql -U postgres -d postgres

# Row counts
docker exec supabase-db psql -U postgres -d postgres -c \
  "SELECT tablename, (xpath('/row/cnt/text()', query_to_xml('SELECT count(*) as cnt FROM public.' || tablename, false, true, '')))[1]::text as rows FROM pg_tables WHERE schemaname='public' ORDER BY tablename;"

# Manual backup
docker exec supabase-db pg_dump -U postgres postgres --schema=public -Fc \
  > /home/seif/backups/backup_$(date +%Y%m%d_%H%M%S).dump

# Restore from backup
docker exec -i supabase-db pg_restore -U postgres -d postgres --clean --if-exists \
  < /home/seif/backups/backup_YYYYMMDD.dump
```

### Supabase Studio (browser)

```bash
# From your LOCAL machine — open an SSH tunnel:
ssh -p 2222 -L 3001:localhost:3001 seif@41.33.93.208

# Then open: http://localhost:3001
# Login: supabase / supabase_admin
```

### Caddy (reverse proxy)

```bash
# Status
systemctl status caddy

# Restart
sudo systemctl restart caddy

# Edit config
sudo nano /etc/caddy/Caddyfile
sudo systemctl reload caddy

# View config
cat /etc/caddy/Caddyfile
```

---

## Caddy configuration

All endpoints (Next.js frontend, Supabase Auth, REST, and Edge Functions) are unified under port 80:

```
:80 {
    encode gzip
    header {
        X-Content-Type-Options nosniff
        X-Frame-Options SAMEORIGIN
        X-XSS-Protection "1; mode=block"
        Referrer-Policy strict-origin-when-cross-origin
        -Server
    }

    # Route Supabase API through Kong (eliminates needing port 8000 externally)
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

    # Next.js App
    handle {
        reverse_proxy localhost:3000 {
            header_up Host {host}
            header_up X-Real-IP {remote_host}
            header_up X-Forwarded-For {remote_host}
            header_up X-Forwarded-Proto {scheme}
        }
    }
}
```


---

## Environment variables

### Next.js app (`/home/seif/guidlines-webapp/.env.local`)

| Variable | Points to |
|----------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | `http://41.33.93.208:8000` (self-hosted Kong) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Self-hosted anon JWT |
| `SUPABASE_SERVICE_ROLE_KEY` | Self-hosted service role JWT |
| `GEMINI_API_KEY` | Google Gemini API key |

### Supabase (`/home/seif/supabase-docker/.env`)

Key variables (see file for full list):

| Variable | Purpose |
|----------|---------|
| `POSTGRES_PASSWORD` | Database password |
| `JWT_SECRET` | JWT signing secret |
| `ANON_KEY` | Public anon JWT |
| `SERVICE_ROLE_KEY` | Privileged service JWT |
| `API_EXTERNAL_URL` | `http://41.33.93.208:8000` |
| `SITE_URL` | `http://41.33.93.208` |
| `DASHBOARD_USERNAME` | Studio login: `supabase` |
| `DASHBOARD_PASSWORD` | Studio login: `supabase_admin` |

---

## Backups

### Automated

Daily at **03:00 AM** server time via crontab:

```
0 3 * * * docker exec supabase-db pg_dump -U postgres postgres --schema=public -Fc \
  > /home/seif/backups/backup_$(date +\%Y\%m\%d).dump \
  && find /home/seif/backups -name "backup_*.dump" -mtime +30 -delete
```

- **Retention:** 30 days (older dumps auto-deleted)
- **Location:** `/home/seif/backups/`
- **Format:** PostgreSQL custom format (`.dump`)

### Manual backup

```bash
docker exec supabase-db pg_dump -U postgres postgres --schema=public -Fc \
  > /home/seif/backups/backup_$(date +%Y%m%d_%H%M%S).dump
```

### Download a backup to your local machine

```bash
scp -P 2222 seif@41.33.93.208:/home/seif/backups/backup_20260731.dump ./
```

---

## Auto-start / reboot behavior

| Component | Mechanism | Status |
|-----------|-----------|--------|
| Docker | systemd | ✅ Enabled |
| All Supabase containers | `restart: unless-stopped` | ✅ Configured |
| Next.js (PM2) | `pm2-seif` systemd service | ✅ Enabled |
| Caddy | systemd | ✅ Enabled |

After a reboot, all services start automatically. No manual intervention needed.

---

## Database schema

### Tables (public schema)

| Table | Rows | Description |
|-------|------|-------------|
| `guideline_chunks` | 3,833 | Embedded guideline content (vector chunks) |
| `mind_maps` | 11 | Mind map structures |
| `conversations` | 11 | Chat conversations |
| `messages` | 15 | Chat messages |

---

## Security

### What's secured

- ✅ SSH on non-standard port (2222)
- ✅ PostgreSQL ports (5432, 6543) bound to `127.0.0.1` only
- ✅ Supabase Studio accessible only via SSH tunnel
- ✅ Caddy strips `Server` header
- ✅ Security headers: `X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`, `Referrer-Policy`
- ✅ Docker restart policies prevent service drift

### Remaining items

- ⬜ **Cloud firewall:** Open TCP ports 80 and 8000 only. **Never open 5432 or 6543.**
- ⬜ **TLS/HTTPS:** Requires a domain name. Once you have one, update the Caddyfile:
  ```
  yourdomain.com {
      # Caddy auto-provisions TLS via Let's Encrypt
      reverse_proxy localhost:3000 { ... }
  }
  ```
  Then update `SITE_URL` and `API_EXTERNAL_URL` in the Supabase `.env` to use `https://`.
- ⬜ **Change default Studio credentials** in `/home/seif/supabase-docker/.env`

---

## Troubleshooting

### App not loading (502 or blank page)

```bash
pm2 ls                                        # Is it online?
pm2 logs guidlines-webapp --lines 20          # Check errors
ls /home/seif/guidlines-webapp/.next/         # Build exists?
cd /home/seif/guidlines-webapp && npm run build && pm2 restart guidlines-webapp
```

### Supabase API returning errors

```bash
cd /home/seif/supabase-docker
docker compose ps                             # All healthy?
docker compose logs kong --tail=20            # Check Kong gateway
docker compose logs auth --tail=20            # Check auth service
docker compose logs rest --tail=20            # Check PostgREST
```

### Database connection issues

```bash
docker exec supabase-db psql -U postgres -c "SELECT 1;"   # DB alive?
docker compose logs supavisor --tail=20                     # Pooler OK?
```

### Disk space

```bash
df -h /                                       # Overall usage
docker system df                              # Docker disk usage
docker system prune -af                       # Clean unused images (careful!)
```

### Memory issues

```bash
free -h
pm2 monit                                    # Live process monitor
docker stats --no-stream                     # Container resource usage
```

---

## Deployment workflow (updating the app)

```bash
# 1. SSH in
ssh -p 2222 seif@41.33.93.208

# 2. Pull latest code
cd /home/seif/guidlines-webapp
git pull origin main

# 3. Install dependencies (if package.json changed)
npm install

# 4. Rebuild
npm run build

# 5. Restart
pm2 restart guidlines-webapp
pm2 save
```

---

## Server resources

| Resource | Value |
|----------|-------|
| RAM | 7.2 GB total |
| Disk | 48 GB total (40% used) |
| CPU | Multi-core (load avg ~2.0) |
| OS | Ubuntu 22.04 LTS |
| IP | `41.33.93.208` |
| SSH port | `2222` |
