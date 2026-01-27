import { useCallback, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthenticatedSupabase } from '@/hooks/useAuthenticatedSupabase';

interface UploadResult {
  path: string;
  publicUrl: string;
}

/**
 * Hook for uploading receipt images to Supabase Storage.
 * Files are stored in the receipt-images bucket with path: {user_id}/{timestamp}_{filename}
 */
export function useReceiptImageUpload() {
  const { user } = useAuth();
  const supabase = useAuthenticatedSupabase();
  const [isUploading, setIsUploading] = useState(false);

  const uploadReceiptImage = useCallback(
    async (file: File): Promise<UploadResult> => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      setIsUploading(true);

      try {
        // Generate unique path: {user_id}/{timestamp}_{sanitized_filename}
        const timestamp = Date.now();
        const sanitizedFilename = file.name
          .replace(/[^a-zA-Z0-9._-]/g, '_')
          .toLowerCase();
        const path = `${user.id}/${timestamp}_${sanitizedFilename}`;

        // Upload to storage
        const { data, error } = await supabase.storage
          .from('receipt-images')
          .upload(path, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (error) {
          throw error;
        }

        // Get the public URL (signed URL since bucket is private)
        const { data: urlData } = supabase.storage
          .from('receipt-images')
          .getPublicUrl(data.path);

        return {
          path: data.path,
          publicUrl: urlData.publicUrl,
        };
      } finally {
        setIsUploading(false);
      }
    },
    [user?.id, supabase]
  );

  return {
    uploadReceiptImage,
    isUploading,
  };
}
