#!/bin/bash
set -e

echo "👻 Starting Zombie Instance Check..."

# 1. Bring everything down first to establish baseline
echo "📉 Bringing down environment..."
./manage.sh down > /dev/null 2>&1

# 2. Check for zombies (ports 3000, 5000, 8080)
echo "🔍 Checking ports 3000 and 5000..."
ZOMBIES=$(lsof -ti :3000,5000,8080 2>/dev/null || true)

if [ -n "$ZOMBIES" ]; then
    echo "❌ FAIL: Found zombie processes on ports: $ZOMBIES"
    echo "Attempting to kill them..."
    kill -9 $ZOMBIES || sudo kill -9 $ZOMBIES
    echo "✅ Zombies killed. Please run this test again to confirm clean state."
    exit 1
else
    echo "✅ No zombie processes found on application ports."
fi

# 3. Check for lingering docker containers that might be 'dead' but reserved
ORPHANS=$(docker ps -a -q -f name=santas_elf)
if [ -n "$ORPHANS" ]; then
    echo "⚠️  WARNING: Found stopped/orphaned containers. Cleaning them up..."
    docker rm -f $ORPHANS > /dev/null
    echo "✅ Cleaned up orphans."
fi

echo "🎉 Zombie Check Passed: Environment is clean."
exit 0
