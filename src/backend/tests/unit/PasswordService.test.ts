/**
 * PasswordService Unit Tests
 * 
 * Tests for password hashing and verification functionality using bcrypt
 */

import PasswordService from '../../src/services/PasswordService';

describe('PasswordService', () => {
  describe('hash()', () => {
    it('should hash a valid password', async () => {
      const plainPassword = 'securePassword123';
      const hash = await PasswordService.hash(plainPassword);
      
      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      expect(hash.length).toBeGreaterThan(0);
      // Bcrypt hashes start with $2b$
      expect(hash).toMatch(/^\$2[aby]\$/);
    });

    it('should generate different hashes for the same password', async () => {
      const plainPassword = 'samePassword123';
      const hash1 = await PasswordService.hash(plainPassword);
      const hash2 = await PasswordService.hash(plainPassword);
      
      expect(hash1).not.toEqual(hash2); // Different salts
    });

    it('should throw error for empty password', async () => {
      await expect(PasswordService.hash('')).rejects.toThrow(
        'Password must be a non-empty string'
      );
    });

    it('should throw error for password shorter than 8 characters', async () => {
      await expect(PasswordService.hash('short')).rejects.toThrow(
        'Password must be at least 8 characters long'
      );
    });

    it('should throw error for password longer than 128 characters', async () => {
      const longPassword = 'a'.repeat(129);
      await expect(PasswordService.hash(longPassword)).rejects.toThrow(
        'Password must not exceed 128 characters'
      );
    });

    it('should throw error for null password', async () => {
      await expect(PasswordService.hash(null as any)).rejects.toThrow(
        'Password must be a non-empty string'
      );
    });

    it('should throw error for non-string password', async () => {
      await expect(PasswordService.hash(12345 as any)).rejects.toThrow(
        'Password must be a non-empty string'
      );
    });
  });

  describe('compare()', () => {
    let passwordHash: string;

    beforeAll(async () => {
      // Hash a password for testing
      passwordHash = await PasswordService.hash('correctPassword123');
    });

    it('should return true for matching password', async () => {
      const result = await PasswordService.compare('correctPassword123', passwordHash);
      expect(result).toBe(true);
    });

    it('should return false for non-matching password', async () => {
      const result = await PasswordService.compare('wrongPassword123', passwordHash);
      expect(result).toBe(false);
    });

    it('should return false for password with extra characters', async () => {
      const result = await PasswordService.compare('correctPassword123 ', passwordHash);
      expect(result).toBe(false);
    });

    it('should return false for case-sensitive mismatch', async () => {
      const result = await PasswordService.compare('CORRECTPASSWORD123', passwordHash);
      expect(result).toBe(false);
    });

    it('should throw error for empty plainPassword', async () => {
      await expect(PasswordService.compare('', passwordHash)).rejects.toThrow(
        'Password must be a non-empty string'
      );
    });

    it('should throw error for empty passwordHash', async () => {
      await expect(PasswordService.compare('correctPassword123', '')).rejects.toThrow(
        'Password hash must be a non-empty string'
      );
    });

    it('should throw error for null plainPassword', async () => {
      await expect(PasswordService.compare(null as any, passwordHash)).rejects.toThrow(
        'Password must be a non-empty string'
      );
    });

    it('should throw error for null passwordHash', async () => {
      await expect(PasswordService.compare('correctPassword123', null as any)).rejects.toThrow(
        'Password hash must be a non-empty string'
      );
    });

    it('should throw error for invalid hash format', async () => {
      const invalidHash = 'not-a-valid-bcrypt-hash';
      await expect(PasswordService.compare('password123', invalidHash)).rejects.toThrow(
        'Password comparison failed'
      );
    });
  });

  describe('getSaltRounds()', () => {
    it('should return the configured salt rounds', () => {
      const saltRounds = PasswordService.getSaltRounds();
      expect(saltRounds).toBe(12);
    });

    it('should return a number', () => {
      const saltRounds = PasswordService.getSaltRounds();
      expect(typeof saltRounds).toBe('number');
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complete registration and login flow', async () => {
      // Registration phase
      const userPassword = 'NewUserPassword456!';
      const passwordHash = await PasswordService.hash(userPassword);

      // Login phase
      const loginAttempt = 'NewUserPassword456!';
      const isValid = await PasswordService.compare(loginAttempt, passwordHash);

      expect(isValid).toBe(true);
    });

    it('should handle multiple login attempts with same hash', async () => {
      const password = 'TestPassword789!';
      const hash = await PasswordService.hash(password);

      // Multiple attempts with correct password
      const attempt1 = await PasswordService.compare('TestPassword789!', hash);
      const attempt2 = await PasswordService.compare('TestPassword789!', hash);
      const attempt3 = await PasswordService.compare('TestPassword789!', hash);

      expect(attempt1).toBe(true);
      expect(attempt2).toBe(true);
      expect(attempt3).toBe(true);
    });

    it('should reject password reset with old password', async () => {
      const oldPassword = 'OldPassword123';
      const newPassword = 'NewPassword456';

      const oldHash = await PasswordService.hash(oldPassword);
      const newHash = await PasswordService.hash(newPassword);

      // Verify old password still works with old hash
      const oldStillValid = await PasswordService.compare(oldPassword, oldHash);
      expect(oldStillValid).toBe(true);

      // Verify old password doesn't work with new hash
      const oldInvalid = await PasswordService.compare(oldPassword, newHash);
      expect(oldInvalid).toBe(false);

      // Verify new password works with new hash
      const newValid = await PasswordService.compare(newPassword, newHash);
      expect(newValid).toBe(true);
    });
  });
});
