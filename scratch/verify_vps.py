import paramiko
import sys
import json

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

def safe_print(text):
    try:
        print(text)
    except UnicodeEncodeError:
        print(text.encode('ascii', errors='replace').decode('ascii'))

def verify():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect("41.33.93.208", port=2222, username="seif", password="Gothi2027", timeout=10)

    def run(cmd):
        stdin, stdout, stderr = ssh.exec_command(cmd)
        return stdout.read().decode('utf-8', errors='replace').strip()

    safe_print("=== PM2 STATUS ===")
    safe_print(run("pm2 status"))

    safe_print("\n=== CADDY ACTIVE? ===")
    safe_print(run("systemctl is-active caddy"))

    safe_print("\n=== SUPABASE CONTAINERS ===")
    safe_print(run("docker ps --format 'table {{.Names}}\t{{.Status}}'"))

    safe_print("\n=== SUPABASE AUTH HEALTH (PORT 80) ===")
    safe_print(run("curl -s -i http://localhost/auth/v1/health"))

    safe_print("\n=== TEST LOGIN (PORT 80) ===")
    anon_key = run("grep -E '^ANON_KEY=' /home/seif/supabase-docker/.env | cut -d= -f2-")
    login_cmd = f"""curl -s -X POST http://localhost/auth/v1/token?grant_type=password -H "apikey: {anon_key}" -H "Content-Type: application/json" -d '{{"email":"elmasry.yt2020@gmail.com","password":"Gothi2027"}}'"""
    res = run(login_cmd)
    try:
        data = json.loads(res)
        if "access_token" in data:
            safe_print("LOGIN SUCCESSFUL!")
            safe_print(f"User ID: {data.get('user', {}).get('id')}")
            safe_print(f"Email: {data.get('user', {}).get('email')}")
            safe_print(f"Token Type: {data.get('token_type')}")
            safe_print(f"Expires In: {data.get('expires_in')}s")
        else:
            safe_print(f"Login error response: {res}")
    except Exception as e:
        safe_print(f"Raw response: {res}")

    ssh.close()

if __name__ == "__main__":
    verify()
