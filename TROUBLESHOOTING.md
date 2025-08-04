# Troubleshooting Guide

## Issue: Frontend connecting to external domain (pmcs.site) instead of local backend

### Problem Description
The Next.js frontend is trying to connect to `https://pmcs.site` instead of the local backend, causing:
- 502 Bad Gateway errors
- 525 SSL handshake failures
- Authentication token refresh failures

### Root Causes
1. **Environment Variables Not Set**: The frontend doesn't have proper environment variables configured
2. **API Client Configuration**: The axios client is not properly configured for local development
3. **Docker Networking**: Services might not be properly networked
4. **Cached Build**: Old build artifacts might contain hardcoded URLs

### Solutions

#### 1. Environment Configuration
Ensure the frontend has proper environment variables:

```bash
# Create/update frontend/my_job/.env.local
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_BACKEND_URL=http://backend:8000
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here
NODE_ENV=development
```

#### 2. API Client Configuration
The API client has been updated to:
- Use proper base URLs for client vs server-side requests
- Add better error handling for network issues
- Include debugging information

#### 3. Docker Setup
Run the fix script:
```bash
./fix-docker-setup.sh
```

Or manually:
```bash
# Stop existing containers
docker compose down

# Clean up volumes
docker volume prune -f

# Rebuild images
docker compose build --no-cache

# Start services
docker compose up -d
```

#### 4. Verify Configuration
Check that services are running:
```bash
docker compose ps
```

Check logs for errors:
```bash
docker compose logs frontend
docker compose logs backend
```

### Expected Behavior After Fix

1. **Frontend should connect to localhost:8000** for client-side requests
2. **Server-side requests should use backend:8000** (Docker internal networking)
3. **No more pmcs.site references** in the logs
4. **Authentication should work properly** with local backend

### Debugging Steps

1. **Check Environment Variables**:
   ```bash
   docker compose exec frontend env | grep NEXT_PUBLIC
   ```

2. **Check API Client Logs**:
   Look for these log messages in the frontend:
   - `🔗 Client-side API URL: http://localhost:8000`
   - `🔗 Server-side API URL: http://backend:8000`
   - `🚀 API Client initialized with baseURL: ...`

3. **Test Backend Connectivity**:
   ```bash
   curl http://localhost:8000/api/v1/health
   ```

4. **Check Network Connectivity**:
   ```bash
   docker compose exec frontend ping backend
   ```

### Common Issues and Solutions

#### Issue: Still seeing pmcs.site in logs
**Solution**: Clear browser cache and rebuild frontend
```bash
docker compose exec frontend npm run build
```

#### Issue: 502 Bad Gateway
**Solution**: Check if backend is running and accessible
```bash
docker compose logs backend
```

#### Issue: Authentication failures
**Solution**: Check if database is properly initialized
```bash
docker compose exec backend python manage.py migrate
```

#### Issue: SSL errors
**Solution**: Ensure you're using HTTP for local development, not HTTPS

### Prevention

1. **Always use environment variables** for API URLs
2. **Never hardcode external URLs** in the codebase
3. **Use Docker networking** for service-to-service communication
4. **Test locally** before deploying to production

### Support

If issues persist:
1. Check the logs: `docker compose logs`
2. Verify environment variables are set correctly
3. Ensure Docker networking is working
4. Rebuild containers from scratch if needed