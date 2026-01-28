#!/bin/bash

set -e

echo "🚀 QuickCommerce EC2 Deployment Script"
echo "====================================="
echo ""

### STEP 0 — OS update
echo "🔄 Updating system..."
sudo yum update -y
echo ""

### STEP 1 — Install Git
if ! command -v git &> /dev/null; then
  echo "📦 Installing Git..."
  sudo yum install -y git
else
  echo "✅ Git already installed"
fi
echo ""

### STEP 2 — Install Docker
if ! command -v docker &> /dev/null; then
  echo "🐳 Installing Docker..."
  sudo dnf install -y docker
  sudo systemctl start docker
  sudo systemctl enable docker
  sudo usermod -aG docker $USER
  echo ""
  echo "⚠️  Docker installed. PLEASE LOG OUT AND LOG BACK IN, THEN RE-RUN THIS SCRIPT."
  exit 0
else
  echo "✅ Docker already installed"
fi
echo ""

### STEP 3 — Install Docker Compose plugin
if ! docker compose version &> /dev/null; then
  echo "🧩 Installing Docker Compose plugin..."
  sudo mkdir -p /usr/local/lib/docker/cli-plugins
  sudo curl -SL https://github.com/docker/compose/releases/download/v2.27.0/docker-compose-linux-x86_64 \
    -o /usr/local/lib/docker/cli-plugins/docker-compose
  sudo chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
else
  echo "✅ Docker Compose already installed"
fi
echo ""

### STEP 4 — Clone repository
if [ ! -d "quickcommerce" ]; then
  echo "📥 Cloning QuickCommerce repository..."
  git clone https://github.com/Rutvik79/quickcommerce.git
else
  echo "✅ Repository already exists"
fi
echo ""

cd quickcommerce

### STEP 5 — Environment variables
if [ ! -f .env ]; then
  echo "📝 Creating .env file..."
  cp .env.example .env
  echo ""
  echo "⚠️  IMPORTANT:"
  echo "   1. Update JWT_SECRET"
  echo "   2. Update FRONTEND_URL with EC2 public IP"
  echo "   3. Update Mongo credentials if needed"
  echo ""
  read -p "Press ENTER after editing .env..."
fi
echo ""

### STEP 6 — Stop old containers
echo "🛑 Stopping old containers..."
docker compose down -v || true
echo ""

### STEP 7 — Build images
echo "🏗️  Building Docker images..."
docker compose build
echo ""

### STEP 8 — Start services
echo "🚀 Starting services..."
docker compose up -d
echo ""

### STEP 9 — Wait for services
echo "⏳ Waiting for services to stabilize..."
sleep 10
echo ""

### STEP 10 — Health checks
echo "📊 Service status:"
docker compose ps
echo ""

echo "🏥 Health checks:"
if curl -s http://localhost:5000/health > /dev/null; then
  echo "✅ Backend: Healthy"
else
  echo "⚠️ Backend still starting"
fi

if curl -s http://localhost/health > /dev/null; then
  echo "✅ Frontend: Healthy"
else
  echo "⚠️ Frontend still starting"
fi
echo ""

### STEP 11 — Seed database
echo "🌱 Seeding database..."
docker compose exec -T backend npm run seed || true
docker compose exec -T backend npm run seed:users || true
docker compose exec -T backend npm run verify-partners || true
echo ""

### DONE
echo "====================================="
echo "🎉 QuickCommerce is LIVE!"
echo "====================================="
echo ""
echo "🌍 Frontend:  http://<EC2-PUBLIC-IP>"
echo "🔌 Backend:   http://<EC2-PUBLIC-IP>:5000"
echo "🗄️ MongoDB:   mongodb://<EC2-PUBLIC-IP>:27017"
echo ""
