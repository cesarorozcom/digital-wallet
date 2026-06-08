# HowTo: Deploy receiptProcessor Lambda to AWS

This guide covers building, packaging, and deploying `receiptProcessor.ts` as an AWS Lambda function triggered by S3 events.

---

## Prerequisites

- AWS CLI installed and configured (`aws configure`)
- Node.js >= 18 installed
- An S3 bucket for receipts (e.g. `family-ledger-receipts-dev`)
- A DynamoDB table for transactions (e.g. `Transactions`)
- Sufficient IAM permissions to create/update Lambda functions, IAM roles, and S3 event notifications

---

## 1. Compile the Lambda

The Lambda lives in `src/backend/lambda/` but the project `tsconfig.json` only includes `src/`. Compile it separately:

```bash
cd src/backend

# Compile only the lambda file, outputting to dist/lambda/
npx tsc \
  --target ES2020 \
  --module commonjs \
  --moduleResolution node \
  --esModuleInterop true \
  --skipLibCheck true \
  --outDir dist/lambda \
  lambda/receiptProcessor.ts
```

Output will be at `src/backend/dist/lambda/receiptProcessor.js`.

---

## 2. Package the deployment zip

Lambda needs the compiled JS plus its runtime dependencies bundled together.

```bash
cd src/backend

# Create a staging directory
mkdir -p lambda-pkg

# Copy compiled output
cp dist/lambda/receiptProcessor.js lambda-pkg/

# Copy only production dependencies
cp -r node_modules lambda-pkg/node_modules

# Zip it up
cd lambda-pkg
zip -r ../receiptProcessor.zip .
cd ..
```

The resulting `receiptProcessor.zip` is your deployment artifact.

> **Tip:** To keep the bundle small, install only production deps into a clean folder first:
> ```bash
> mkdir lambda-pkg && cd lambda-pkg
> cp ../dist/lambda/receiptProcessor.js .
> npm init -y
> npm install --prefix . \
>   @aws-sdk/client-s3 \
>   @aws-sdk/client-textract \
>   @aws-sdk/client-comprehend \
>   @aws-sdk/client-dynamodb
> zip -r ../receiptProcessor.zip .
> ```
> The AWS SDK v3 packages are available in the Lambda Node.js 18+ runtime, so you can also omit them entirely if you target that runtime.

---

## 3. Create the IAM execution role

Skip this step if the role already exists.

```bash
# Create the role
aws iam create-role \
  --role-name receiptProcessorRole \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": { "Service": "lambda.amazonaws.com" },
      "Action": "sts:AssumeRole"
    }]
  }'

# Attach basic execution policy (CloudWatch Logs)
aws iam attach-role-policy \
  --role-name receiptProcessorRole \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

# Allow S3 read on the receipts bucket
aws iam put-role-policy \
  --role-name receiptProcessorRole \
  --policy-name ReceiptProcessorInlinePolicy \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": ["s3:GetObject"],
        "Resource": "arn:aws:s3:::family-ledger-receipts-dev/*"
      },
      {
        "Effect": "Allow",
        "Action": [
          "textract:DetectDocumentText"
        ],
        "Resource": "*"
      },
      {
        "Effect": "Allow",
        "Action": [
          "comprehend:DetectEntities",
          "comprehend:DetectKeyPhrases"
        ],
        "Resource": "*"
      },
      {
        "Effect": "Allow",
        "Action": [
          "dynamodb:UpdateItem"
        ],
        "Resource": "arn:aws:dynamodb:*:*:table/Transactions"
      }
    ]
  }'
```

Note the role ARN from the create-role output — you need it in the next step.

---

## 4. Create or update the Lambda function

### First-time creation

```bash
aws lambda create-function \
  --function-name receiptProcessor \
  --runtime nodejs18.x \
  --role arn:aws:iam::<YOUR_ACCOUNT_ID>:role/receiptProcessorRole \
  --handler receiptProcessor.handler \
  --zip-file fileb://src/backend/receiptProcessor.zip \
  --timeout 60 \
  --memory-size 512 \
  --environment "Variables={
    AWS_REGION=us-east-1,
    DYNAMODB_TABLE_TRANSACTIONS=Transactions
  }"
```

Replace `<YOUR_ACCOUNT_ID>` with your 12-digit AWS account ID.

### Subsequent updates (code change only)

```bash
aws lambda update-function-code \
  --function-name receiptProcessor \
  --zip-file fileb://src/backend/receiptProcessor.zip
```

### Update environment variables only

```bash
aws lambda update-function-configuration \
  --function-name receiptProcessor \
  --environment "Variables={
    AWS_REGION=us-east-1,
    DYNAMODB_TABLE_TRANSACTIONS=Transactions
  }"
```

---

## 5. Wire the S3 trigger

### Allow S3 to invoke the Lambda

```bash
aws lambda add-permission \
  --function-name receiptProcessor \
  --statement-id s3-invoke \
  --action lambda:InvokeFunction \
  --principal s3.amazonaws.com \
  --source-arn arn:aws:s3:::family-ledger-receipts-dev \
  --source-account <YOUR_ACCOUNT_ID>
```

### Add the S3 event notification

```bash
aws s3api put-bucket-notification-configuration \
  --bucket family-ledger-receipts-dev \
  --notification-configuration '{
    "LambdaFunctionConfigurations": [
      {
        "LambdaFunctionArn": "arn:aws:lambda:us-east-1:<YOUR_ACCOUNT_ID>:function:receiptProcessor",
        "Events": ["s3:ObjectCreated:*"]
      }
    ]
  }'
```

This triggers the Lambda whenever a new object is created in the bucket — i.e. every time a receipt is uploaded via the presigned PUT URL.

---

## 6. Verify the deployment

```bash
# Check the function exists and is Active
aws lambda get-function --function-name receiptProcessor

# Tail live logs while you do a test upload
aws logs tail /aws/lambda/receiptProcessor --follow
```

To do a quick smoke test, upload a receipt image manually:

```bash
aws s3 cp /path/to/test-receipt.jpg \
  s3://family-ledger-receipts-dev/test-user/2025-07/test-txn-id/test-receipt.jpg
```

Then check the logs for `Updated transaction test-txn-id` and verify the DynamoDB item was updated:

```bash
aws dynamodb get-item \
  --table-name Transactions \
  --key '{"transactionId": {"S": "test-txn-id"}}'
```

---

## Environment Variables Reference

| Variable | Default | Description |
|---|---|---|
| `AWS_REGION` | `us-east-1` | AWS region for all SDK clients |
| `DYNAMODB_TABLE_TRANSACTIONS` | `Transactions` | DynamoDB table name |

---

## S3 Key Format

The Lambda expects keys in this exact format (produced by `S3Service.buildReceiptKey`):

```
uploads/{userId}/{year-month}/{transactionId}/{filename}
```

Example: `uploads/user-abc123/2025-07/txn-xyz/receipt.jpg`

Keys with fewer than 5 segments are skipped with a warning in the logs.
