import * as AWS from 'aws-sdk';

// Initialize DynamoDB client
const dynamodb = new AWS.DynamoDB.DocumentClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

export class DynamoDBService {
  /**
   * Get item from DynamoDB
   */
  async get<T>(
    tableName: string,
    key: Record<string, any>
  ): Promise<T | null> {
    try {
      const result = await dynamodb.get({ TableName: tableName, Key: key }).promise();
      return (result.Item as T) || null;
    } catch (error) {
      console.error(`DynamoDB get error: ${error}`);
      throw error;
    }
  }

  /**
   * Put item into DynamoDB
   */
  async put(
    tableName: string,
    item: Record<string, any>
  ): Promise<void> {
    try {
      await dynamodb.put({ TableName: tableName, Item: item }).promise();
    } catch (error) {
      console.error(`DynamoDB put error: ${error}`);
      throw error;
    }
  }

  /**
   * Update item in DynamoDB
   */
  async update(
    tableName: string,
    key: Record<string, any>,
    updateExpression: string,
    expressionAttributeValues: Record<string, any>
  ): Promise<void> {
    try {
      await dynamodb
        .update({
          TableName: tableName,
          Key: key,
          UpdateExpression: updateExpression,
          ExpressionAttributeValues: expressionAttributeValues,
        })
        .promise();
    } catch (error) {
      console.error(`DynamoDB update error: ${error}`);
      throw error;
    }
  }

  /**
   * Query items from DynamoDB
   */
  async query<T>(
    tableName: string,
    keyConditionExpression: string,
    expressionAttributeValues: Record<string, any>
  ): Promise<T[]> {
    try {
      const result = await dynamodb
        .query({
          TableName: tableName,
          KeyConditionExpression: keyConditionExpression,
          ExpressionAttributeValues: expressionAttributeValues,
        })
        .promise();
      return (result.Items as T[]) || [];
    } catch (error) {
      console.error(`DynamoDB query error: ${error}`);
      throw error;
    }
  }

  /**
   * Delete item from DynamoDB
   */
  async delete(
    tableName: string,
    key: Record<string, any>
  ): Promise<void> {
    try {
      await dynamodb.delete({ TableName: tableName, Key: key }).promise();
    } catch (error) {
      console.error(`DynamoDB delete error: ${error}`);
      throw error;
    }
  }
}

export default new DynamoDBService();
