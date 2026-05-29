# Billetera Digital - Terraform Infrastructure

This directory contains Infrastructure-as-Code (IaC) for the Billetera Digital application using Terraform and AWS.

## Overview

The Terraform configuration automates the creation and management of all AWS resources needed for the Billetera Digital platform:

- **DynamoDB Tables**: Users, Transactions, Categories, Refresh Tokens (with TTL)
- **S3 Bucket**: Receipt image storage with CORS, versioning, and encryption
- **IAM Roles & Users**: Lambda execution role and backend application user
- **CloudWatch Logs**: Backend and Lambda function logging with 7-day retention
- **EventBridge/S3**: S3 event notifications for Lambda receipt processor

## Prerequisites

1. **AWS Account** with administrative access
2. **Terraform** >= 1.0 installed ([install](https://www.terraform.io/downloads.html))
3. **AWS CLI** configured with credentials:
   ```bash
   aws configure
   # Enter AWS Access Key ID, Secret Access Key, region, output format
   ```

## Project Structure

```
terraform/
├── main.tf                      # Primary resource definitions
├── variables.tf                 # Input variable declarations
├── outputs.tf                   # Output values
├── terraform.tfvars.example     # Example variable values
├── .gitignore                   # Git ignore for sensitive files
├── README.md                    # This file
└── .terraform/                  # Terraform working directory (git-ignored)
```

## Quick Start

### 1. Initialize Terraform

```bash
cd terraform
terraform init
```

This downloads the AWS provider and sets up the Terraform working directory.

### 2. Configure Variables

Copy the example variables file and customize:

```bash
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars` and update:

```hcl
# REQUIRED: Globally unique S3 bucket name
s3_bucket_name = "billetera-receipts-prod-12345"

# Adjust AWS region if needed
aws_region = "us-east-1"

# Optional: Adjust DynamoDB capacity based on expected load
dynamodb_read_capacity  = 5
dynamodb_write_capacity = 5
```

### 3. Validate Configuration

```bash
terraform validate
```

### 4. Review Planned Changes

```bash
terraform plan
```

This shows all resources that will be created. Review carefully before applying.

### 5. Apply Configuration

```bash
terraform apply
```

Type `yes` when prompted to confirm resource creation.

### 6. Extract Environment Variables

After successful apply, retrieve backend environment variables:

```bash
# View all outputs
terraform output

# Extract as environment variables
terraform output -json backend_environment_variables | \
  jq -r 'to_entries[] | "\(.key)=\(.value)"' > ../../src/backend/.env

# Or manually copy the sensitive outputs
terraform output backend_environment_variables
```

## Resource Details

### DynamoDB Tables

| Table | Hash Key | GSI | Purpose |
|-------|----------|-----|---------|
| `users` | `userId` | EmailIndex | User accounts |
| `transactions` | `transactionId` | UserIdCreatedAtIndex | Financial transactions |
| `categories` | `categoryId` | UserIdIndex | Expense categories |
| `refreshTokens` | `tokenId` | UserIdIndex | JWT refresh tokens (with TTL) |

**Key Features:**
- Point-in-time recovery enabled (customizable)
- Provisioned billing mode (switch to on-demand in `main.tf` if preferred)
- TTL enabled on refreshTokens for automatic cleanup

### S3 Bucket

- **CORS Configuration**: Allows frontend uploads from any origin
- **Versioning**: Enabled for audit trail
- **Encryption**: AES-256 server-side encryption
- **Public Access**: Blocked for security

### IAM Resources

**Lambda Execution Role (`billetera-lambda-role`)**
- DynamoDB: Read/write access to users and transactions tables
- S3: Read access to receipt images
- TextractComprehend: Analyze document text

**Backend Application User (`billetera-backend`)**
- DynamoDB: Full CRUD on all tables
- S3: Upload, download, delete receipts

### CloudWatch Logs

- `/billetera/backend`: Backend API logs (7-day retention)
- `/billetera/lambda/receipt-processor`: Lambda receipt processing logs (7-day retention)

## Common Tasks

### Scaling DynamoDB

To increase capacity for production:

```bash
# Edit terraform.tfvars
# Increase capacity values and apply
terraform apply -var="dynamodb_read_capacity=50"
```

Or modify `terraform.tfvars`:

```hcl
dynamodb_read_capacity  = 25
dynamodb_write_capacity = 25
```

Then apply:

```bash
terraform apply
```

### Switching to On-Demand Billing

Edit `main.tf` and change billing mode:

```hcl
resource "aws_dynamodb_table" "users" {
  # Change from:
  # billing_mode   = "PROVISIONED"
  # To:
  billing_mode = "PAY_PER_REQUEST"
  
  # Remove provisioned throughput:
  # read_capacity  = var.dynamodb_read_capacity
  # write_capacity = var.dynamodb_write_capacity
}
```

### Modifying Log Retention

Edit `terraform.tfvars`:

```hcl
cloudwatch_log_retention_days = 30  # Change from 7 to 30 days
```

Apply:

```bash
terraform apply
```

### Adding Tags to All Resources

Edit `terraform.tfvars`:

```hcl
tags = {
  Project     = "Billetera Digital"
  Environment = "production"
  Owner       = "Platform Team"
  CostCenter  = "Engineering"
}
```

## Backend Environment Variables

After applying Terraform, add the following to `src/backend/.env`:

```env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=<from terraform output>
AWS_SECRET_ACCESS_KEY=<from terraform output>

S3_BUCKET_NAME=<from terraform output>
USERS_TABLE=users
TRANSACTIONS_TABLE=transactions
CATEGORIES_TABLE=categories
REFRESH_TOKENS_TABLE=refreshTokens
```

**Security**: Never commit `.env` files with real credentials to version control.

## Troubleshooting

### Error: "S3 bucket name already exists"

S3 bucket names must be globally unique. Update `s3_bucket_name` in `terraform.tfvars`:

```bash
# Try a different name with timestamp
s3_bucket_name = "billetera-receipts-${date +%s}"
```

### Error: "Access Denied" when applying

Ensure your AWS credentials have sufficient permissions:
- DynamoDB: CreateTable, ListTables, DescribeTable
- S3: CreateBucket, PutBucketPolicy, PutBucketCors
- IAM: CreateRole, CreateUser, CreateAccessKey, PutUserPolicy
- CloudWatch: CreateLogGroup, PutRetentionPolicy
- Lambda: CreateFunction (for Lambda permissions)

### Error: "The API user does not authorize the action"

Your IAM user needs permissions. Ensure you're using AWS credentials with admin or sufficient service permissions.

### Terraform State Issues

If you accidentally delete resources:

```bash
# Refresh state
terraform refresh

# Plan to see what would be recreated
terraform plan

# Reapply to recreate
terraform apply
```

**Never manually delete resources** created by Terraform—use `terraform destroy` instead.

## Destruction & Cleanup

To remove all AWS resources created by Terraform:

```bash
terraform destroy
```

Type `yes` when prompted. **Warning**: This will delete all data in DynamoDB and S3.

For a safer approach, create backups first:

```bash
# Backup DynamoDB tables
aws dynamodb create-backup --table-name users
aws dynamodb create-backup --table-name transactions
aws dynamodb create-backup --table-name categories

# Then destroy
terraform destroy
```

## State Management

Terraform maintains state in `terraform.tfstate`. This file contains resource IDs and configuration—**treat it as sensitive**.

### Remote State (Recommended for Teams)

Store state in S3 with locking:

Create `backend.tf`:

```hcl
terraform {
  backend "s3" {
    bucket         = "my-terraform-state-bucket"
    key            = "billetera/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-locks"
  }
}
```

Then:

```bash
terraform init  # Migrate state to S3
```

## Advanced Configuration

### Environment-Specific Variables

Create separate variable files for dev/staging/prod:

```bash
terraform.tfvars           # Local development
terraform.prod.tfvars      # Production variables
terraform.staging.tfvars   # Staging variables
```

Apply specific configuration:

```bash
terraform apply -var-file="terraform.prod.tfvars"
```

### Import Existing Resources

If you have existing AWS resources not created by Terraform:

```bash
# Import existing S3 bucket
terraform import aws_s3_bucket.receipts my-existing-bucket-name

# Import existing DynamoDB table
terraform import aws_dynamodb_table.users users
```

## References

- [Terraform AWS Provider Documentation](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [Terraform Best Practices](https://www.terraform.io/docs/configuration/best-practices.html)
- [AWS DynamoDB Pricing](https://aws.amazon.com/dynamodb/pricing/)
- [AWS S3 Pricing](https://aws.amazon.com/s3/pricing/)
- [AWS CloudWatch Pricing](https://aws.amazon.com/cloudwatch/pricing/)

## Support

For issues or questions:

1. Check Terraform logs: `terraform plan -out=tfplan && terraform show tfplan`
2. Validate configuration: `terraform validate`
3. Review AWS CloudTrail for API errors
4. Check IAM permissions for your AWS user

## Next Steps

1. **Backend Setup**: Add AWS credentials from Terraform outputs to `.env`
2. **Database Verification**: Test DynamoDB connections from backend
3. **S3 Testing**: Upload a test image to verify S3 and Lambda integration
4. **Monitoring**: Set up CloudWatch alarms for DynamoDB throttling
5. **Backup Strategy**: Configure automated DynamoDB backups
6. **Cost Optimization**: Review actual usage and adjust capacity as needed
