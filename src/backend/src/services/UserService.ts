import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import dynamoDBService from './DynamoDBService';

export interface User {
  userId: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  tokenVersion: number;
  status: 'ACTIVE' | 'SUSPENDED' | 'DELETED';
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserDTO {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export class UserService {
  private tableName = process.env.DYNAMODB_TABLE_USERS || 'Users';
  private bcryptRounds = 12;

  /**
   * Create new user
   */
  async createUser(userData: CreateUserDTO): Promise<User> {
    // Check if user already exists
    const existingUser = await this.getUserByEmail(userData.email);
    if (existingUser) {
      throw new Error('Email already registered');
    }

    const userId = uuidv4();
    const now = new Date().toISOString();
    const passwordHash = await this.hashPassword(userData.password);

    const user: User = {
      userId,
      email: userData.email.toLowerCase(),
      passwordHash,
      firstName: userData.firstName.trim(),
      lastName: userData.lastName.trim(),
      tokenVersion: 0,
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    };

    await dynamoDBService.put(this.tableName, user);
    return user;
  }

  /**
   * Get user by ID
   */
  async getUser(userId: string): Promise<User | null> {
    const user = await dynamoDBService.get<User>(this.tableName, { userId });
    return user;
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string): Promise<User | null> {
    const users = await dynamoDBService.query<User>(
      this.tableName,
      'email = :email',
      { ':email': email.toLowerCase() }
    );
    return users.length > 0 ? users[0] : null;
  }

  /**
   * Verify password
   */
  async verifyPassword(plainPassword: string, passwordHash: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, passwordHash);
  }

  /**
   * Hash password
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.bcryptRounds);
  }

  /**
   * Update user profile
   */
  async updateUser(
    userId: string,
    updates: Partial<Omit<User, 'userId' | 'email' | 'passwordHash' | 'status'>>
  ): Promise<User | null> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const updated: User = {
      ...user,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    await dynamoDBService.put(this.tableName, updated);
    return updated;
  }

  /**
   * Increment token version (for logout-all)
   */
  async incrementTokenVersion(userId: string): Promise<void> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }

    await dynamoDBService.update(
      this.tableName,
      { userId },
      'SET tokenVersion = tokenVersion + :increment, updatedAt = :now',
      {
        ':increment': 1,
        ':now': new Date().toISOString(),
      }
    );
  }

  /**
   * Validate password complexity
   */
  validatePasswordStrength(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one digit');
    }

    if (!/[@$!%*?&]/.test(password)) {
      errors.push('Password must contain at least one special character (@$!%*?&)');
    }

    return { valid: errors.length === 0, errors };
  }
}

export default new UserService();
