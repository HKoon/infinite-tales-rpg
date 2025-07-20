# Deployment Guide for Infinite Tales RPG

## Zeabur Deployment

This project is configured for deployment on Zeabur with multiple deployment options.

### Prerequisites
- Node.js 18 or higher
- Git repository connected to Zeabur

### Deployment Methods

#### Method 1: Docker Deployment (Recommended)
The project includes a multi-stage Dockerfile optimized for production:
- **Build stage**: Installs all dependencies and builds the application
- **Production stage**: Creates a minimal image with only production dependencies

#### Method 2: Node.js Deployment
Uses the zbpack.json configuration for direct Node.js deployment.

### Configuration Files

- `Dockerfile` - Multi-stage Docker build configuration
- `zbpack.json` - Zeabur build configuration
- `zeabur.json` - Zeabur deployment settings
- `.dockerignore` - Optimizes Docker build by excluding unnecessary files

### Environment Variables

Set these in your Zeabur dashboard:
- `NODE_ENV=production`
- `PORT=3000` (automatically set by Zeabur)
- Add any API keys or secrets your application needs

### Build Process

1. **Install dependencies**: `npm ci --include=dev`
2. **Build application**: `npm run build`
3. **Start server**: `node build`

### Troubleshooting

#### Environment Variable Issues
If you encounter build errors related to `VERCEL_ENV` not being exported:
1. The project automatically handles environment variable compatibility between Vercel and Zeabur
2. Uses dynamic environment imports instead of static imports
3. Falls back to `NODE_ENV` or 'development' if platform-specific variables are unavailable

#### TailwindCSS Build Issues
If you encounter TailwindCSS-related build errors:
1. Ensure TailwindCSS is in devDependencies
2. Verify PostCSS configuration is correct
3. Check that all build dependencies are installed

#### Performance Optimization
- The Docker image uses Alpine Linux for smaller size
- Multi-stage build reduces final image size
- Production dependencies only in final stage
- Proper caching layers for faster rebuilds

### Monitoring

- Check Zeabur logs for deployment status
- Monitor application performance through Zeabur dashboard
- Set up health checks if needed

### Local Testing

To test the Docker build locally:
```bash
# Build the Docker image
docker build -t infinite-tales-rpg .

# Run the container
docker run -p 3000:3000 infinite-tales-rpg
```

### Support

For deployment issues:
1. Check Zeabur documentation
2. Review build logs in Zeabur dashboard
3. Verify all configuration files are correct