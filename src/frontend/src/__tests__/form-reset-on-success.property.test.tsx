/**
 * Property-based tests for ReceiptUpload form reset on successful upload
 *
 * Property 8: Form reset on upload success
 * Validates: Requirements 6.2
 *
 * For any combination of file names, categoryId strings, and date strings,
 * after a successful upload the file selection, category, and transaction date
 * fields SHALL each be reset to their default values.
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

/** Today's date in YYYY-MM-DD format — the expected default after reset */
const todayDateString = () => new Date().toISOString().split('T')[0];

/**
 * Creates a synthetic JPEG File object that passes ReceiptUpload's validation
 * (type = image/jpeg, size < 5 MB).
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

/** Safe file base-names (no extension — we add .jpg in makeJpegFile) */
const fileNameArb = fc
  .string({ minLength: 1, maxLength: 20 })
  .filter((s) => /^[a-zA-Z0-9_-]+$/.test(s));

/** categoryId must match one of the mock categories */
const categoryIdArb = fc.constantFrom('cat-1', 'cat-2');

/** Date strings in YYYY-MM-DD format */
const dateArb = fc
  .tuple(
    fc.integer({ min: 2020, max: 2030 }),
    fc.integer({ min: 1, max: 12 }),
    fc.integer({ min: 1, max: 28 }),
  )
  .map(([y, m, d]) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`);

// ---------------------------------------------------------------------------
// Property 8: Form reset on upload success
// Validates: Requirements 6.2
// ---------------------------------------------------------------------------

describe('Property 8: Form reset on upload success (Validates: Requirements 6.2)', () => {
  beforeAll(() => {
    jest.setTimeout(60000);
  });

  afterEach(() => {
    cleanup();
  });

  it('resets file, categoryId, and transactionDate to defaults after a successful upload', async () => {
    await fc.assert(
      fc.asyncProperty(fileNameArb, categoryIdArb, dateArb, async (fileName, catId, date) => {
        // Cleanup between iterations to prevent DOM accumulation
        cleanup();

        const user = userEvent.setup();

        // onUpload resolves immediately — simulates a successful upload
        const onUpload = jest.fn().mockResolvedValue(undefined);

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

        // --- Step 5: wait for success message and verify resets ---
        await waitFor(() => {
          expect(utils.getByText('Receipt uploaded successfully')).toBeInTheDocument();
        });

        // Category should be reset to the empty/default option
        expect((categorySelect as HTMLSelectElement).value).toBe('');

        // Transaction date should be back to today
        expect((dateInput as HTMLInputElement).value).toBe(todayDateString());

        // The submit button should be disabled (no file selected after clear)
        expect(submitBtn).toBeDisabled();

        unmount();
        document.body.removeChild(container);
      }),
      { numRuns: 10 }, // 10 runs: rendering is expensive; each run exercises a unique combination
    );
  });
});
