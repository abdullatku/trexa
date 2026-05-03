#!/bin/bash

# AWS Elastic Beanstalk Deployment Script for Trexa.Api
# This script helps deploy the .NET API to Beanstalk with HTTPS support

set -e

echo "🚀 Starting Trexa.Api deployment to AWS Elastic Beanstalk"

# Build the application
echo "📦 Building application..."
dotnet publish -c Release -o publish

# Create deployment package
echo "📦 Creating deployment package..."
cd publish
zip -r ../trexa-api-deployment.zip . ../Procfile ../.ebextensions/
cd ..

echo "✅ Deployment package created: trexa-api-deployment.zip"

echo ""
echo "📋 Next steps:"
echo "1. Update .ebextensions/https.config with your SSL certificate ARN"
echo "2. Create/update your Elastic Beanstalk environment:"
echo "   eb create trexa-api-prod --platform '64bit Amazon Linux 2023 v6.1.1 running .NET 9'"
echo "   OR"
echo "   eb deploy"
echo ""
echo "3. Configure SSL certificate in AWS Certificate Manager"
echo "4. Update the SSLCertificateId in .ebextensions/https.config"
echo ""
echo "5. Your API will be available at:"
echo "   HTTP: http://your-environment-url"
echo "   HTTPS: https://your-environment-url"
echo ""
echo "6. Test endpoints:"
echo "   curl https://your-environment-url/"
echo "   curl https://your-environment-url/make-server-2eb59763/health"