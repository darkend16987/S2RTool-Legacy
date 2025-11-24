# S2RTool - Docker Setup Guide

## 🚀 Quick Start

### Prerequisites
- Docker Engine 20.10+
- Docker Compose 2.0+
- Gemini API key from [Google AI Studio](https://makersuite.google.com/app/apikey)

### Step 1: Clone and Configure

```bash
# Clone the repository (if not already done)
git clone <your-repo-url>
cd S2RTool

# Create environment file from example
cp .env.example .env

# Edit .env and add your Gemini API key
nano .env  # or use your preferred editor
```

**Important:** Replace `your_gemini_api_key_here` with your actual Gemini API key!

### Step 2: Build and Run

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Check service status
docker-compose ps
```

### Step 3: Access the Application

- **Frontend:** http://localhost:3001
- **Backend API:** http://localhost:5001
- **Health Check:**
  - Frontend: http://localhost:3001/health
  - Backend: http://localhost:5001/health

---

## 📋 Service Details

### Backend Service
- **Container:** `s2rtool-backend`
- **Port:** 5001
- **Technology:** Python 3.11 + Flask
- **Image Processing:** OpenCV, Pillow
- **AI:** Google Gemini API

### Frontend Service
- **Container:** `s2rtool-frontend`
- **Port:** 3001 (mapped from container port 80)
- **Technology:** Static HTML/CSS/JS served by Nginx
- **Web Server:** Nginx Alpine

---

## 🛠️ Common Commands

### Start Services
```bash
# Start in foreground (see logs)
docker-compose up

# Start in background (detached)
docker-compose up -d

# Start specific service
docker-compose up backend
```

### Stop Services
```bash
# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v

# Stop specific service
docker-compose stop backend
```

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend

# Last 100 lines
docker-compose logs --tail=100 backend
```

### Rebuild Services
```bash
# Rebuild all
docker-compose build

# Rebuild specific service
docker-compose build backend

# Rebuild and restart
docker-compose up -d --build
```

### Execute Commands in Container
```bash
# Open bash in backend container
docker-compose exec backend bash

# Run Python command
docker-compose exec backend python -c "print('Hello')"

# Check backend dependencies
docker-compose exec backend pip list
```

---

## 🔧 Configuration

### Environment Variables

Edit `.env` file:

```env
# Required
GEMINI_API_KEY=your_actual_api_key_here

# Optional
PORT=5001
HOST=0.0.0.0
```

### Change Ports

Edit `docker-compose.yaml`:

```yaml
services:
  backend:
    ports:
      - "5001:5001"  # Change left number: "NEW_PORT:5001"

  frontend:
    ports:
      - "3001:80"    # Change left number: "NEW_PORT:80"
```

**Note:** If you change backend port, you also need to update `frontend/script.js`:

```javascript
const API_BASE_URL = 'http://localhost:YOUR_NEW_PORT/api';
```

---

## 🐛 Troubleshooting

### Backend Won't Start

**Problem:** `ValueError: Missing GEMINI_API_KEY`

**Solution:**
1. Check `.env` file exists: `cat .env`
2. Verify API key is set: `grep GEMINI_API_KEY .env`
3. Restart containers: `docker-compose restart backend`

---

### Frontend Can't Connect to Backend

**Problem:** Network error or CORS issues

**Solution:**
1. Check backend is running: `docker-compose ps backend`
2. Check backend logs: `docker-compose logs backend`
3. Verify backend health: `curl http://localhost:5001/health`
4. Check frontend API URL in browser console

---

### Port Already in Use

**Problem:** `Error starting userland proxy: listen tcp4 0.0.0.0:5001: bind: address already in use`

**Solution:**
```bash
# Find process using the port
lsof -i :5001  # or netstat -tulpn | grep 5001

# Kill the process or change port in docker-compose.yaml
```

---

### Permission Denied Errors

**Problem:** Permission issues with volumes

**Solution:**
```bash
# Fix volume permissions
docker-compose down
sudo chown -R $USER:$USER .
docker-compose up -d
```

---

### Image Build Fails

**Problem:** Dependencies installation fails

**Solution:**
```bash
# Clean rebuild
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

---

## 📊 Health Checks

### Check Service Health

```bash
# Check all services
docker-compose ps

# Backend health endpoint
curl http://localhost:5001/health

# Frontend health endpoint
curl http://localhost:3001/health

# Check from inside container
docker-compose exec backend curl http://localhost:5001/health
```

### Expected Responses

**Backend `/health`:**
```json
{
  "status": "healthy",
  "timestamp": "2024-11-04T10:00:00",
  "services": {
    "gemini_api": "connected",
    "image_processor": "ready"
  }
}
```

**Frontend `/health`:**
```
healthy
```

---

## 🔒 Production Deployment

### Security Checklist

- [ ] Use strong, unique Gemini API key
- [ ] Never commit `.env` file to git
- [ ] Use environment-specific `.env` files
- [ ] Enable HTTPS with reverse proxy (nginx/traefik)
- [ ] Limit CORS origins in backend
- [ ] Set up firewall rules
- [ ] Use Docker secrets instead of environment variables
- [ ] Regularly update base images

### Production docker-compose.yaml

```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    restart: always
    environment:
      - GEMINI_API_KEY=${GEMINI_API_KEY}
    # Remove development volume mounts!
    # volumes:
    #   - ./backend:/app
    networks:
      - s2rtool-network

  frontend:
    build: ./frontend
    restart: always
    depends_on:
      - backend
    networks:
      - s2rtool-network

  # Add reverse proxy for HTTPS
  nginx-proxy:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx-proxy.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - frontend
    networks:
      - s2rtool-network

networks:
  s2rtool-network:
    driver: bridge
```

---

## 📁 Volume Management

### Persistent Data

The `backend-references` volume stores reference images:

```bash
# List volumes
docker volume ls

# Inspect volume
docker volume inspect s2rtool_backend-references

# Backup volume
docker run --rm -v s2rtool_backend-references:/data -v $(pwd):/backup alpine tar czf /backup/references-backup.tar.gz -C /data .

# Restore volume
docker run --rm -v s2rtool_backend-references:/data -v $(pwd):/backup alpine tar xzf /backup/references-backup.tar.gz -C /data
```

---

## 🧪 Development Mode

### Hot Reload (Backend)

The `docker-compose.yaml` includes volume mounts for development:

```yaml
volumes:
  - ./backend:/app  # Code changes reflect immediately
```

**Note:** You may need to restart backend after changing certain files:
```bash
docker-compose restart backend
```

### Frontend Changes

For frontend changes, rebuild is required:

```bash
# Quick rebuild and restart
docker-compose up -d --build frontend
```

Or develop without Docker:
```bash
cd frontend
python -m http.server 8000
# Open http://localhost:8000
```

---

## 📝 Additional Resources

- [Backend README](backend/README.md)
- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Reference](https://docs.docker.com/compose/compose-file/)
- [Gemini API Documentation](https://ai.google.dev/docs)

---

## 🤝 Support

If you encounter issues:

1. Check logs: `docker-compose logs -f`
2. Verify health: `curl http://localhost:5001/health`
3. Rebuild clean: `docker-compose build --no-cache`
4. Check GitHub issues
5. Create new issue with logs

---

## ⚡ Quick Reference

```bash
# Start
docker-compose up -d

# Stop
docker-compose down

# Logs
docker-compose logs -f

# Rebuild
docker-compose up -d --build

# Clean restart
docker-compose down && docker-compose up -d --build

# Shell access
docker-compose exec backend bash

# Health check
curl http://localhost:5001/health
curl http://localhost:3001/health
```

---

Made with ❤️ for architectural visualization
