import DynamoDBService from './DynamoDBService';
import { v4 as uuidv4 } from 'uuid';
import PasswordService from './PasswordService';
import { CreateUserParams, User } from '../models/User';

class UserService {
  private tableName = process.env.USERS_TABLE || 'users';

  /**
   * Create new user with email uniqueness check
   */
  async createUser(params: CreateUserParams): Promise<User> {
    const { email, password, firstName, lastName } = params;

    // Validate password strength
    this.validatePasswordStrength(password);

    // Check if user exists
    const existingUser = await this.getUserByEmail(email);
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Hash password
    const passwordHash = await PasswordService.hash(password);

    const user: User = {
      userId: uuidv4(),
      email: email.toLowerCase(),
      firstName,
      lastName,
      passwordHash,
      tokenVersion: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await DynamoDBService.put(this.tableName, user);
    return user;
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<User | null> {
    const user = await DynamoDBService.get(this.tableName, { userId });
    return (user as User) || null;
  }

  /**
   * Get user by email (queries EmailIndex GSI)
   */
  async getUserByEmail(email: string): Promise<User | null> {
    const users = await DynamoDBService.queryIndex(
      this.tableName,
      'EmailIndex',
      'email = :email',
      { ':email': email.toLowerCase() }
    );
    return (users[0] as User) || null;
  }

  /**
   * Update user
   */
  async updateUser(userId: string, updates: Partial<User>): Promise<User | null> {
    const updated = await DynamoDBService.update(this.tableName, { userId }, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
    return (updated as User) || null;
  }

  /**
   * Verify password
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return PasswordService.compare(password, hash);
  }

  /**
   * Validate password strength
   * Requirements: 8+ chars, uppercase, digit, special char
   */
  validatePasswordStrength(password: string): void {
    const regex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).{8,}$/;
    if (!regex.test(password)) {
      throw new Error(
        'Password must be at least 8 characters with uppercase, digit, and special character'
      );
    }
  }

  /**
   * Increment token version (invalidates all existing tokens)
   * Used for logout-all functionality
   */
  async incrementTokenVersion(userId: string): Promise<void> {
    const user = await this.getUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    await this.updateUser(userId, {
      tokenVersion: user.tokenVersion + 1,
    });
  }
}

export default new UserService();
