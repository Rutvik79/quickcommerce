#!/bin/bash

# QuickCommerce Docker Quick Start Script
# This script sets up and starts the entire application with Docker

set -e

echo "🐳 QuickCommerce Docker Setup"
echo "=============================="
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

echo "✅ Docker found: $(docker --version)"
echo "✅ Docker Compose found: $(docker-compose --version)"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "⚠️  Please edit .env with your configuration!"
    echo "   Especially change JWT_SECRET and MongoDB password"
    echo ""
    read -p "Press Enter to continue after editing .env..."
fi

# Stop any running containers
echo "🛑 Stopping any running containers..."
docker-compose down -v 2>/dev/null || true
echo ""

# Build images
echo "🏗️  Building Docker images..."
docker-compose build
echo ""

# Start services
echo "🚀 Starting services..."
docker-compose up -d
echo ""

# Wait for services to be healthy
echo "⏳ Waiting for services to be healthy..."
sleep 5

# Check service status
echo ""
echo "📊 Service Status:"
docker-compose ps
echo ""

# Check health
echo "🏥 Health Checks:"
echo ""

# Check MongoDB
if docker-compose exec -T mongodb mongosh --eval "db.adminCommand('ping')" --quiet > /dev/null 2>&1; then
    echo "✅ MongoDB: Healthy"
else
    echo "❌ MongoDB: Unhealthy"
fi

# Check Backend
if curl -s http://localhost:5000/health > /dev/null 2>&1; then
    echo "✅ Backend API: Healthy"
else
    echo "⚠️  Backend API: Starting... (may take a few moments)"
fi

# Check Frontend
if curl -s http://localhost/health > /dev/null 2>&1; then
    echo "✅ Frontend: Healthy"
else
    echo "⚠️  Frontend: Starting... (may take a few moments)"
fi

# Seed database
echo "🌱 Seeding database"

if docker-compose exec -T backend npm run seed; then
    echo "✅ Database seeded successfully"
else
    echo "⚠️  Database seeding failed (it may already be seeded)"
fi

# Seed users
echo "👤 Seeding demo users..."
# docker-compose exec -T backend npm run seed:users || true

if docker-compose exec -T backend npm run seed:users; then
    echo "✅ User Collection seeded successfully"
else
    echo "⚠️  User Collection seeding failed (it may already be seeded)"
fi

echo "Verifying Partners..."
if docker-compose exec -T backend npm run verify-partners; then
    echo "✅ Partners verified successfully"
else
    echo "⚠️  Partners verification failed (it may already be seeded)"
fi
# docker-compose exec -T backend npm run verify-partners || true

echo ""
echo "=============================="
echo "🎉 QuickCommerce is running!"
echo "=============================="
echo ""
echo "📱 Frontend:  http://localhost"
echo "🔌 Backend:   http://localhost:5000"
echo "🗄️  MongoDB:   mongodb://localhost:27017"
echo ""
echo "📝 Useful commands:"
echo "   View logs:        docker-compose logs -f"
echo "   Stop services:    docker-compose down"
echo "   Restart services: docker-compose restart"
echo ""
echo "👤 Demo accounts:"
echo "   Customer:  customer@test.com / password123"
echo "   Delivery:  delivery@test.com / password123"
echo "   Admin:     admin@test.com / password123"
echo ""
