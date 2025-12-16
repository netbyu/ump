import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/db';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';

const router = Router();

// GET /api/voicemail - List all voicemail boxes
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const voicemails = await prisma.voicemail.findMany({
      orderBy: { mailbox: 'asc' },
    });

    res.json({ data: voicemails });
  })
);

// GET /api/voicemail/:mailbox - Get single voicemail box
router.get(
  '/:mailbox',
  asyncHandler(async (req, res) => {
    const voicemail = await prisma.voicemail.findFirst({
      where: { mailbox: req.params.mailbox },
    });

    if (!voicemail) {
      return res.status(404).json({ error: 'Voicemail box not found' });
    }

    res.json(voicemail);
  })
);

// POST /api/voicemail - Create new voicemail box
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const schema = z.object({
      mailbox: z.string().regex(/^\d{3,6}$/, 'Mailbox must be 3-6 digits'),
      fullname: z.string().min(1),
      email: z.string().email().optional().nullable(),
      password: z.string().min(4).max(10).optional(),
      attach: z.boolean().optional().default(true),
      context: z.string().optional().default('default'),
    });

    const { mailbox, fullname, email, password, attach, context } = schema.parse(req.body);

    // Check if mailbox exists
    const existing = await prisma.voicemail.findFirst({
      where: { mailbox, context },
    });

    if (existing) {
      throw new ApiError(400, 'Voicemail box already exists');
    }

    const voicemail = await prisma.voicemail.create({
      data: {
        mailbox,
        fullname,
        email: email || null,
        password: password || '1234',
        attach: attach ? 'yes' : 'no',
        context,
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: (req as any).user?.userId,
        action: 'CREATE',
        entityType: 'voicemail',
        entityId: mailbox,
        newValues: { mailbox, fullname, email },
        ipAddress: req.ip,
      },
    });

    res.status(201).json(voicemail);
  })
);

// PUT /api/voicemail/:mailbox - Update voicemail box
router.put(
  '/:mailbox',
  asyncHandler(async (req, res) => {
    const { mailbox } = req.params;

    const schema = z.object({
      fullname: z.string().min(1).optional(),
      email: z.string().email().optional().nullable(),
      password: z.string().min(4).max(10).optional(),
      attach: z.boolean().optional(),
      maxmsg: z.number().min(1).max(9999).optional(),
    });

    const data = schema.parse(req.body);

    const existing = await prisma.voicemail.findFirst({
      where: { mailbox },
    });

    if (!existing) {
      throw new ApiError(404, 'Voicemail box not found');
    }

    const updateData: any = {};
    if (data.fullname) updateData.fullname = data.fullname;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.password) updateData.password = data.password;
    if (data.attach !== undefined) updateData.attach = data.attach ? 'yes' : 'no';
    if (data.maxmsg) updateData.maxmsg = data.maxmsg;

    const voicemail = await prisma.voicemail.update({
      where: { id: existing.id },
      data: updateData,
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: (req as any).user?.userId,
        action: 'UPDATE',
        entityType: 'voicemail',
        entityId: mailbox,
        oldValues: { fullname: existing.fullname, email: existing.email },
        newValues: { ...data, password: data.password ? '***' : undefined },
        ipAddress: req.ip,
      },
    });

    res.json(voicemail);
  })
);

// DELETE /api/voicemail/:mailbox - Delete voicemail box
router.delete(
  '/:mailbox',
  asyncHandler(async (req, res) => {
    const { mailbox } = req.params;

    const existing = await prisma.voicemail.findFirst({
      where: { mailbox },
    });

    if (!existing) {
      throw new ApiError(404, 'Voicemail box not found');
    }

    await prisma.voicemail.delete({
      where: { id: existing.id },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: (req as any).user?.userId,
        action: 'DELETE',
        entityType: 'voicemail',
        entityId: mailbox,
        oldValues: { mailbox, fullname: existing.fullname },
        ipAddress: req.ip,
      },
    });

    res.json({ message: 'Voicemail box deleted' });
  })
);

export default router;
