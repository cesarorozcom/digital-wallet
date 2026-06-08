import React, { useRef, useState } from 'react';
import { Category } from '../services/api';

interface ReceiptUploadProps {
  categories: Category[];
  onUpload?: (file: File, categoryId: string, transactionDate: string) => Promise<void>;
  isLoading?: boolean;
}

export function ReceiptUpload({
  categories,
  onUpload,
  isLoading = false,
}: ReceiptUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState('');
  const [transactionDate, setTransactionDate] = useState(
    new Date().toISOString().split('T')[0],
  );
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const VALID_IMAGE_TYPES = ['image/jpeg', 'image/png'];
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

  const validateFile = (file: File): string | null => {
    if (!VALID_IMAGE_TYPES.includes(file.type)) {
      return 'File must be JPEG or PNG format';
    }

    if (file.size > MAX_FILE_SIZE) {
      return 'File size must be less than 5MB';
    }

    return null;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    setSuccess('');

    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      setSelectedFile(null);
      setPreview(null);
      return;
    }

    setSelectedFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onload = (event) => {
      setPreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleCameraClick = () => {
    cameraInputRef.current?.click();
  };

  const handleGalleryClick = () => {
    fileInputRef.current?.click();
  };

  const handleClear = () => {
    setSelectedFile(null);
    setPreview(null);
    setError('');
    setCategoryId('');
    setTransactionDate(new Date().toISOString().split('T')[0]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (cameraInputRef.current) {
      cameraInputRef.current.value = '';
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!selectedFile) {
      setError('Please select an image');
      return;
    }

    if (!categoryId) {
      setError('Please select a category');
      return;
    }

    if (!transactionDate) {
      setError('Please select a transaction date');
      return;
    }

    try {
      if (onUpload) {
        await onUpload(selectedFile, categoryId, transactionDate);
        setSuccess('Receipt uploaded successfully');
        handleClear();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to upload receipt');
    }
  };

  const getCategoryColor = (catId: string): string => {
    const category = categories.find((c) => c.categoryId === catId);
    return category?.color || '#808080';
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow">
        {/* Header */}
        <div className="border-b border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900">Upload Receipt</h2>
          <p className="text-sm text-gray-600 mt-1">
            Take a photo or upload an image of your receipt to extract transaction details
          </p>
        </div>

        <form onSubmit={handleUpload} className="p-6 space-y-6">
          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
              {success}
            </div>
          )}

          {/* Image Input Section */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">Receipt Image</label>

            {/* Camera and Gallery Buttons */}
            <div className="flex gap-3 mb-4">
              <button
                type="button"
                onClick={handleCameraClick}
                disabled={isLoading}
                className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                Take Photo
              </button>

              <button
                type="button"
                onClick={handleGalleryClick}
                disabled={isLoading}
                className="flex-1 px-4 py-3 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-400 text-gray-900 font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                Choose File
              </button>
            </div>

            {/* Hidden File Inputs */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
              disabled={isLoading}
            />

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png"
              onChange={handleFileChange}
              className="hidden"
              disabled={isLoading}
            />

            {/* Image Preview */}
            {preview && (
              <div className="relative bg-gray-100 rounded-lg overflow-hidden">
                <img
                  src={preview}
                  alt="Receipt preview"
                  className="w-full h-auto max-h-96 object-contain"
                />
                <button
                  type="button"
                  onClick={handleClear}
                  disabled={isLoading}
                  className="absolute top-2 right-2 p-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-full transition-colors"
                  title="Clear image"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
                <div className="p-3 bg-blue-50 text-blue-700 text-sm">
                  📷 Image ready for upload ({(selectedFile?.size || 0) / 1024}KB)
                </div>
              </div>
            )}
          </div>

          {/* Category Selection */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">Category</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              disabled={isLoading}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            >
              <option value="">Select a category</option>
              {categories.map((category) => (
                <option key={category.categoryId} value={category.categoryId}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          {/* Transaction Date */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">Transaction Date</label>
            <input
              type="date"
              value={transactionDate}
              onChange={(e) => setTransactionDate(e.target.value)}
              disabled={isLoading}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            />
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading || !selectedFile}
              className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Uploading...
                </span>
              ) : (
                'Upload Receipt'
              )}
            </button>
          </div>

          {/* Info Box */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-gray-700">
            <p className="font-medium text-blue-900 mb-1">💡 Tips:</p>
            <ul className="space-y-1 text-blue-800 text-xs">
              <li>• Capture the entire receipt in good lighting</li>
              <li>• Supported formats: JPEG, PNG (max 5MB)</li>
              <li>• The app will automatically extract merchant name and amount</li>
            </ul>
          </div>
        </form>
      </div>
    </div>
  );
}
