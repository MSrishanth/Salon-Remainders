from pyngrok import ngrok
import http.server, socketserver, threading, time

PORT = 8090

handler = http.server.SimpleHTTPRequestHandler
httpd = socketserver.TCPServer(("", PORT), handler)
thread = threading.Thread(target=httpd.serve_forever)
thread.daemon = True
thread.start()
print(f"Local server running on port {PORT}")

public_url = ngrok.connect(PORT, bind_tls=True)
print(f"\n{'='*50}")
print(f"  PUBLIC SHAREABLE LINK:")
print(f"  {public_url.public_url}/preview.html")
print(f"{'='*50}")
print("\nShare this link via WhatsApp with anyone!")
print("Press Ctrl+C to stop.\n")

try:
    while True:
        time.sleep(1)
except KeyboardInterrupt:
    httpd.shutdown()
    ngrok.disconnect(public_url.public_url)
    print("Server stopped.")
