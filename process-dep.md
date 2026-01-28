<!-- step 1 -->
# install git 
sudo yum update -y
sudo yum install git -y

<!-- step 2 -->
# clone git repo
git clone https://github.com/Rutvik79/quickcommerce.git

<!-- step 3 -->
# install docker
sudo dnf update -y
sudo dnf install -y docker

# start and enable docker on boot
sudo systemctl start docker
sudo systemctl enable docker

# create non-root user
sudo usermod -aG docker $USER

<!--  -->
Restart terminal here !! imp to switch to non-root user
<!--  -->

<!-- install docker compose -->
# install compose plugin
sudo mkdir -p /usr/local/lib/docker/cli-plugins
sudo curl -SL https://github.com/docker/compose/releases/download/v2.27.0/docker-compose-linux-x86_64 -o /usr/local/lib/docker/cli-plugins/docker-compose
sudo chmod +x /usr/local/lib/docker/cli-plugins/docker-compose

<!-- Step 4 -->
# copy .env files to the ec2 instance

# Change the frontend/src/context/SocketContext.jsx file socketurl variable
change the SOCKET_URL variable value to the ip of the server!!!! (v.v. imp)

<!-- Step 5 -->
# build the images for the service in the compose file
docker compose build

<!-- Step 6 -->
# Run the Compose images and hope for the best

<!-- Step 7 -->
# Seed the database for products, users

# Register a delivery partner
Register a delivery partner manually and then run the script to verify the partner

docker exec -it quickcommerce-backend npm run seed
docker exec -it quickcommerce-backend npm run seed:users

docker exec -it quickcommerce-backend npm run verify parnters
<!-- Step 8 -->
# That does it !!!