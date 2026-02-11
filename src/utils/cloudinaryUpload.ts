import getCloudinary from '../config/cloudinary.js';
import { Readable } from 'stream';

interface UploadResult {
  url: string;
  publicId: string;
}

export const uploadToCloudinary = async (buffer: Buffer, folder: string): Promise<UploadResult> => {
  const result = await new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
    const uploadStream = getCloudinary().uploader.upload_stream(
      { folder: `site-tracker/${folder}`, resource_type: 'image' },
      (error, result) => {
        if (error || !result) {
          reject(error || new Error('Upload failed'));
        } else {
          resolve(result);
        }
      }
    );
    const readable = Readable.from(buffer);
    readable.pipe(uploadStream);
  });

  return { url: result.secure_url, publicId: result.public_id };
};

export const deleteFromCloudinary = async (publicId: string): Promise<void> => {
  await getCloudinary().uploader.destroy(publicId);
};
