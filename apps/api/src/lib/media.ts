import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { v2 as cloudinary } from 'cloudinary';
import { cloudinaryConfigured, env, isProd } from '../config';
import { badRequest } from './http';
import { logger } from './logger';

export interface UploadedAsset {
  url: string;
  publicId: string;
  width?: number;
  height?: number;
  bytes: number;
  format: string;
  provider: 'cloudinary' | 'local';
}

if (cloudinaryConfigured) {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

const LOCAL_DIR = path.resolve(process.cwd(), 'uploads');

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/svg+xml']);
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

export const assertUploadable = (file?: Express.Multer.File): Express.Multer.File => {
  if (!file) throw badRequest('No file was received.', { file: ['Choose an image to upload'] });
  if (!ALLOWED_MIME.has(file.mimetype)) {
    throw badRequest('Unsupported file type. Use JPG, PNG, WebP, AVIF or SVG.', {
      file: ['Unsupported file type'],
    });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw badRequest(`Image is too large. Maximum ${MAX_UPLOAD_BYTES / 1024 / 1024}MB.`, {
      file: ['File too large'],
    });
  }
  return file;
};

/**
 * Uploads a buffer to Cloudinary when credentials are present. In development
 * without credentials it writes to `apps/api/uploads` and serves from /uploads
 * so the dashboard is fully usable before the client signs up for anything.
 * In production, missing credentials is a hard error — silently writing to
 * ephemeral disk on Render would lose the store owner's images on redeploy.
 */
export const uploadAsset = async (
  file: Express.Multer.File,
  folder = 'products',
): Promise<UploadedAsset> => {
  assertUploadable(file);

  if (cloudinaryConfigured) {
    const result = await new Promise<{
      secure_url: string;
      public_id: string;
      width?: number;
      height?: number;
      bytes: number;
      format: string;
    }>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: `${env.CLOUDINARY_FOLDER}/${folder}`,
          resource_type: 'image',
          transformation: [{ quality: 'auto:good', fetch_format: 'auto' }],
          // Keep the original dimensions; the storefront requests sized variants.
          overwrite: false,
        },
        (error, uploaded) => {
          if (error || !uploaded) {
            reject(
              error instanceof Error
                ? error
                : new Error(typeof error === 'object' && error && 'message' in error ? String(error.message) : 'Upload failed'),
            );
            return;
          }
          resolve(uploaded as never);
        },
      );
      stream.end(file.buffer);
    });

    return {
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
      bytes: result.bytes,
      format: result.format,
      provider: 'cloudinary',
    };
  }

  if (isProd) {
    throw badRequest(
      'Image storage is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET.',
    );
  }

  fs.mkdirSync(LOCAL_DIR, { recursive: true });
  const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
  const name = `${Date.now().toString(36)}-${crypto.randomBytes(6).toString('hex')}${ext}`;
  fs.writeFileSync(path.join(LOCAL_DIR, name), file.buffer);
  logger.warn('Cloudinary not configured — media written to local disk (development only)', { name });

  return {
    url: `/uploads/${name}`,
    publicId: `local:${name}`,
    bytes: file.size,
    format: ext.replace('.', ''),
    provider: 'local',
  };
};

export const deleteAsset = async (publicId: string): Promise<void> => {
  if (publicId.startsWith('local:')) {
    const name = publicId.slice('local:'.length);
    const target = path.join(LOCAL_DIR, path.basename(name));
    if (fs.existsSync(target)) fs.unlinkSync(target);
    return;
  }
  if (!cloudinaryConfigured) return;
  await cloudinary.uploader.destroy(publicId);
};

/** Builds a right-sized delivery URL so the storefront never ships a 4000px original. */
export const transformedUrl = (url: string, width: number): string => {
  if (!url.includes('res.cloudinary.com') || !url.includes('/upload/')) return url;
  return url.replace('/upload/', `/upload/f_auto,q_auto,w_${width},c_limit/`);
};
