#!/bin/bash

# First Ring AI Backend Deployment Script
# Usage: ./deploy.sh [environment]
# Example: ./deploy.sh production

set -e  # Exit on error

ENVIRONMENT=${1:-production}
echo "🚀 Starting deployment for environment: $ENVIRONMENT"

# Color codes for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Check if .env file exists
if [ ! -f .env ]; then
    print_error ".env file not found!"
    echo "Please copy .env.example to .env and configure it."
    exit 1
fi

print_success ".env file found"

# Pull latest changes
echo ""
echo "📥 Pulling latest changes from git..."
git pull origin main || {
    print_warning "Git pull failed or not a git repository"
}

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm ci || {
    print_error "Failed to install dependencies"
    exit 1
}
print_success "Dependencies installed"

# Generate Prisma Client
echo ""
echo "🔧 Generating Prisma Client..."
npx prisma generate || {
    print_error "Failed to generate Prisma Client"
    exit 1
}
print_success "Prisma Client generated"

# Run database migrations
echo ""
echo "🗄️  Running database migrations..."
npx prisma migrate deploy || {
    print_error "Failed to run migrations"
    exit 1
}
print_success "Database migrations completed"

# Build TypeScript
echo ""
echo "🏗️  Building TypeScript..."
npm run build || {
    print_error "Failed to build TypeScript"
    exit 1
}
print_success "Build completed"

# Check if PM2 is installed
if command -v pm2 &> /dev/null; then
    echo ""
    echo "🔄 Restarting application with PM2..."
    
    # Check if app is already running
    if pm2 describe first-ring-ai &> /dev/null; then
        pm2 restart first-ring-ai
        print_success "Application restarted with PM2"
    else
        pm2 start dist/server.js --name "first-ring-ai"
        pm2 save
        print_success "Application started with PM2"
    fi
    
    echo ""
    echo "📊 Application status:"
    pm2 status first-ring-ai
else
    print_warning "PM2 not found. Skipping PM2 restart."
    print_warning "To use PM2, install it globally: npm install -g pm2"
fi

echo ""
print_success "🎉 Deployment completed successfully!"
echo ""
echo "📝 Next steps:"
echo "  - Check application logs: pm2 logs first-ring-ai"
echo "  - Monitor status: pm2 status"
echo "  - View metrics: pm2 monit"
echo ""
