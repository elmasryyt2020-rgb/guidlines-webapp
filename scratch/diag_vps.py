"""Inspect the ACTUAL deployed state on the VPS for the streaming bug.

Gathers ground truth: what's in the running edge function, the Caddyfile,
the Next.js build, and tests a raw streaming request with timing.
"""
import paramiko, time, sys, io

HOST = "41.33.93.208"
PORT = 2222
USER = "seif"
PASS = "Gothi2027"

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(HOST, port=PORT, username=USER, password=PASS, timeout=30)


def run(cmd, timeout=60):
    stdin, stdout, stderr = c.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode(errors="replace")
    err = stderr.read().decode(errors="replace")
    return (out + ("\n[stderr]\n" + err if err.strip() else "")).strip()


def section(title):
    print("\n" + "=" * 70)
    print(title)
    print("=" * 70)


# 1. Containers
section("DOCKER PS")
print(run("docker ps --format 'table {{.Names}}\\t{{.Status}}\\t{{.Ports}}'"))

# 2. Edge function container: what file is it running, what's the entrypoint
section("FUNCTIONS CONTAINER INSPECT")
print(run("docker inspect supabase-functions --format 'Cmd={{.Config.Cmd}} Entrypoint={{.Config.Entrypoint}} WorkingDir={{.Config.WorkingDir}}' 2>&1"))
print(run("docker inspect supabase-functions --format '{{json .HostConfig.PortBindings}}' 2>&1"))

# 3. List the functions dir inside the container + show the deployed chat/index.ts
section("DEPLOYED chat/index.ts (first 60 lines)")
print(run("docker exec supabase-functions sh -c 'ls -la /home/deno/functions/ 2>&1; echo ---; ls -la /home/deno/functions/chat/ 2>&1'"))
print(run("docker exec supabase-functions sh -c 'head -60 /home/deno/functions/chat/index.ts 2>&1 || head -60 /home/deno/functions/chat/index.ts'"))

# 4. Check the content-type returned by the edge function for a HEAD/quick request
section("EDGE FUNCTION ENV (GEMINI/SUPABASE keys present?)")
print(run("docker exec supabase-functions sh -c 'echo GEMINI=$(test -n \"$GEMINI_API_KEY\" && echo SET || echo UNSET); echo SUPABASE_URL=$SUPABASE_URL; echo SVC=$(test -n \"$SUPABASE_SERVICE_ROLE_KEY\" && echo SET || echo UNSET)' 2>&1"))

# 5. Caddyfile
section("CADDYFILE")
print(run("cat /etc/caddy/Caddyfile 2>&1"))
print(run("systemctl is-active caddy 2>&1; caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile 2>&1 | tail -5"))

# 6. Next.js build + env
section("NEXT.JS APP")
print(run("pm2 list 2>&1"))
print(run("pm2 env guidlines-webapp 2>&1 | grep -E 'NEXT_PUBLIC_SUPABASE_URL|SUPABASE_INTERNAL_URL|NODE_VERSION' | head"))
print(run("ls -la /home/seif/guidlines-webapp/.next/ 2>&1 | head -5"))
# What URL is baked into the client bundle?
print(run("grep -ao 'http://[a-zA-Z0-9.:/_-]*' /home/seif/guidlines-webapp/.next/static/chunks/*.js 2>/dev/null | sort -u | head -20"))

# 7. RAW streaming test directly to the edge container port 9000 (bypass Kong+Caddy)
section("RAW STREAM TEST (direct :9000, auth-bypassed invocation)")
# We need a real user JWT to call the function. Try to read the supabase anon key and
# mint a request via the authed endpoint through Kong instead.
KONG = "http://localhost:8000"
# Get anon key
anon_key = run("grep -E '^ANON_KEY=' /home/seif/supabase-docker/.env | head -1 | cut -d= -f2- 2>&1").strip()
print("ANON_KEY:", anon_key[:25] + "..." if anon_key else "(not found)")

c.close()
print("\nDone.")
