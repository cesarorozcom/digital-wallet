import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client);

class DynamoDBService {
  async get(tableName: string, key: Record<string, any>) {
    try {
      const command = new GetCommand({
        TableName: tableName,
        Key: key,
      });
      const response = await docClient.send(command);
      return response.Item || null;
    } catch (error) {
      console.error('DynamoDB Get Error:', error);
      throw error;
    }
  }

  async put(tableName: string, item: Record<string, any>) {
    try {
      const command = new PutCommand({
        TableName: tableName,
        Item: item,
      });
      await docClient.send(command);
      return item;
    } catch (error) {
      console.error('DynamoDB Put Error:', error);
      throw error;
    }
  }

  async update(tableName: string, key: Record<string, any>, updates: Record<string, any>) {
    try {
      const updateExpression = Object.keys(updates)
        .map((attr) => `${attr} = :${attr}`)
        .join(', ');

      const expressionAttributeValues = Object.entries(updates).reduce(
        (acc, [k, value]) => {
          acc[`:${k}`] = value;
          return acc;
        },
        {} as Record<string, any>
      );

      const command = new UpdateCommand({
        TableName: tableName,
        Key: key,
        UpdateExpression: `SET ${updateExpression}`,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW',
      });

      const response = await docClient.send(command);
      return response.Attributes || null;
    } catch (error) {
      console.error('DynamoDB Update Error:', error);
      throw error;
    }
  }

  async delete(tableName: string, key: Record<string, any>) {
    try {
      const command = new DeleteCommand({
        TableName: tableName,
        Key: key,
      });
      await docClient.send(command);
      return true;
    } catch (error) {
      console.error('DynamoDB Delete Error:', error);
      throw error;
    }
  }

  async query(
    tableName: string,
    keyConditionExpression: string,
    expressionAttributeValues: Record<string, any>
  ) {
    try {
      const command = new QueryCommand({
        TableName: tableName,
        KeyConditionExpression: keyConditionExpression,
        ExpressionAttributeValues: expressionAttributeValues,
      });
      const response = await docClient.send(command);
      return response.Items || [];
    } catch (error) {
      console.error('DynamoDB Query Error:', error);
      throw error;
    }
  }

  async queryIndex(
    tableName: string,
    indexName: string,
    keyConditionExpression: string,
    expressionAttributeValues: Record<string, any>
  ) {
    try {
      const command = new QueryCommand({
        TableName: tableName,
        IndexName: indexName,
        KeyConditionExpression: keyConditionExpression,
        ExpressionAttributeValues: expressionAttributeValues,
      });
      const response = await docClient.send(command);
      return response.Items || [];
    } catch (error) {
      console.error('DynamoDB Query Index Error:', error);
      throw error;
    }
  }

  async scan(tableName: string) {
    try {
      const command = new ScanCommand({
        TableName: tableName,
      });
      const response = await docClient.send(command);
      return response.Items || [];
    } catch (error) {
      console.error('DynamoDB Scan Error:', error);
      throw error;
    }
  }
}

export default new DynamoDBService();