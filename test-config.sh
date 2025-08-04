#!/bin/bash

echo "🧪 Testing Configuration..."

# Test 1: Check if environment variables are set
echo "📋 Test 1: Environment Variables"
if [ -f "frontend/my_job/.env.local" ]; then
    echo "✅ .env.local file exists"
    grep -E "NEXT_PUBLIC_API_URL|NEXT_PUBLIC_BACKEND_URL" frontend/my_job/.env.local
else
    echo "❌ .env.local file missing"
fi

# Test 2: Check Docker Compose configuration
echo ""
echo "🐳 Test 2: Docker Compose Configuration"
if grep -q "env_file: ./frontend/my_job/.env.local" docker-compose.yml; then
    echo "✅ Frontend env_file configured in docker-compose.yml"
else
    echo "❌ Frontend env_file not configured"
fi

# Test 3: Check API Client Configuration
echo ""
echo "🔧 Test 3: API Client Configuration"
if grep -q "getApiBaseUrl" frontend/my_job/src/lib/api-client.ts; then
    echo "✅ API client has getApiBaseUrl function"
else
    echo "❌ API client missing getApiBaseUrl function"
fi

# Test 4: Check Next.js Configuration
echo ""
echo "⚛️ Test 4: Next.js Configuration"
if grep -q "NEXT_PUBLIC_API_URL" frontend/my_job/next.config.ts; then
    echo "✅ Next.js config includes environment variables"
else
    echo "❌ Next.js config missing environment variables"
fi

echo ""
echo "✅ Configuration test complete!"
echo ""
echo "Next steps:"
echo "1. Run: ./fix-docker-setup.sh"
echo "2. Check logs: docker compose logs frontend"
echo "3. Look for: 🔗 Client-side API URL: http://localhost:8000"