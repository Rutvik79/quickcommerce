<!-- major changes in the prod env -->
change the cors policy in server.js
change the frontend url for socket connection to the ip of the ec2 instance

backend.env
# NODE_ENV=development
PORT=5000
# SOCKET_PORT=5001

# IMPORTANT: Update this with your MongoDB connection string
# MONGO_URI=mongodb://localhost:27017/quickcommerce?replicaSet=rs0
# MONGO_URI=mongodb://admin:admin123@mongodb:27017/quickcommerce?authSource=admin&replicaSet=rs0&directConnection=true
MONGO_URI=mongodb://mongo1:27017,mongo2:27018/quickcommerce?replicaSet=my-mongo-set


# Generate a strong JWT secret (32+ characters)
JWT_SECRET=5zXNki/Tfg3OnnVqOhJAXnlXgN8fhcVMzkuztHIy0xk=

JWT_EXPIRE=24h

#FRONTEND_URL=http://localhost:3000
FRONTEND_URL=http://15.206.82.164:3000

<!-- separation -->

frontend.env

# API Configuration
REACT_APP_API_URL=http://15.206.82.164
REACT_APP_SOCKET_URL=http://15.206.82.164

# REACT_APP_NODE_ENV=development
# Optional: If you want to use different ports or production URLs
# REACT_APP_API_URL=https://api.yourapp.com
# REACT_APP_SOCKET_URL=https://api.yourapp.com

<!-- separation -->

<!-- docker-compose.yaml -->
services:
  mongo1:
    image: mongo:7.0
    container_name: mongo1
    hostname: mongo1
    command: mongod --replSet my-mongo-set --bind_ip_all
    ports:
      - "27017:27017"
    volumes:
      - mongo1-data:/data/db
    networks:
      - quickcommerce-network
    healthcheck:
      test: ["CMD", "mongosh", "--quiet", "--eval", "db.adminCommand('ping').ok"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 20s

 mongo2:
    image: mongo:7.0
    container_name: mongo2
    hostname: mongo2
    command: mongod --replSet my-mongo-set --bind_ip_all --port 27018
    ports:
      - "27018:27018"
    volumes:
      - mongo2-data:/data/db
    networks:
      - quickcommerce-network
    healthcheck:
      test: ["CMD", "mongosh", "--port", "27018", "--quiet", "--eval", "db.adminCommand('ping').ok"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 20s


mongoinit:
    image: mongo:7.0
    container_name: mongo-init
    depends_on:
      mongo1:
        condition: service_healthy
      mongo2:
        condition: service_healthy
    networks:
      - quickcommerce-network
    restart: "no"
    command: >
      mongosh --host mongo1:27017 --eval '
        rs.initiate({
          _id: "my-mongo-set",
          members: [
            { _id: 0, host: "mongo1:27017" },
            { _id: 1, host: "mongo2:27018" }
          ]
        });
      '


backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: quickcommerce-backend
    restart: unless-stopped
    ports:
      - "5000:5000"
    environment:
      NODE_ENV: production
      PORT: 5000
      MONGO_URI: mongodb://mongo1:27017,mongo2:27018/quickcommerce?replicaSet=my-mongo-set
      JWT_SECRET: your-super-secret-jwt-key-change-this-in-production
      JWT_EXPIRES_IN: 7d
      CORS_ORIGIN: http://localhost:3000
    depends_on:
      mongoinit:
        condition: service_completed_successfully
    networks:
      - quickcommerce-network
    healthcheck:
       test: ["CMD", "node", "-e", "require('http').get('http://localhost:5000/health', r => process.exit(r.statusCode === 200 ? 0 : 1))"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
            
frontend:
  build:
    context: ./frontend
    dockerfile: Dockerfile
  container_name: quickcommerce-frontend
  restart: unless-stopped
  ports:
    - "80:80"
  environment:
    REACT_APP_API_URL: http://localhost # insert server ip here
    REACT_APP_SOCKET_URL: http://localhost  # insert server ip here
  depends_on:
    backend:
      condition: service_healthy
  networks:
    - quickcommerce-network
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost"]
    interval: 30s
    timeout: 10s
    retries: 3


volumes:
  mongo1-data:
    driver: local
  mongo2-data:
    driver: local

networks:
  quickcommerce-network:
    driver: bridge

<!-- separation -->
<!-- Run this for replica set on local machine -->
>mongod --replSet rs0 --dbpath d:\data\db
<!-- make sure the directory d:\data\db is present on your system -->


<!-- for deplloyment on vm on cloud host -->
sudo yum update -y
sudo yum install git -y

clone git repo 
git clone https://github.com/Rutvik79/quickcommerce.git


sudo dnf update -y
sudo dnf install -y docker

sudo systemctl start docker
sudo systemctl enable docker

sudo usermod -aG docker $USER
<!-- Reconnect to apply group permissions. -->


<!-- this  -->
sudo mkdir -p /usr/local/lib/docker/cli-plugins
sudo curl -SL https://github.com/docker/compose/releases/download/v2.27.0/docker-compose-linux-x86_64 -o /usr/local/lib/docker/cli-plugins/docker-compose
sudo chmod +x /usr/local/lib/docker/cli-plugins/docker-compose


<!-- or this -->
sudo mkdir -p /usr/libexec/docker/cli-plugins
sudo curl -SL https://github.com/docker/compose/releases/latest/download/docker-compose-linux-$(uname -m) -o /usr/libexec/docker/cli-plugins/docker-compose
sudo chmod +x /usr/libexec/docker/cli-plugins/docker-compose   

docker compose version   
<!-- check version -->

<!--  -->
this might be the whole issue about socket not connecting properly
.env from frontend

# API Configuration
REACT_APP_API_URL=http://localhost:5000
REACT_APP_SOCKET_URL=http://localhost:5000

# REACT_APP_NODE_ENV=development
# Optional: If you want to use different ports or production URLs
# REACT_APP_API_URL=https://api.yourapp.com
# REACT_APP_SOCKET_URL=https://api.yourapp.com



1️⃣ Enter the MongoDB container
docker exec -it quickcommerce-mongodb mongosh \
  -u admin -p admin123 \
  --authenticationDatabase admin

  2️⃣ Switch DB
use quickcommerce

3️⃣ List collections
show collections

4️⃣ Query data
db.users.find().pretty()
db.orders.find().pretty()


Exit:

exit


