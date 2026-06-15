/** 
 *  bank-summary is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    bank-summary is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with bank-summary.  If not, see <https://gnu.org>.
*/
import { TextractClient, AnalyzeExpenseCommand } from "@aws-sdk/client-textract";
import { DynamoDBClient, UpdateItemCommand } from "@aws-sdk/client-dynamodb";

const REGION = process.env.REGION || "us-east-1";
const textract = new TextractClient({ region: REGION });
const dynamo = new DynamoDBClient({ region: REGION });
const TRANSACTIONS_TABLE = process.env.DYNAMODB_TABLE_TRANSACTIONS || "Transactions";

/**
 * Parse a date string extracted from a receipt into an ISO 8601 datetime string.
 * Textract can return dates in many formats, e.g.:
 *   "01/15/2025", "2025-01-15", "Jan 15, 2025", "15-Jan-2025", "January 15 2025"
 * Returns an ISO string ("2025-01-15T00:00:00.000Z") or null if unparseable.
 */
function parseTxDate(raw: string): string | null {
  if (!raw) return null;

  // Normalise separators and trim
  const cleaned = raw.trim();

  // Attempt 1: let the JS Date constructor handle it directly
  // Works for: "2025-01-15", "Jan 15, 2025", "January 15 2025", "15 Jan 2025"
  const direct = new Date(cleaned);
  if (!isNaN(direct.getTime())) {
    return direct.toISOString();
  }

  // Attempt 2: MM/DD/YYYY  or  MM-DD-YYYY
  const mdyMatch = cleaned.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (mdyMatch) {
    const [, month, day, year] = mdyMatch;
    const d = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    if (!isNaN(d.getTime())) return d.toISOString();
  }

  // Attempt 3: DD/MM/YYYY  or  DD-MM-YYYY  (European style — only try if month > 12 above failed)
  const dmyMatch = cleaned.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmyMatch) {
    const [, day, month, year] = dmyMatch;
    const d = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    if (!isNaN(d.getTime())) return d.toISOString();
  }

  // Attempt 4: DD-Mon-YYYY  e.g. "15-Jan-2025"
  const dMonYMatch = cleaned.match(/^(\d{1,2})[\/\-\s]([A-Za-z]{3,9})[\/\-\s](\d{4})$/);
  if (dMonYMatch) {
    const [, day, monthStr, year] = dMonYMatch;
    const d = new Date(`${monthStr} ${day}, ${year}`);
    if (!isNaN(d.getTime())) return d.toISOString();
  }

  console.warn(`parseTxDate: could not parse date string "${raw}"`);
  return null;
}

export const handler = async (event: any) => {
  console.log("Received S3 event", JSON.stringify(event, null, 2));

  for (const record of event.Records || []) {
    try {
      const bucket = record.s3.bucket.name;
      const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, " "));
      console.log(`Processing s3://${bucket}/${key}`);

      // 1. Run AnalyzeExpense instead of DetectDocumentText
      const texCmd = new AnalyzeExpenseCommand({ 
        Document: { S3Object: { Bucket: bucket, Name: key } } 
      });
      const texResp = await textract.send(texCmd);

      // 2. Parse the ExpenseDocuments to find specific fields
      let merchant = null;
      let amount: number | null = null;
      let txDate = null;
      
      let confidenceSum = 0;
      let confidenceCount = 0;

      if (texResp.ExpenseDocuments && texResp.ExpenseDocuments.length > 0) {
        // We typically only have 1 document per receipt
        const doc = texResp.ExpenseDocuments[0]; 
        
        for (const field of doc.SummaryFields || []) {
          const fieldType = field.Type?.Text;
          const fieldValue = field.ValueDetection?.Text;
          const fieldConfidence = field.ValueDetection?.Confidence || 0;

          if (fieldType === 'VENDOR_NAME' && fieldValue) {
            merchant = fieldValue;
            confidenceSum += fieldConfidence;
            confidenceCount++;
          }
          if (fieldType === 'TOTAL' && fieldValue) {
            // Remove any dollar signs or commas before parsing
            const cleanAmount = fieldValue.replace(/[^0-9.-]+/g, ""); 
            amount = parseFloat(cleanAmount);
            confidenceSum += fieldConfidence;
            confidenceCount++;
          }
          if (fieldType === 'INVOICE_RECEIPT_DATE' && fieldValue) {
            txDate = parseTxDate(fieldValue);
            confidenceSum += fieldConfidence;
            confidenceCount++;
          }
        }
      }

      // Calculate an average confidence for the fields we care about
      const confidence = confidenceCount === 0 ? 0 : Math.round((confidenceSum / confidenceCount));

      // Determine transactionId from key — expected format: uploads/{userId}/{year-month}/{transactionId}/{filename}
      const keyParts = key.split('/');
      const transactionId = keyParts.length >= 5 ? keyParts[keyParts.length - 2] : null;
      const userId = keyParts[1] || null;

      // Update DynamoDB transaction item with extracted fields.
      // ConditionExpression ensures we only update an existing record —
      // if the transaction was not pre-created by the API the update fails
      // rather than silently creating a second bare item.
      if (transactionId && userId) {
        const updateParams = {
          TableName: TRANSACTIONS_TABLE,
          Key: { "transactionId": { S: transactionId } },
          ConditionExpression: "attribute_exists(transactionId)",
          UpdateExpression: "SET extractedData = :ed, receiptImageUrl = :url, #s = :status, amount = :amt, transactionDate = :dt, #t = :type, merchantName = :merchant, userId = :user",
          ExpressionAttributeNames: { "#s": "status", "#t": "type" },
          ExpressionAttributeValues: {
            ":ed": { M: {
              confidence: { N: String(confidence) },
              merchantName: { S: merchant || '' },
              ...(amount !== null && !isNaN(amount) ? { amount: { N: String(amount) } } : {}),
              ...(txDate ? { txDate: { S: txDate } } : {}),
            }},
            ":merchant": { S: merchant || '' },
            ":url": { S: `s3://${bucket}/${key}` },
            ":type": { S: 'PAYMENT' },
            ":user": { S: userId},
            ":status": { S: confidence >= 90 ? 'PENDING' : 'NEEDS_MANUAL_REVIEW' },
            ":amt": { N: amount !== null && !isNaN(amount) ? String(amount) : '0' },
            ":dt": { S: txDate || '' },
          }
        } as any;

        await dynamo.send(new UpdateItemCommand(updateParams));
        console.log(`Updated transaction ${transactionId} with confidence ${confidence}`);
      } else {
        console.warn('Could not infer transactionId/userId from key, skipping DB update');
      }

    } catch (err: any) {
      if (err?.name === 'ConditionalCheckFailedException') {
        console.error(`Transaction ${record.s3?.object?.key} not found in DB — skipping update to prevent duplicate record creation`);
      } else {
        console.error('Error processing record', err);
      }
      // Note: In production, consider sending to DLQ or retry logic
    }
  }

  return { statusCode: 200 };
};