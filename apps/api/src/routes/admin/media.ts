import { Router } from 'express';
import multer from 'multer';
import { deleteAsset, MAX_UPLOAD_BYTES, uploadAsset } from '../../lib/media';
import { asyncHandler, badRequest, ok } from '../../lib/http';
import { recordAudit } from '../../lib/audit';

export const adminMediaRouter = Router();

/**
 * Files are held in memory, not on disk. Cloudinary ingests the buffer
 * directly, so nothing ever lands in the container's ephemeral filesystem —
 * which on Render is wiped on every deploy.
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
});

adminMediaRouter.post(
  '/',
  upload.single('file'),
  asyncHandler(async (req, res) => {
    const folder = typeof req.body?.folder === 'string' ? req.body.folder.replace(/[^a-z0-9-]/gi, '') : 'products';
    const asset = await uploadAsset(req.file as Express.Multer.File, folder || 'products');

    await recordAudit({
      actor: req.actor!,
      action: 'UPLOAD',
      entity: 'Media',
      entityId: asset.publicId,
      summary: `Uploaded image to ${folder} (${Math.round(asset.bytes / 1024)} KB, ${asset.provider})`,
      req,
    });

    ok(res, asset, 201);
  }),
);

adminMediaRouter.delete(
  '/',
  asyncHandler(async (req, res) => {
    const publicId = typeof req.query.publicId === 'string' ? req.query.publicId : '';
    if (!publicId) throw badRequest('Provide the publicId of the asset to remove.');

    await deleteAsset(publicId);
    await recordAudit({
      actor: req.actor!,
      action: 'DELETE',
      entity: 'Media',
      entityId: publicId,
      summary: `Deleted media asset ${publicId}`,
      req,
    });
    ok(res, { ok: true });
  }),
);
