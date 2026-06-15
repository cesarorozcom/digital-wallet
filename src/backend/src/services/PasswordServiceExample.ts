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
import PasswordService from '../services/PasswordService';

/**
 * Example usage and test of PasswordService
 * 
 * This demonstrates how to use the PasswordService in authentication flows
 */
export class PasswordServiceExample {
  /**
   * Example: User registration - hash password
   */
  static async exampleHashPassword(): Promise<string> {
    try {
      const plainPassword = 'MySecurePassword123!';
      const passwordHash = await PasswordService.hash(plainPassword);
      
      console.log('✓ Password hashed successfully');
      console.log(`  Plain password: ${plainPassword}`);
      console.log(`  Hashed: ${passwordHash.substring(0, 40)}...`);
      
      return passwordHash;
    } catch (error) {
      console.error('✗ Password hashing failed:', error);
      throw error;
    }
  }

  /**
   * Example: User login - verify password
   */
  static async exampleVerifyPassword(): Promise<boolean> {
    try {
      // In real scenario, this hash would come from database
      const storedHash = '$2b$12$...'; // Simulated hash
      const userInputPassword = 'MySecurePassword123!';
      
      const isMatch = await PasswordService.compare(userInputPassword, storedHash);
      
      console.log(`✓ Password verification: ${isMatch ? 'MATCH' : 'NO MATCH'}`);
      
      return isMatch;
    } catch (error) {
      console.error('✗ Password verification failed:', error);
      throw error;
    }
  }

  /**
   * Example: Integration with UserService
   */
  static async exampleIntegration(): Promise<void> {
    try {
      const userPassword = 'NewUserPassword456!';
      
      // Step 1: Hash password during registration
      const hashedPassword = await PasswordService.hash(userPassword);
      console.log('✓ Step 1: Password hashed during registration');
      
      // Step 2: Store hashed password in database
      // await database.users.create({ email, passwordHash: hashedPassword });
      console.log('✓ Step 2: Hashed password stored in database');
      
      // Step 3: Verify password during login
      const loginAttempt = 'NewUserPassword456!';
      const isPasswordValid = await PasswordService.compare(loginAttempt, hashedPassword);
      console.log(`✓ Step 3: Login password verified - ${isPasswordValid ? 'SUCCESS' : 'FAILED'}`);
      
      if (isPasswordValid) {
        console.log('✓ User authenticated successfully');
        // Issue JWT token
      } else {
        console.log('✗ Invalid password');
      }
    } catch (error) {
      console.error('✗ Integration example failed:', error);
      throw error;
    }
  }
}

export default PasswordServiceExample;
