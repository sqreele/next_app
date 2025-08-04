#!/bin/bash

echo "🔧 Fixing Docker Setup Issues..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

echo "✅ Docker is running"

# Stop any existing containers
echo "🛑 Stopping existing containers..."
docker compose down

# Remove any existing volumes to start fresh
echo "🧹 Cleaning up volumes..."
docker volume prune -f

# Build the images
echo "🔨 Building Docker images..."
docker compose build --no-cache

# Start the services
echo "🚀 Starting services..."
docker compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check service status
echo "📊 Service status:"
docker compose ps

# Check logs for any errors
echo "📋 Checking logs for errors..."
docker compose logs --tail=20

echo "✅ Setup complete! Check the logs above for any issues."
echo "🌐 Frontend should be available at: http://localhost:3000"
echo "🔧 Backend should be available at: http://localhost:8000"