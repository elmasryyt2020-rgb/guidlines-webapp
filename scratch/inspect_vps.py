import paramiko
import sys

# Force UTF-8 stdout
sys.stdout.reconfigure(encoding='utf-8')

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('41.33.93.208', port=2222, username='seif', password='Gothi2027', timeout=10)

def run(cmd):
    print(f"\n{'='*20} {cmd} {'='*20}")
    stdin, stdout, stderr = c.exec_command(cmd)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    if out:
        print("STDOUT:\n" + out)
    if err:
        print("STDERR:\n" + err)

run('pm2 ls')
run('docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"')
run('cat /home/seif/guidlines-webapp/.env.local')
run('cat /etc/caddy/Caddyfile')
run('pm2 logs guidlines-webapp --nostream --lines 30')
c.close()
