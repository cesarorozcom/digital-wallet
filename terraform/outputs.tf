output "dynamodb_users_table_name" {
  description = "Name of the users DynamoDB table"
  value       = aws_dynamodb_table.users.name
}

output "dynamodb_transactions_table_name" {
  description = "Name of the transactions DynamoDB table"
  value       = aws_dynamodb_table.transactions.name
}

output "dynamodb_categories_table_name" {
  description = "Name of the categories DynamoDB table"
  value       = aws_dynamodb_table.categories.name
}

output "dynamodb_refresh_tokens_table_name" {
  description = "Name of the refresh tokens DynamoDB table"
  value       = aws_dynamodb_table.refresh_tokens.name
}

output "s3_receipts_bucket_name" {
  description = "Name of the S3 bucket for receipt uploads"
  value       = aws_s3_bucket.receipts.id
}

output "s3_receipts_bucket_arn" {
  description = "ARN of the S3 bucket for receipt uploads"
  value       = aws_s3_bucket.receipts.arn
}

output "cloudwatch_backend_log_group_name" {
  description = "Name of the CloudWatch log group for backend"
  value       = aws_cloudwatch_log_group.backend.name
}

output "cloudwatch_lambda_log_group_name" {
  description = "Name of the CloudWatch log group for Lambda"
  value       = aws_cloudwatch_log_group.lambda_receipt_processor.name
}

output "iam_backend_user_name" {
  description = "IAM username for backend application"
  value       = aws_iam_user.backend.name
}

output "iam_backend_access_key_id" {
  description = "AWS Access Key ID for backend user (store securely)"
  value       = aws_iam_access_key.backend.id
  sensitive   = false
}

output "iam_backend_secret_access_key" {
  description = "AWS Secret Access Key for backend user (store securely, never commit to version control)"
  value       = aws_iam_access_key.backend.secret
  sensitive   = true
}

output "lambda_role_arn" {
  description = "ARN of the Lambda execution role"
  value       = aws_iam_role.lambda_role.arn
}

output "lambda_role_name" {
  description = "Name of the Lambda execution role"
  value       = aws_iam_role.lambda_role.name
}

output "backend_environment_variables" {
  description = "Environment variables needed for backend .env configuration"
  value = {
    AWS_REGION              = var.aws_region
    S3_BUCKET_NAME          = aws_s3_bucket.receipts.id
    USERS_TABLE             = aws_dynamodb_table.users.name
    TRANSACTIONS_TABLE      = aws_dynamodb_table.transactions.name
    CATEGORIES_TABLE        = aws_dynamodb_table.categories.name
    REFRESH_TOKENS_TABLE    = aws_dynamodb_table.refresh_tokens.name
    AWS_ACCESS_KEY_ID       = aws_iam_access_key.backend.id
    AWS_SECRET_ACCESS_KEY   = aws_iam_access_key.backend.secret
  }
  sensitive = true
}

output "terraform_outputs_command" {
  description = "Command to extract sensitive outputs"
  value       = "terraform output -json backend_environment_variables | jq -r 'to_entries[] | \"\\(.key)=\\(.value)\"' >> .env"
}
