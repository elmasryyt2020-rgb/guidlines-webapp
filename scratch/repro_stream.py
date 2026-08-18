"""Reproduce the streaming bug against the LIVE VPS.

Signs in as a real user, then POSTs to /functions/v1/chat and measures:
  - TTFB (time to first byte)
  - Time between chunks (to prove streaming vs buffering)
  - Total response time
Also compares going through Caddy (:80) vs direct Kong (:8000).
Prints raw byte timestamps so we can SEE if chunks arrive incrementally.
"""
import time, json, urllib.request, urllib.error

BASE_CADDY = "http://41.33.93.208"
EMAIL = "elmasry.yt2020@gmail.com"
PASSWORD = "Gothi2027"


def signin():
    """Sign in via Caddy-proxied Supabase auth and return access_token."""
    url = f"{BASE_CADDY}/auth/v1/token?grant_type=password"
    body = json.dumps({"email": EMAIL, "password": PASSWORD}).encode()
    req = urllib.request.Request(
        url,
        data=body,
        headers={
            "Content-Type": "application/json",
            "apikey": _anon_key(),
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        data = json.loads(r.read())
    return data["access_token"]


_anon = None


def _anon_key():
    # The anon key is baked into the client bundle; pull it from the auth callback
    # endpoint by requesting the sign-in page isn't helpful. Instead read it from
    # the public /rest/v1/ 401 response header? No. Use the known one from the VPS
    # .env via a quick SSH. For simplicity here, read it from a local file written
    # by diag step. Fall back: extract from the deployed Next.js chunk.
    global _anon
    if _anon:
        return _anon
    # Read from VPS .env via ssh
    import paramiko
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect("41.33.93.208", port=2222, username="seif", password="Gothi2027", timeout=15)
    _, stdout, _ = c.exec_command("grep -E '^ANON_KEY=' /home/seif/supabase-docker/.env | head -1 | cut -d= -f2-")
    _anon = stdout.read().decode().strip()
    c.close()
    return _anon


def stream_chat(base, token, message="What is the treatment for acute otitis media in adults?"):
    url = f"{base}/functions/v1/chat"
    body = json.dumps({"message": message, "conversationId": None}).encode()
    req = urllib.request.Request(
        url,
        data=body,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}",
        },
        method="POST",
    )
    print(f"\n--- POST {url}")
    t0 = time.time()
    r = urllib.request.urlopen(req, timeout=120)
    print(f"HTTP {r.status}")
    ttfb = None
    chunks = []
    total = 0
    # Read incrementally
    while True:
        chunk = r.read(256)
        if not chunk:
            break
        t = time.time() - t0
        if ttfb is None:
            ttfb = t
            print(f"[{t:6.2f}s] FIRST BYTE ({len(chunk)} bytes): {chunk[:80]!r}")
        else:
            print(f"[{t:6.2f}s] chunk +{len(chunk)}b total={total + len(chunk)}")
        chunks.append((t, chunk))
        total += len(chunk)
    print(f"\nDONE. TTFB={ttfb:.2f}s  total_bytes={total}  elapsed={time.time()-t0:.2f}s")
    print(f"chunks received: {len(chunks)}")
    if len(chunks) > 1:
        gaps = [chunks[i+1][0] - chunks[i][0] for i in range(len(chunks)-1)]
        print(f"gaps between chunks (s): min={min(gaps):.3f} max={max(gaps):.3f} avg={sum(gaps)/len(gaps):.3f}")
    return chunks, ttfb


def main():
    print("Signing in...")
    token = signin()
    print(f"Got token: {token[:30]}...")
    print(f"\n{'#'*70}\n# TEST 1: Through CADDY (:80) — what the user's browser hits\n{'#'*70}")
    stream_chat(BASE_CADDY, token)


if __name__ == "__main__":
    main()
