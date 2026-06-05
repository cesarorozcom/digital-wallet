import bcrypt from 'bcrypt';

/**
 * PasswordService - Secure password hashing and verification service
 * 
 * Provides bcrypt-based password hashing and comparison for user authentication.
 * All operations are async to prevent blocking the event loop during computation.
 */
export class PasswordService {
  /**
   * Number of salt rounds for bcrypt hashing
   * Higher values = more secure but slower computation
   * Recommended: 10-12 for balance between security and performance
   */
  private static readonly SALT_ROUNDS = 12;

  /**
   * Hash a plaintext password using bcrypt
   * 
   * @param plainPassword - The plaintext password to hash
   * @returns Promise<string> - The bcrypt hash (includes salt)
   * @throws Error if password is empty, null, or hashing fails
   * 
   * @example
   * const hash = await passwordService.hash('mySecurePassword123');
   */
  public static async hash(plainPassword: string): Promise<string> {
    if (!plainPassword || typeof plainPassword !== 'string') {
      throw new Error('Password must be a non-empty string');
    }

    if (plainPassword.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    if (plainPassword.length > 128) {
      throw new Error('Password must not exceed 128 characters');
    }

    try {
      const salt = await bcrypt.genSalt(this.SALT_ROUNDS);
      const hash = await bcrypt.hash(plainPassword, salt);
      return hash;
    } catch (error) {
      throw new Error(`Password hashing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Verify a plaintext password against a bcrypt hash
   * 
   * @param plainPassword - The plaintext password to verify
   * @param passwordHash - The bcrypt hash to compare against
   * @returns Promise<boolean> - True if password matches, false otherwise
   * @throws Error if comparison fails
   * 
   * @example
   * const isMatch = await passwordService.compare('userInputPassword', storedHash);
   * if (isMatch) {
   *   // Password is correct
   * }
   */
  public static async compare(plainPassword: string, passwordHash: string): Promise<boolean> {
    if (!plainPassword || typeof plainPassword !== 'string') {
      throw new Error('Password must be a non-empty string');
    }

    if (!passwordHash || typeof passwordHash !== 'string') {
      throw new Error('Password hash must be a non-empty string');
    }

    try {
      const isMatch = await bcrypt.compare(plainPassword, passwordHash);
      return isMatch;
    } catch (error) {
      throw new Error(`Password comparison failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get the number of salt rounds used for hashing
   * Useful for logging or monitoring password security parameters
   * 
   * @returns number - The current salt rounds value
   */
  public static getSaltRounds(): number {
    return this.SALT_ROUNDS;
  }
}

// Export singleton instance for convenience
export default PasswordService;
