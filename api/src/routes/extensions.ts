import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/db';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { AriService } from '../services/ari';

const router = Router();

// Validation schemas
const createExtensionSchema = z.object({
  id: z.string().regex(/^\d{3,6}$/, 'Extension must be 3-6 digits'),
  displayName: z.string().min(1).max(100),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  email: z.string().email().optional(),
  department: z.string().max(50).optional(),
  location: z.string().max(50).optional(),
  callerid: z.string().max(100).optional(),
  voicemailEnabled: z.boolean().default(true),
  voicemailPassword: z.string().regex(/^\d{4,8}$/).default('1234'),
});

const updateExtensionSchema = createExtensionSchema.partial().omit({ id: true });

// GET /api/extensions - List all extensions
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { search, page = '1', limit = '50' } = req.query;

    const where = search
      ? {
          OR: [
            { id: { contains: String(search) } },
            { displayName: { contains: String(search), mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [extensions, total] = await Promise.all([
      prisma.extension.findMany({
        where,
        include: {
          endpoint: {
            select: { callerid: true, mailboxes: true, context: true },
          },
        },
        orderBy: { id: 'asc' },
        skip: (parseInt(String(page)) - 1) * parseInt(String(limit)),
        take: parseInt(String(limit)),
      }),
      prisma.extension.count({ where }),
    ]);

    // Get live status from ARI
    const ariService = AriService.getInstance();
    let statuses: Record<string, string> = {};

    if (ariService.isConnected()) {
      try {
        const endpoints = await ariService.getEndpoints();
        statuses = endpoints.reduce((acc: Record<string, string>, ep: any) => {
          if (ep.technology === 'PJSIP') {
            acc[ep.resource] = ep.state;
          }
          return acc;
        }, {});
      } catch (e) {
        // ARI not available, continue without status
      }
    }

    const extensionsWithStatus = extensions.map((ext) => ({
      ...ext,
      status: statuses[ext.id] || 'unknown',
    }));

    res.json({
      data: extensionsWithStatus,
      pagination: {
        page: parseInt(String(page)),
        limit: parseInt(String(limit)),
        total,
        pages: Math.ceil(total / parseInt(String(limit))),
      },
    });
  })
);

// GET /api/extensions/:id - Get single extension
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const extension = await prisma.extension.findUnique({
      where: { id: req.params.id },
      include: {
        endpoint: true,
      },
    });

    if (!extension) {
      throw new ApiError(404, 'Extension not found');
    }

    // Get voicemail if exists
    const voicemail = await prisma.voicemail.findFirst({
      where: { mailbox: req.params.id },
    });

    // Get live status
    const ariService = AriService.getInstance();
    let status = 'unknown';

    if (ariService.isConnected()) {
      try {
        const endpoint = await ariService.getEndpoint('PJSIP', req.params.id);
        status = endpoint.state;
      } catch (e) {
        // Endpoint not registered
        status = 'offline';
      }
    }

    res.json({
      ...extension,
      voicemail,
      status,
    });
  })
);

// POST /api/extensions - Create new extension
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const data = createExtensionSchema.parse(req.body);

    // Check if extension already exists
    const existing = await prisma.psEndpoint.findUnique({
      where: { id: data.id },
    });

    if (existing) {
      throw new ApiError(409, 'Extension already exists');
    }

    // Create all related records in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create PJSIP endpoint
      await tx.psEndpoint.create({
        data: {
          id: data.id,
          aors: data.id,
          auth: data.id,
          callerid: data.callerid || `"${data.displayName}" <${data.id}>`,
          mailboxes: data.voicemailEnabled ? `${data.id}@default` : null,
        },
      });

      // 2. Create PJSIP auth
      await tx.psAuth.create({
        data: {
          id: data.id,
          username: data.id,
          password: data.password,
        },
      });

      // 3. Create PJSIP AOR
      await tx.psAor.create({
        data: {
          id: data.id,
        },
      });

      // 4. Create extension metadata
      const extension = await tx.extension.create({
        data: {
          id: data.id,
          displayName: data.displayName,
          email: data.email,
          department: data.department,
          location: data.location,
        },
      });

      // 5. Create voicemail if enabled
      if (data.voicemailEnabled) {
        await tx.voicemail.create({
          data: {
            mailbox: data.id,
            password: data.voicemailPassword,
            fullname: data.displayName,
            email: data.email,
          },
        });
      }

      return extension;
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: (req as any).user?.id,
        action: 'CREATE',
        entityType: 'extension',
        entityId: data.id,
        newValues: data as any,
        ipAddress: req.ip,
      },
    });

    res.status(201).json(result);
  })
);

// PUT /api/extensions/:id - Update extension
router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const data = updateExtensionSchema.parse(req.body);

    const existing = await prisma.extension.findUnique({
      where: { id: req.params.id },
      include: { endpoint: true },
    });

    if (!existing) {
      throw new ApiError(404, 'Extension not found');
    }

    const result = await prisma.$transaction(async (tx) => {
      // Update endpoint if relevant fields changed
      if (data.callerid || data.displayName) {
        await tx.psEndpoint.update({
          where: { id: req.params.id },
          data: {
            callerid: data.callerid || `"${data.displayName}" <${req.params.id}>`,
          },
        });
      }

      // Update password if provided
      if (data.password) {
        await tx.psAuth.update({
          where: { id: req.params.id },
          data: { password: data.password },
        });
      }

      // Update extension metadata
      const extension = await tx.extension.update({
        where: { id: req.params.id },
        data: {
          displayName: data.displayName,
          email: data.email,
          department: data.department,
          location: data.location,
        },
      });

      return extension;
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: (req as any).user?.id,
        action: 'UPDATE',
        entityType: 'extension',
        entityId: req.params.id,
        oldValues: existing as any,
        newValues: data as any,
        ipAddress: req.ip,
      },
    });

    res.json(result);
  })
);

// DELETE /api/extensions/:id - Delete extension
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const existing = await prisma.extension.findUnique({
      where: { id: req.params.id },
    });

    if (!existing) {
      throw new ApiError(404, 'Extension not found');
    }

    // Delete in transaction (cascades handle related records)
    await prisma.$transaction(async (tx) => {
      // Delete voicemail
      await tx.voicemail.deleteMany({
        where: { mailbox: req.params.id },
      });

      // Delete extension (cascades to endpoint, auth, aor)
      await tx.psEndpoint.delete({
        where: { id: req.params.id },
      });
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: (req as any).user?.id,
        action: 'DELETE',
        entityType: 'extension',
        entityId: req.params.id,
        oldValues: existing as any,
        ipAddress: req.ip,
      },
    });

    res.status(204).send();
  })
);

export default router;
