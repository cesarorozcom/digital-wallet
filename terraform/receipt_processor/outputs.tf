output "lambda_function_name" {
  value = aws_lambda_function.receipt_processor.function_name
}

output "lambda_function_arn" {
  value = aws_lambda_function.receipt_processor.arn
}

output "iam_role_arn" {
  value = aws_iam_role.lambda_exec.arn
}
