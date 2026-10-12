#!/bin/bash
# LocalStack runs this once S3 is ready. Creates the local bucket with CORS so the browser can PUT directly.
set -e
awslocal s3 mb s3://acamedia-local || true
awslocal s3api put-bucket-cors --bucket acamedia-local --cors-configuration '{
  "CORSRules": [{"AllowedOrigins": ["http://localhost:5173", "http://localhost:3000"],
                 "AllowedMethods": ["GET", "PUT", "HEAD"],
                 "AllowedHeaders": ["*"], "ExposeHeaders": ["ETag"], "MaxAgeSeconds": 3000}]}'
echo "bucket acamedia-local ready"
