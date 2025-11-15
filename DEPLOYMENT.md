# Auction Rammstik - Deployment Guide

## Prerequisites

1. **Ubuntu Server** (20.04 or 22.04 recommended)
2. **Domain configured**: `auction.mileageriot.com` pointing to your server IP
3. **Root access** to the server

## Quick Deployment

### Step 1: Configure GitHub repository

Before deploying, update the GitHub repository URL in [deploy.sh](deploy.sh):

```bash
GITHUB_REPO="https://github.com/yourusername/auction_rammstik.git"
GITHUB_BRANCH="main"  # or "master"
```

### Step 2: Upload deployment script to server

From your local machine:

```bash
# Upload deploy script to server
scp deploy.sh root@your-server-ip:/tmp/

# Or use SFTP/WinSCP on Windows
```

### Step 3: Run deployment script

SSH into your server and run:

```bash
# SSH into your server
ssh root@your-server-ip

# Make deploy script executable
chmod +x /tmp/deploy.sh

# Run deployment script
sudo /tmp/deploy.sh
```

The script will:
- ✅ Install Node.js, Nginx, Certbot
- ✅ Install PM2 for process management
- ✅ Clone repository from GitHub
- ✅ Automatically create .env files for server and client
- ✅ Build React frontend
- ✅ Configure Nginx reverse proxy
- ✅ Setup SSL certificate with Let's Encrypt
- ✅ Start application with PM2
- ✅ Configure auto-restart on reboot

## Manual Deployment (Alternative)

If you prefer manual setup:

### 1. Install Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install Nginx and Certbot
sudo apt install -y nginx certbot python3-certbot-nginx

# Install PM2
sudo npm install -g pm2
```

### 2. Setup Application

```bash
# Clone repository
cd /var/www
git clone https://github.com/yourusername/auction_rammstik.git
cd auction_rammstik

# Create server .env file
cat > server/.env << EOF
PORT=3001
CLIENT_URL=https://auction.mileageriot.com
HUB_API_URL=https://hub.mileageriot.com/api
JWT_SECRET=$(openssl rand -base64 32)
DATABASE_PATH=./database.sqlite
NODE_ENV=production
EOF

# Create client .env.production file
cat > client/.env.production << EOF
VITE_API_URL=https://auction.mileageriot.com/api
VITE_SOCKET_URL=https://auction.mileageriot.com
VITE_HUB_URL=https://hub.mileageriot.com
EOF

# Install server dependencies
cd server
npm install --production

# Build client
cd ../client
npm install
npm run build
```

### 3. Configure Nginx

```bash
# Copy nginx config from deploy.sh or create manually
sudo nano /etc/nginx/sites-available/auction.mileageriot.com

# Enable site
sudo ln -s /etc/nginx/sites-available/auction.mileageriot.com /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default

# Test and restart
sudo nginx -t
sudo systemctl restart nginx
```

### 4. Setup PM2

```bash
cd /var/www/auction_rammstik
pm2 start server/server.js --name auction-server
pm2 save
pm2 startup
```

### 5. Setup SSL

```bash
sudo certbot --nginx -d auction.mileageriot.com
```

## Useful Commands

### PM2 Management

```bash
# View status
pm2 status

# View logs
pm2 logs auction-server

# Restart application
pm2 restart auction-server

# Stop application
pm2 stop auction-server

# Monitor
pm2 monit
```

### Nginx

```bash
# Test configuration
sudo nginx -t

# Restart
sudo systemctl restart nginx

# View error logs
sudo tail -f /var/log/nginx/error.log

# View access logs
sudo tail -f /var/log/nginx/access.log
```

### SSL Certificate

```bash
# Test renewal
sudo certbot renew --dry-run

# Force renewal
sudo certbot renew --force-renewal

# View certificate info
sudo certbot certificates
```

### Database

```bash
# Backup database
cp /var/www/auction_rammstik/server/database.sqlite \
   /var/www/auction_rammstik/server/database.sqlite.backup

# View database
sqlite3 /var/www/auction_rammstik/server/database.sqlite
```

## Environment Variables

Server `.env` file location: `/var/www/auction_rammstik/server/.env`

Required variables:
```bash
PORT=3001
CLIENT_URL=https://auction.mileageriot.com
HUB_API_URL=https://hub.mileageriot.com/api
JWT_SECRET=your-secret-key
DATABASE_PATH=./database.sqlite
NODE_ENV=production
```

## Updating the Application

### Quick Update (Recommended)

Use the update script for automated updates:

```bash
# Download update script to server
scp update.sh root@your-server-ip:/tmp/

# SSH to server and run update
ssh root@your-server-ip
chmod +x /tmp/update.sh
sudo /tmp/update.sh
```

The script will:
- Pull latest changes from GitHub
- Update dependencies
- Rebuild React app
- Restart PM2 process

### Manual Update

If you prefer manual update:

```bash
# Pull latest changes from GitHub
cd /var/www/auction_rammstik
git pull origin main  # or master

# Rebuild client
cd client
npm install
npm run build

# Update server dependencies (if needed)
cd ../server
npm install --production

# Restart PM2
pm2 restart auction-server
```

## Troubleshooting

### Application won't start

```bash
# Check PM2 logs
pm2 logs auction-server --lines 100

# Check if port 3001 is in use
sudo lsof -i :3001

# Check environment file
cat /var/www/auction_rammstik/server/.env
```

### Nginx errors

```bash
# Check Nginx error log
sudo tail -f /var/log/nginx/error.log

# Test configuration
sudo nginx -t

# Check if Nginx is running
sudo systemctl status nginx
```

### SSL certificate issues

```bash
# Check certificate status
sudo certbot certificates

# Renew manually
sudo certbot renew --force-renewal

# Check renewal timer
sudo systemctl status certbot.timer
```

### Database issues

```bash
# Check database file permissions
ls -la /var/www/auction_rammstik/server/database.sqlite

# Set correct permissions
sudo chown -R root:root /var/www/auction_rammstik
sudo chmod 644 /var/www/auction_rammstik/server/database.sqlite
```

## Security Recommendations

1. **Firewall**: Enable UFW and allow only necessary ports
   ```bash
   sudo ufw enable
   sudo ufw allow 'Nginx Full'
   sudo ufw allow OpenSSH
   ```

2. **Keep system updated**
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

3. **Monitor logs regularly**
   ```bash
   pm2 logs
   sudo tail -f /var/log/nginx/error.log
   ```

4. **Database backups**: Setup automated backups
   ```bash
   # Add to crontab
   0 2 * * * cp /var/www/auction_rammstik/server/database.sqlite /var/backups/auction_$(date +\%Y\%m\%d).sqlite
   ```

## Support

- Server logs: `pm2 logs auction-server`
- Nginx logs: `/var/log/nginx/`
- Application directory: `/var/www/auction_rammstik`
