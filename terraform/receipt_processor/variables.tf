variable "region" {
  type    = string
  default = "us-east-1"
}

variable "env" {
  type    = string
  default = "dev"
}

variable "s3_bucket" {
  type = string
}

variable "s3_key_prefix" {
  type    = string
  default = "uploads/"
}

variable "dynamodb_table" {
  type = string
}

variable "lambda_zip_path" {
  type = string
}
