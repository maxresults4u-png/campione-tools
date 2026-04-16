#!/bin/bash
# ============================================================
# APEX SCOUT — One-Command Install
# Run this on your Hetzner server from /root
# ============================================================

set -e

echo "🚀 Installing Apex Scout..."

# 1. Ensure better-sqlite3 is installed
cd /root/api
if ! npm list better-sqlite3 >/dev/null 2>&1; then
  echo "📦 Installing better-sqlite3..."
  npm install better-sqlite3
else
  echo "✅ better-sqlite3 already installed"
fi

if ! npm list axios >/dev/null 2>&1; then
  echo "📦 Installing axios..."
  npm install axios
else
  echo "✅ axios already installed"
fi

# 2. Copy apex-scout.js to /root/api/
if [ -f /root/apex-scout.js ]; then
  cp /root/apex-scout.js /root/api/apex-scout.js
  echo "✅ apex-scout.js copied to /root/api/"
else
  echo "⚠️  Put apex-scout.js in /root/ first, then re-run this script"
  exit 1
fi

# 3. Copy dashboard to web root
if [ -f /root/apex-scout.html ]; then
  cp /root/apex-scout.html /var/www/campione/apex-scout.html
  echo "✅ Dashboard deployed to /var/www/campione/apex-scout.html"
else
  echo "⚠️  Put apex-scout.html in /root/ first"
  exit 1
fi

# 4. Add the require line to index.js if not already there
if ! grep -q "require('./apex-scout')" /root/api/index.js; then
  echo "🔧 Wiring apex-scout into blockchain-api..."
  # Find the last app.listen or similar and insert before it
  # Insert after the app = express() line to be safe
  sed -i "/^const app = express()/a require('./apex-scout')(app);" /root/api/index.js
  echo "✅ Hook added to index.js"
else
  echo "✅ Already wired into index.js"
fi

# 5. Restart blockchain-api
echo "🔄 Restarting blockchain-api..."
pm2 restart blockchain-api --update-env
pm2 save

sleep 2

# 6. Test the endpoint
echo ""
echo "🧪 Testing endpoint..."
if curl -s http://localhost:3000/api/v1/apex/scan | python3 -m json.tool | head -20; then
  echo ""
  echo "✅ APEX SCOUT IS LIVE!"
  echo ""
  echo "📊 Dashboard: https://campioneinfrastructure.com/apex-scout.html"
  echo "📡 API: https://campioneinfrastructure.com/api/v1/apex/scan"
  echo ""
  echo "Next steps:"
  echo "1. Open the dashboard in your browser"
  echo "2. Wait for scores to populate (30s)"
  echo "3. Paper trade high-confluence signals"
  echo "4. Check /stats after 20+ trades to see real win rate per tier"
else
  echo "⚠️  Scan test failed — check logs: pm2 logs blockchain-api --lines 30"
fi
