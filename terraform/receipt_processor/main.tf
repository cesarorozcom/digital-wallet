terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.region
}

data "aws_caller_identity" "current" {}

data "aws_iam_policy_document" "lambda_assume_role" {
  statement {
    effect = "Allow"
    principals {
      type = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
    actions = ["sts:AssumeRole"]
  }
}

resource "aws_iam_role" "lambda_exec" {
  name = "receipt-processor-lambda-role-${var.env}"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json
}

data "aws_iam_policy_document" "lambda_policy" {
  statement {
    effect = "Allow"
    actions = ["logs:CreateLogGroup","logs:CreateLogStream","logs:PutLogEvents"]
    resources = ["arn:aws:logs:*:*:*"]
  }
  statement {
    effect = "Allow"
    actions = ["s3:GetObject"]
    resources = ["arn:aws:s3:::${var.s3_bucket}/*"]
  }
  statement {
    effect = "Allow"
    actions = ["textract:DetectDocumentText"]
    resources = ["*"]
  }
  statement {
    effect = "Allow"
    actions = ["comprehend:DetectEntities","comprehend:DetectKeyPhrases"]
    resources = ["*"]
  }
  statement {
    effect = "Allow"
    actions = ["dynamodb:UpdateItem","dynamodb:GetItem"]
    resources = ["arn:aws:dynamodb:${var.region}:${data.aws_caller_identity.current.account_id}:table/${var.dynamodb_table}"]
  }
}

resource "aws_iam_role_policy" "lambda_policy" {
  name = "receipt-processor-policy-${var.env}"
  role = aws_iam_role.lambda_exec.id
  policy = data.aws_iam_policy_document.lambda_policy.json
}

resource "aws_lambda_function" "receipt_processor" {
  filename         = var.lambda_zip_path
  function_name    = "receipt-processor-${var.env}"
  role             = aws_iam_role.lambda_exec.arn
  handler          = "receiptProcessor.handler"
  runtime          = "nodejs18.x"
  source_code_hash = filebase64sha256(var.lambda_zip_path)
  timeout          = 60
  environment {
    variables = {
      DYNAMODB_TABLE_TRANSACTIONS = var.dynamodb_table
      AWS_REGION = var.region
    }
  }
}

resource "aws_lambda_permission" "allow_s3" {
  statement_id  = "AllowS3Invoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.receipt_processor.function_name
  principal     = "s3.amazonaws.com"
  source_arn    = "arn:aws:s3:::${var.s3_bucket}"
}

resource "aws_s3_bucket_notification" "bucket_notification" {
  bucket = var.s3_bucket

  lambda_function {
    lambda_function_arn = aws_lambda_function.receipt_processor.arn
    events = ["s3:ObjectCreated:*"]
    filter_prefix = var.s3_key_prefix
  }

  depends_on = [aws_lambda_permission.allow_s3]
}
