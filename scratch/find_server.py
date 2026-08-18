import socket
import sys

print("=== STARTING NETWORK PROBE ===", flush=True)

ips_to_test = [
    '41.33.93.208',
    '197.37.209.86',
    '192.168.100.1',
    '192.168.100.4',
    '192.168.100.5',
    '192.168.100.41',
    '192.168.100.44',
    '192.168.100.115',
    '127.0.0.1'
]

ports_to_test = [22, 2222, 80, 443, 3000, 8000, 8080, 5432]

for ip in ips_to_test:
    print(f"Testing {ip}...", flush=True)
    for port in ports_to_test:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(0.3)
        res = s.connect_ex((ip, port))
        if res == 0:
            print(f"  [OPEN] {ip}:{port}", flush=True)
        s.close()

print("=== PROBE FINISHED ===", flush=True)
