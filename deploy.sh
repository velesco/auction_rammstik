#!/bin/bash

# Auction Rammstik - Deployment Script for Ubuntu
# Domain: auction.mileageriot.com

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}Auction Rammstik Deployment Script${NC}"
echo -e "${GREEN}======================================${NC}"

# Configuration
DOMAIN="auction.mileageriot.com"
APP_DIR="/var/www/auction_rammstik"
EMAIL="velescovasile40@gmail.com"  # Email for Let's Encrypt
HUB_API_URL="https://hub.mileageriot.com/api"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Please run as root (use sudo)${NC}"
    exit 1
fi

echo -e "${YELLOW}Step 1: Update system packages${NC}"
apt update
apt upgrade -y

echo -e "${YELLOW}Step 2: Install required packages${NC}"
apt install -y curl git nginx certbot python3-certbot-nginx

echo -e "${YELLOW}Step 3: Install Node.js 20.x${NC}"
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
fi

echo -e "${GREEN}Node version: $(node -v)${NC}"
echo -e "${GREEN}NPM version: $(npm -v)${NC}"

echo -e "${YELLOW}Step 4: Install PM2 globally${NC}"
npm install -g pm2

echo -e "${YELLOW}Step 5: Create application directory${NC}"
mkdir -p $APP_DIR
cd $APP_DIR

echo -e "${YELLOW}Step 6: Clone/Copy application files${NC}"
echo -e "${YELLOW}NOTE: Copy your application files to $APP_DIR${NC}"
echo -e "${YELLOW}You can use: scp -r auction_rammstik/* user@server:$APP_DIR/${NC}"
echo -e "${YELLOW}Press Enter when files are ready...${NC}"
read -p ""

echo -e "${YELLOW}Step 7: Install server dependencies${NC}"
cd $APP_DIR/server
npm install --production

echo -e "${YELLOW}Step 8: Install client dependencies and build${NC}"
cd $APP_DIR/client
npm install
npm run build

echo -e "${YELLOW}Step 9: Create environment file for server${NC}"
cat > $APP_DIR/server/.env << EOF
PORT=3001
CLIENT_URL=https://$DOMAIN
HUB_API_URL=$HUB_API_URL
JWT_SECRET=$(openssl rand -base64 32)
DATABASE_PATH=./database.sqlite
NODE_ENV=production
EOF

echo -e "${GREEN}Environment file created${NC}"

echo -e "${YELLOW}Step 10: Create PM2 ecosystem file${NC}"
cat > $APP_DIR/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'auction-server',
      cwd: '/var/www/auction_rammstik/server',
      script: 'server.js',
      instances: 1,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production'
      },
      error_file: '/var/log/pm2/auction-server-error.log',
      out_file: '/var/log/pm2/auction-server-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M'
    }
  ]
};
EOF

echo -e "${YELLOW}Step 11: Create PM2 log directory${NC}"
mkdir -p /var/log/pm2

echo -e "${YELLOW}Step 12: Configure Nginx${NC}"
cat > /etc/nginx/sites-available/$DOMAIN << 'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name auction.mileageriot.com;

    # Root directory for React build
    root /var/www/auction_rammstik/client/dist;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json application/javascript;

    # Client body size (for file uploads if needed)
    client_max_body_size 10M;

    # API proxy to Node.js backend
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Socket.io proxy
    location /socket.io/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # React app - serve static files with caching
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Serve React app for all other routes
    location / {
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-cache";
    }
}
EOF

echo -e "${YELLOW}Step 13: Enable Nginx site${NC}"
ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

echo -e "${YELLOW}Step 14: Test Nginx configuration${NC}"
nginx -t

echo -e "${YELLOW}Step 15: Restart Nginx${NC}"
systemctl restart nginx
systemctl enable nginx

echo -e "${YELLOW}Step 16: Start application with PM2${NC}"
cd $APP_DIR
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd -u root --hp /root

echo -e "${YELLOW}Step 17: Setup SSL with Let's Encrypt${NC}"
echo -e "${YELLOW}Make sure DNS for $DOMAIN points to this server!${NC}"
read -p "Press Enter to continue with SSL setup..."

certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email $EMAIL --redirect

echo -e "${YELLOW}Step 18: Setup auto-renewal for SSL${NC}"
systemctl enable certbot.timer
systemctl start certbot.timer

echo -e "${YELLOW}Step 19: Configure firewall${NC}"
if command -v ufw &> /dev/null; then
    ufw allow 'Nginx Full'
    ufw allow OpenSSH
    echo -e "${GREEN}Firewall configured${NC}"
else
    echo -e "${YELLOW}UFW not installed, skipping firewall configuration${NC}"
fi

echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}Deployment Complete!${NC}"
echo -e "${GREEN}======================================${NC}"
echo ""
echo -e "${GREEN}Application URL: https://$DOMAIN${NC}"
echo -e "${GREEN}PM2 Status: pm2 status${NC}"
echo -e "${GREEN}PM2 Logs: pm2 logs auction-server${NC}"
echo -e "${GREEN}PM2 Restart: pm2 restart auction-server${NC}"
echo ""
echo -e "${YELLOW}Important:${NC}"
echo -e "1. Check PM2 logs: ${GREEN}pm2 logs${NC}"
echo -e "2. Check Nginx logs: ${GREEN}tail -f /var/log/nginx/error.log${NC}"
echo -e "3. SSL will auto-renew via certbot timer"
echo -e "4. Database is at: ${GREEN}$APP_DIR/server/database.sqlite${NC}"
echo ""
