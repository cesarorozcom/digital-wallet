import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { TextractClient, DetectDocumentTextCommand } from "@aws-sdk/client-textract";
import { ComprehendClient, DetectEntitiesCommand, DetectKeyPhrasesCommand } from "@aws-sdk/client-comprehend";
import { DynamoDBClient, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import { Readable } from "stream";

const REGION = process.env.AWS_REGION || "us-east-1";
const s3 = new S3Client({ region: REGION });
const textract = new TextractClient({ region: REGION });
const comprehend = new ComprehendClient({ region: REGION });
const dynamo = new DynamoDBClient({ region: REGION });
const TRANSACTIONS_TABLE = process.env.DYNAMODB_TABLE_TRANSACTIONS || "Transactions";

async function streamToBuffer(stream: Readable): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: any[] = [];
    stream.on("data", (c) => chunks.push(c));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
}

function computeAverageConfidence(entities: any[], phrases: any[]): number{
  let sum = 0; let count = 0;
  for(const e of entities || []){ if(typeof e.Score === 'number'){ sum += e.Score; count++; }}
  for(const p of phrases || []){ if(typeof p.Score === 'number'){ sum += p.Score; count++; }}
  return count === 0 ? 0 : Math.round((sum / count) * 100);
}

export const handler = async (event: any) => {
  console.log("Received S3 event", JSON.stringify(event, null, 2));

  for (const record of event.Records || []) {
    try {
      const bucket = record.s3.bucket.name;
      const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, " "));
      console.log(`Processing s3://${bucket}/${key}`);

      // Download object
      const getCmd = new GetObjectCommand({ Bucket: bucket, Key: key });
      const getResp = await s3.send(getCmd);
      const body = await streamToBuffer(getResp.Body as Readable);

      // Run Textract to extract text from document/image
      const texCmd = new DetectDocumentTextCommand({ Document: { Bytes: body } });
      const texResp = await textract.send(texCmd);
      const lines = (texResp.Blocks || []).filter(b => b.BlockType === 'LINE').map(b => b.Text).filter(Boolean);
      const extractedText = lines.join(' ');

      // Call Comprehend for entities and key phrases
      const entitiesCmd = new DetectEntitiesCommand({ LanguageCode: 'en', Text: extractedText });
      const phrasesCmd = new DetectKeyPhrasesCommand({ LanguageCode: 'en', Text: extractedText });
      const [entitiesResp, phrasesResp] = await Promise.all([
        comprehend.send(entitiesCmd),
        comprehend.send(phrasesCmd)
      ]);

      const entities = entitiesResp.Entities || [];
      const phrases = phrasesResp.KeyPhrases || [];
      const confidence = computeAverageConfidence(entities, phrases);

      // Simple extraction heuristics (merchant, amount, date) - best-effort
      const merchant = entities.find((e:any)=>e.Type==='ORGANIZATION' || e.Type==='PERSON')?.Text || null;
      const amountMatch = extractedText.match(/\$?\s?([0-9]+(?:\.[0-9]{2})?)/);
      const amount = amountMatch ? parseFloat(amountMatch[1]) : null;
      const dateMatch = extractedText.match(/(\d{4}-\d{2}-\d{2})|(\d{2}\/\d{2}\/\d{4})/);
      const txDate = dateMatch ? dateMatch[0] : null;

      // Determine transactionId from key (assumes key contains transactionId folder)
      const keyParts = key.split('/');
      const transactionId = keyParts.length >= 3 ? keyParts[keyParts.length-2] : null;
      const userId = keyParts[0] || null;

      // Update DynamoDB transaction item with extractedData
      if (transactionId && userId) {
        const updateParams = {
          TableName: TRANSACTIONS_TABLE,
          Key: { "transactionId": { S: transactionId } },
          UpdateExpression: "SET extractedData = :ed, receiptImageUrl = :url, #s = :status",
          ExpressionAttributeNames: { "#s": "status" },
          ExpressionAttributeValues: {
            ":ed": { M: {
              confidence: { N: String(confidence) },
              rawText: { S: extractedText || '' },
              merchantName: { S: merchant || '' }
            }},
            ":url": { S: `s3://${bucket}/${key}` },
            ":status": { S: confidence >= 90 ? 'PENDING_REVIEW' : 'PENDING_REVIEW' }
          }
        } as any;

        await dynamo.send(new UpdateItemCommand(updateParams));
        console.log(`Updated transaction ${transactionId} with confidence ${confidence}`);
      } else {
        console.warn('Could not infer transactionId/userId from key, skipping DB update');
      }

    } catch (err) {
      console.error('Error processing record', err);
      // Note: In production, consider sending to DLQ or retry logic
    }
  }

  return { statusCode: 200 };
};
