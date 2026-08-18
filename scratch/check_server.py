import paramiko

def run_ssh():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    print("Connecting to 41.33.93.208:2222...")
    try:
        client.connect('41.33.93.208', port=2222, username='seif', password='Gothi2027', timeout=10)
        print("Connected successfully!")
    except Exception as e:
        print(f"Connection failed: {e}")
        return

    commands = [
        ("Uptime & Resource", "uptime; free -h; df -h /"),
        ("PM2 Status", "pm2 status"),
        ("Docker Compose PS", "cd /home/seif/supabase-docker && docker compose ps"),
        ("Caddy Status", "systemctl status caddy --no-pager -l"),
        ("Supabase Auth Users Count / Lookup", "docker exec supabase-db psql -U postgres -d postgres -c \"SELECT id, email, confirmed_at, created_at, last_sign_in_at, is_anonymous FROM auth.users;\""),
        ("Next.js .env.local", "cat /home/seif/guidlines-webapp/.env.local"),
        ("PM2 Recent Logs", "pm2 logs guidlines-webapp --nostream --lines 30"),
        ("Auth Docker Logs", "cd /home/seif/supabase-docker && docker compose logs auth --tail=30"),
        ("Kong Docker Logs", "cd /home/seif/supabase-docker && docker compose logs kong --tail=30")
    ]

    for title, cmd in commands:
        print(f"\n==================== {title} ====================")
        print(f"$ {cmd}")
        stdin, stdout, stderr = client.exec_command(cmd)
        out = stdout.read().decode('utf-8', errors='replace')
        err = stderr.read().decode('utf-8', errors='replace')
        if out:
            print(out.strip())
        if err:
            print(f"[STDERR]\n{err.strip()}")

    client.close()

if __name__ == "__main__":
    run_ssh()
