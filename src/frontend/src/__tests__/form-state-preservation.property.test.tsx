/**
 * Property-based tests for ReceiptUpload form state preservation on upload failure
 *
 * Property 7: Form state preservation on upload failure
 * Validates: Requirements 6.4
 *
 * For any combination of file, categoryId, and transactionDate values entered
 * into ReceiptUpload, if the upload attempt throws an error, all three form
 * fields SHALL retain their values after the error is displayed.
 */
import React from 'react';
import { render, within, waitFor, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import * as fc from 'fast-check';
import { ReceiptUpload } from '../components/ReceiptUpload';
import { Category } from '../services/api';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

const MOCK_CATEGORIES: Category[] = [
  { categoryId: 'cat-1', name: 'Food', color: '#ff0000', userId: 'user-1', icon: '🍔', createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  { categoryId: 'cat-2', name: 'Transport', color: '#00ff00', userId: 'user-1', icon: '🚌', createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
];

/** Today's date in YYYY-MM-DD format — the initial default value */
const todayDateString = () => new Date().toISOString().split('T')[0];

/**
 * Creates a synthetic JPEG File object that passes ReceiptUpload's validation.
 */
function makeJpegFile(name: string): File {
  const content = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]); // minimal JPEG magic bytes
  return new File([content], name.endsWith('.jpg') ? name : `${name}.jpg`, {
    type: 'image/jpeg',
  });
}

// ---------------------------------------------------------------------------
// Arbitrary generators
// ---------------------------------------------------------------------------

/** Safe file base-names */
const fileNameArb = fc
  .string({ minLength: 1, maxLength: 20 })
  .filter((s) => /^[a-zA-Z0-9_-]+$/.test(s));

/** categoryId must match one of the mock categories */
const categoryIdArb = fc.constantFrom('cat-1', 'cat-2');

/** Arbitrary error messages that the upload pipeline might throw */
const errorMessageArb = fc
  .string({ minLength: 1, maxLength: 80 })
  .filter((s) => s.trim().length > 0 && !s.includes('\0'));

/** Date strings in YYYY-MM-DD format */
const dateArb = fc
  .tuple(
    fc.integer({ min: 2020, max: 2030 }),
    fc.integer({ min: 1, max: 12 }),
    fc.integer({ min: 1, max: 28 }),
  )
  .map(([y, m, d]) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`);

// ---------------------------------------------------------------------------
// Property 7: Form state preservation on upload failure
// Validates: Requirements 6.4
// ---------------------------------------------------------------------------

describe('Property 7: Form state preservation on upload failure (Validates: Requirements 6.4)', () => {
  beforeAll(() => {
    jest.setTimeout(60000);
  });

  afterEach(() => {
    cleanup();
  });

  it('preserves categoryId and transactionDate when onUpload throws', async () => {
    await fc.assert(
      fc.asyncProperty(
        fileNameArb,
        categoryIdArb,
        dateArb,
        errorMessageArb,
        async (fileName, catId, date, errorMsg) => {
          // Cleanup between iterations to prevent DOM accumulation
          cleanup();

          const user = userEvent.setup();

          // onUpload rejects — simulates a failed upload
          const onUpload = jest.fn().mockRejectedValue(new Error(errorMsg));

          const container = document.createElement('div');
          document.body.appendChild(container);

          const { unmount } = render(
            <ReceiptUpload
              categories={MOCK_CATEGORIES}
              onUpload={onUpload}
              isLoading={false}
            />,
            { container },
          );

          const utils = within(container);

          // --- Step 1: select a file ---
          const file = makeJpegFile(fileName);
          const fileInput = container.querySelector(
            'input[type="file"][accept="image/jpeg,image/png"]',
          ) as HTMLInputElement;
          expect(fileInput).not.toBeNull();
          await user.upload(fileInput, file);

          // --- Step 2: pick a category ---
          const categorySelect = utils.getByRole('combobox');
          await user.selectOptions(categorySelect, catId);
          expect((categorySelect as HTMLSelectElement).value).toBe(catId);

          // --- Step 3: set transaction date ---
          const dateInput = utils.getByDisplayValue(todayDateString());
          await user.clear(dateInput);
          await user.type(dateInput, date);

          // --- Step 4: submit the form ---
          const submitBtn = utils.getByRole('button', { name: /upload receipt/i });
          await user.click(submitBtn);

          // --- Step 5: wait for error message and verify fields are preserved ---
          // Query the error div directly by its CSS class to avoid ambiguous text matches
          await waitFor(() => {
            const errorDiv = container.querySelector('.bg-red-50.text-red-700') as HTMLElement;
            expect(errorDiv).not.toBeNull();
            expect(errorDiv!.textContent?.trim()).toContain(errorMsg.trim());
          });

          // Category must still hold the value the user selected
          expect((categorySelect as HTMLSelectElement).value).toBe(catId);

          // Transaction date must still hold the value the user entered
          expect((dateInput as HTMLInputElement).value).toBe(date);

          // Submit button must still be enabled (file is still selected — form is intact)
          expect(submitBtn).not.toBeDisabled();

          unmount();
          document.body.removeChild(container);
        },
      ),
      { numRuns: 10 }, // 10 runs: rendering is expensive; covers a good spread of inputs
    );
  });
});
