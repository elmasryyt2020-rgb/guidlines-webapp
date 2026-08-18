import paramiko
import sys
import os

sys.stdout.reconfigure(encoding='utf-8')

VPS_HOST = "41.33.93.208"
VPS_PORT = 2222
VPS_USER = "seif"
VPS_PASS = "Gothi2027"

def deploy():
    print(f"Connecting to {VPS_HOST}:{VPS_PORT} as {VPS_USER}...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(VPS_HOST, port=VPS_PORT, username=VPS_USER, password=VPS_PASS, timeout=15)

    sftp = ssh.open_sftp()
    
    local_path = "components/chat/ChatPanel.tsx"
    remote_path = "/home/seif/guidlines-webapp/components/chat/ChatPanel.tsx"
    print(f"Uploading {local_path} -> {remote_path}...")
    sftp.put(local_path, remote_path)
    sftp.close()
    print("Upload complete.")

    def run_remote(cmd, cwd=None):
        full_cmd = f"cd {cwd} && {cmd}" if cwd else cmd
        print(f"\n[REMOTE] {full_cmd}")
        stdin, stdout, stderr = ssh.exec_command(full_cmd)
        out = stdout.read().decode('utf-8', errors='replace')
        err = stderr.read().decode('utf-8', errors='replace')
        if out: print("STDOUT:\n" + out)
        if err: print("STDERR:\n" + err)
        return out, err

    print("\nBuilding Next.js app on VPS...")
    out, err = run_remote("npm run build", cwd="/home/seif/guidlines-webapp")

    print("\nRestarting PM2 process...")
    run_remote("pm2 restart guidlines-webapp")
    run_remote("pm2 save")

    print("\nChecking PM2 logs...")
    run_remote("pm2 logs guidlines-webapp --nostream --lines 15")

    ssh.close()
    print("\nDeploy completed successfully.")

if __name__ == "__main__":
    deploy()
