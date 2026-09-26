#!/bin/zsh
set -e
apresentacao_dir="${0:A:h}"
python3 - "$apresentacao_dir" <<'PY'
import sys, webbrowser
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
handler=partial(SimpleHTTPRequestHandler, directory=sys.argv[1])
server=ThreadingHTTPServer(('127.0.0.1',0),handler)
url=f'http://127.0.0.1:{server.server_port}/'
print(f'Apresentação Vereda: {url}\nMantenha esta janela aberta. Ctrl+C encerra o servidor.')
webbrowser.open(url)
try: server.serve_forever()
except KeyboardInterrupt: server.server_close()
PY
