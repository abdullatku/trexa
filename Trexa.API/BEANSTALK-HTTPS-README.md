# Trexa.Api - AWS Elastic Beanstalk Deployment

## HTTPS Configuration for Beanstalk

### Problem
When deployed to AWS Elastic Beanstalk, only HTTP works, not HTTPS.

### Solution
The application now properly handles HTTPS through the load balancer with SSL termination.

## Key Changes Made

1. **Kestrel Configuration**: Application listens on `PORT` environment variable (default: 5000)
2. **Forwarded Headers**: Properly handles `X-Forwarded-Proto` for HTTPS detection
3. **Procfile**: Ensures correct startup command for Beanstalk
4. **EB Extensions**: Configures the environment for production deployment

## Deployment Steps

### 1. SSL Certificate Setup
```bash
# Create SSL certificate in AWS Certificate Manager (ACM)
# Note: Must be in us-east-1 for CloudFront, or same region as Beanstalk
aws acm request-certificate \
  --domain-name yourdomain.com \
  --validation-method DNS
```

### 2. Update EB Configuration
Edit `.ebextensions/https.config` and uncomment the HTTPS listener:
```yaml
aws:elb:listener:443:
  SSLCertificateId: arn:aws:acm:region:account:certificate/certificate-id
  ListenerProtocol: HTTPS
  InstancePort: 80
  InstanceProtocol: HTTP
```

### 3. Deploy
```bash
# Run the deployment script
./deploy.sh

# Or manually:
eb create trexa-api-prod --platform "64bit Amazon Linux 2023 v6.1.1 running .NET 9"
eb deploy
```

### 4. Verify HTTPS
```bash
# Test HTTP
curl http://your-environment-url/

# Test HTTPS
curl https://your-environment-url/

# Test API endpoints
curl https://your-environment-url/make-server-2eb59763/health
```

## Environment Variables

Set these in your Beanstalk environment:

- `ASPNETCORE_ENVIRONMENT`: Production
- `PORT`: Automatically set by Beanstalk (default: 5000)

## Troubleshooting

### HTTPS Not Working
1. Check SSL certificate is issued and valid
2. Verify certificate ARN in `.ebextensions/https.config`
3. Ensure certificate region matches Beanstalk region
4. Check load balancer listeners in AWS Console

### Application Not Starting
1. Check Beanstalk logs: `eb logs`
2. Verify Procfile is included in deployment
3. Check environment variables

### Mixed Content Issues
The application properly handles forwarded headers, so `Request.IsHttps` will work correctly even behind the load balancer.