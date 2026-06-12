import http.server
import socketserver
import threading
import subprocess
import time
import sys

PORT = 8090

def start_server():
    Handler = http.server.SimpleHTTPRequestHandler
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"Local server serving at port {PORT}")
        httpd.serve_forever()

# Start local server in a separate thread
server_thread = threading.Thread(target=start_server, daemon=True)
server_thread.start()

# Wait a bit for server to start
time.sleep(2)

print("\nAttempting to create public tunnel via serveo.net...")
print("If this is your first time, you might need to accept a host key.")
print("The public link will appear below soon.\n")

# Command to start serveo tunnel
# ssh -R 80:localhost:8090 serveo.net
try:
    # Use -o StrictHostKeyChecking=no to avoid prompt
    process = subprocess.Popen(
        ['ssh', '-o', 'StrictHostKeyChecking=no', '-R', '80:localhost:8090', 'serveo.net'],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1
    )

    # Read output to find the URL
    for line in iter(process.stdout.readline, ''):
        print(line, end='')
        if "Forwarding HTTP traffic from" in line:
            url = line.split("from")[-1].strip()
            print(f"\n{'='*60}")
            print(f"🚀 PUBLIC SHAREABLE LINK: {url}/preview.html")
            print(f"{'='*60}")
            print("\nYou can now share this link via WhatsApp!")
            print("Keep this script running to keep the link active.")

except Exception as e:
    print(f"Error starting tunnel: {e}")

try:
    while True:
        time.sleep(1)
except KeyboardInterrupt:
    print("\nStopping server and tunnel...")
    sys.exit(0)
