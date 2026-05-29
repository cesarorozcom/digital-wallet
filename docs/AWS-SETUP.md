# AWS Setup Guide

This document outlines how to configure your existing AWS account for the Billetera Digital application.

## Prerequisites

- AWS Account with administrative credentials
- AWS CLI installed and configured (`aws configure`)
- Node.js 18+
- The application code deployed locally

## DynamoDB Table Setup

### Create User Table

The application stores users in DynamoDB. Create the `users` table:

```bash
aws dynamodb create-table \
  --table-name users \
  --attribute-definitions \
    AttributeName=userId,AttributeType=S \
    AttributeName=email,AttributeType=S \
    AttributeName=createdAt,AttributeType=S \
  --key-schema \
    AttributeName=userId,KeyType=HASH \
  --global-secondary-indexes '[{
    "IndexName": "EmailIndex",
    "KeySchema": [
      {"AttributeName": "email", "KeyType": "HASH"}
    ],
    "Projection": {"ProjectionType": "ALL"},
    "ProvisionedThroughput": {
      "ReadCapacityUnits": 5,
      "WriteCapacityUnits": 5
    }
  }]' \
  --billing-mode PROVISIONED \
  --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
  --region us-east-1
```

### Create Transactions Table

```bash
aws dynamodb create-table \
  --table-name transactions \
  --attribute-definitions \
    AttributeName=transactionId,AttributeType=S \
    AttributeName=userId,AttributeType=S \
    AttributeName=createdAt,AttributeType=S \
  --key-schema \
    AttributeName=transactionId,KeyType=HASH \
  --global-secondary-indexes '[{
    "IndexName": "UserIdCreatedAtIndex",
    "KeySchema": [
      {"AttributeName": "userId", "KeyType": "HASH"},
      {"AttributeName": "createdAt", "KeyType": "RANGE"}
    ],
    "Projection": {"ProjectionType": "ALL"},
    "ProvisionedThroughput": {
      "ReadCapacityUnits": 10,
      "WriteCapacityUnits": 10
    }
  }]' \
  --billing-mode PROVISIONED \
  --provisioned-throughput ReadCapacityUnits=10,WriteCapacityUnits=10 \
  --region us-east-1
```

### Create Categories Table

```bash
aws dynamodb create-table \
  --table-name categories \
  --attribute-definitions \
    AttributeName=categoryId,AttributeType=S \
    AttributeName=userId,AttributeType=S \
  --key-schema \
    AttributeName=categoryId,KeyType=HASH \
  --global-secondary-indexes '[{
    "IndexName": "UserIdIndex",
    "KeySchema": [
      {"AttributeName": "userId", "KeyType": "HASH"}
    ],
    "Projection": {"ProjectionType": "ALL"},
    "ProvisionedThroughput": {
      "ReadCapacityUnits": 5,
      "WriteCapacityUnits": 5
    }
  }]' \
  --billing-mode PROVISIONED \
  --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
  --region us-east-1
```

### Create Refresh Tokens Table

```bash
aws dynamodb create-table \
  --table-name refreshTokens \
  --attribute-definitions \
    AttributeName=tokenId,AttributeType=S \
    AttributeName=userId,AttributeType=S \
  --key-schema \
    AttributeName=tokenId,KeyType=HASH \
  --global-secondary-indexes '[{
    "IndexName": "UserIdIndex",
    "KeySchema": [
      {"AttributeName": "userId", "KeyType": "HASH"}
    ],
    "Projection": {"ProjectionType": "ALL"},
    "ProvisionedThroughput": {
      "ReadCapacityUnits": 5,
      "WriteCapacityUnits": 5
    }
  }]' \
  --billing-mode PROVISIONED \
  --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
  --ttl-specification AttributeName=expiresAt,Enabled=true \
  --region us-east-1
```

## S3 Bucket Configuration

### Configure Receipt Upload Bucket

Your S3 bucket should allow the Lambda function to read images and provide CORS support:

```bash
# Enable CORS on your existing bucket
aws s3api put-bucket-cors \
  --bucket YOUR_BUCKET_NAME \
  --cors-configuration '{
    "CORSRules": [{
      "AllowedMethods": ["GET", "PUT", "POST"],
      "AllowedOrigins": ["*"],
      "AllowedHeaders": ["*"],
      "MaxAgeSeconds": 3000
    }]
  }' \
  --region us-east-1

# Enable versioning (recommended for audit trail)
aws s3api put-bucket-versioning \
  --bucket YOUR_BUCKET_NAME \
  --versioning-configuration Status=Enabled \
  --region us-east-1

# Enable server-side encryption
aws s3api put-bucket-encryption \
  --bucket YOUR_BUCKET_NAME \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }' \
  --region us-east-1
```

## IAM Configuration

### Create Lambda Execution Role

```bash
# Create trust policy
cat > trust-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

# Create role
aws iam create-role \
  --role-name BileteraDigitalLambdaRole \
  --assume-role-policy-document file://trust-policy.json
```

### Create Backend Application IAM User

```bash
# Create user
aws iam create-user --user-name billetera-backend

# Create policy for DynamoDB and S3 access
cat > backend-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:Query",
        "dynamodb:Scan"
      ],
      "Resource": [
        "arn:aws:dynamodb:us-east-1:ACCOUNT_ID:table/users",
        "arn:aws:dynamodb:us-east-1:ACCOUNT_ID:table/users/index/*",
        "arn:aws:dynamodb:us-east-1:ACCOUNT_ID:table/transactions",
        "arn:aws:dynamodb:us-east-1:ACCOUNT_ID:table/transactions/index/*",
        "arn:aws:dynamodb:us-east-1:ACCOUNT_ID:table/categories",
        "arn:aws:dynamodb:us-east-1:ACCOUNT_ID:table/categories/index/*",
        "arn:aws:dynamodb:us-east-1:ACCOUNT_ID:table/refreshTokens",
        "arn:aws:dynamodb:us-east-1:ACCOUNT_ID:table/refreshTokens/index/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::YOUR_BUCKET_NAME",
        "arn:aws:s3:::YOUR_BUCKET_NAME/*"
      ]
    }
  ]
}
EOF

# Attach policy
aws iam put-user-policy \
  --user-name billetera-backend \
  --policy-name BackendPolicy \
  --policy-document file://backend-policy.json

# Create access keys
aws iam create-access-key --user-name billetera-backend
```

## Environment Variables

After completing the setup, configure your backend `.env`:

```bash
# Copy from the IAM user access keys
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1

# JWT Configuration
JWT_SECRET=your-super-secret-key-min-32-characters-long

# Server
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000

# S3 Configuration
S3_BUCKET_NAME=your_bucket_name
S3_REGION=us-east-1

# DynamoDB Tables
USERS_TABLE=users
TRANSACTIONS_TABLE=transactions
CATEGORIES_TABLE=categories
REFRESH_TOKENS_TABLE=refreshTokens
```

## CloudWatch Logging Setup

### Create Log Group

```bash
aws logs create-log-group \
  --log-group-name /billetera/backend \
  --region us-east-1

# Set 7-day retention
aws logs put-retention-policy \
  --log-group-name /billetera/backend \
  --retention-in-days 7 \
  --region us-east-1
```

## Verification

Test your DynamoDB setup:

```bash
# List tables
aws dynamodb list-tables --region us-east-1

# Describe tables
aws dynamodb describe-table --table-name users --region us-east-1
```

## References

- [DynamoDB Developer Guide](https://docs.aws.amazon.com/dynamodb/)
- [S3 Developer Guide](https://docs.aws.amazon.com/s3/)
- [Lambda Developer Guide](https://docs.aws.amazon.com/lambda/)
- [CloudWatch Logs Guide](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/)
