sudo yum update -y
sudo yum install git -y

clone git repo https://github.com/Rutvik79/quickcommerce

sudo dnf update -y
sudo dnf install -y docker

sudo systemctl start docker
sudo systemctl enable docker

sudo usermod -aG docker $USER
<!-- Reconnect to apply group permissions. -->


<!-- this  -->
sudo mkdir -p /usr/local/lib/docker/cli-plugins
sudo curl -SL https://github.com/docker/compose/releases/download/v2.27.0/docker-compose-linux-x86_64 \
  -o /usr/local/lib/docker/cli-plugins/docker-compose
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