#!/bin/bash
# redémarre le serveur local de test flixplay-web
P=$(pgrep -f "node server.js" | grep -v "^$$\$" || true)
[ -n "$P" ] && kill $P 2>/dev/null && sleep 1
cd /home/user/flixweb
nohup node server.js > /tmp/fxserver.log 2>&1 &
sleep 2
echo "PID: $(pgrep -f 'node server.js')"
