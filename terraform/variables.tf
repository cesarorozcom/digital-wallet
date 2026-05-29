variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name (development, staging, production)"
  type        = string
  default     = "development"
}

variable "project_name" {
  description = "Project name for resource naming"
  type        = string
  default     = "billetera-digital"
}

variable "s3_bucket_name" {
  description = "S3 bucket name for receipt uploads (must be globally unique)"
  type        = string
}

variable "dynamodb_read_capacity" {
  description = "DynamoDB provisioned read capacity units"
  type        = number
  default     = 5
}

variable "dynamodb_write_capacity" {
  description = "DynamoDB provisioned write capacity units"
  type        = number
  default     = 5
}

variable "dynamodb_transactions_read_capacity" {
  description = "DynamoDB transactions table provisioned read capacity"
  type        = number
  default     = 10
}

variable "dynamodb_transactions_write_capacity" {
  description = "DynamoDB transactions table provisioned write capacity"
  type        = number
  default     = 10
}

variable "cloudwatch_log_retention_days" {
  description = "CloudWatch logs retention in days"
  type        = number
  default     = 7
}

variable "backend_iam_username" {
  description = "IAM username for backend application"
  type        = string
  default     = "billetera-backend"
}

variable "lambda_role_name" {
  description = "IAM role name for Lambda functions"
  type        = string
  default     = "billetera-lambda-role"
}

variable "enable_point_in_time_recovery" {
  description = "Enable DynamoDB point-in-time recovery"
  type        = bool
  default     = true
}

variable "tags" {
  description = "Common tags for all resources"
  type        = map(string)
  default = {
    Project     = "Billetera Digital"
    ManagedBy   = "Terraform"
    Environment = "development"
  }
}
