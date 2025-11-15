#!/bin/bash

# Auction Rammstik - Update Script for Production Server
# Run this script on the server to pull latest changes and rebuild

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}Auction Rammstik Update Script${NC}"
echo -e "${GREEN}======================================${NC}"

# Configuration
APP_DIR="/var/www/auction_rammstik"
GITHUB_BRANCH="main"

# Check if running in correct directory
if [ ! -d "$APP_DIR" ]; then
    echo -e "${RED}Application directory not found: $APP_DIR${NC}"
    echo -e "${YELLOW}Make sure the application is deployed first using deploy.sh${NC}"
    exit 1
fi

cd $APP_DIR

echo -e "${YELLOW}Step 1: Pull latest changes from GitHub${NC}"
git fetch origin
git reset --hard origin/$GITHUB_BRANCH
echo -e "${GREEN}Code updated to latest version${NC}"

echo -e "${YELLOW}Step 2: Install/update server dependencies${NC}"
cd $APP_DIR/server
npm install --production
echo -e "${GREEN}Server dependencies updated${NC}"

echo -e "${YELLOW}Step 3: Install/update client dependencies and rebuild${NC}"
cd $APP_DIR/client
npm install
npm run build
echo -e "${GREEN}Client rebuilt successfully${NC}"

echo -e "${YELLOW}Step 4: Restart PM2 process${NC}"
pm2 restart auction-server
echo -e "${GREEN}Application restarted${NC}"

echo -e "${YELLOW}Step 5: Check application status${NC}"
sleep 2
pm2 status auction-server

echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}Update Complete!${NC}"
echo -e "${GREEN}======================================${NC}"
echo ""
echo -e "${GREEN}Application has been updated and restarted${NC}"
echo ""
echo -e "${YELLOW}Useful commands:${NC}"
echo -e "  Check logs:    ${GREEN}pm2 logs auction-server${NC}"
echo -e "  Check status:  ${GREEN}pm2 status${NC}"
echo -e "  Restart app:   ${GREEN}pm2 restart auction-server${NC}"
echo ""
