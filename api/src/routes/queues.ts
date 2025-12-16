import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/db';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';

const router = Router();

// Validation schemas
const createQueueSchema = z.object({
  name: z.string().min(1).max(128).regex(/^[a-zA-Z0-9_-]+$/, 'Invalid queue name'),
  description: z.string().max(255).optional(),
  strategy: z.enum(['ringall', 'leastrecent', 'fewestcalls', 'random', 'rrmemory', 'linear', 'wrandom']).default('ringall'),
  timeout: z.number().int().min(5).max(300).default(15),
  wrapuptime: z.number().int().min(0).max(300).default(0),
  maxlen: z.number().int().min(0).default(0),
  servicelevel: z.number().int().min(0).default(60),
  musiconhold: z.string().max(128).default('default'),
  announceFrequency: z.number().int().min(0).default(0),
  announcePosition: z.enum(['yes', 'no', 'limit', 'more']).default('yes'),
});

const updateQueueSchema = createQueueSchema.partial().omit({ name: true });

const addMemberSchema = z.object({
  extension: z.string().regex(/^\d{3,6}$/),
  penalty: z.number().int().min(0).max(100).default(0),
});

// GET /api/queues - List all queues
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const queues = await prisma.queue.findMany({
      include: {
        members: {
          orderBy: { penalty: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    res.json({ data: queues });
  })
);

// GET /api/queues/:name - Get single queue with members
router.get(
  '/:name',
  asyncHandler(async (req, res) => {
    const queue = await prisma.queue.findUnique({
      where: { name: req.params.name },
      include: {
        members: {
          orderBy: { penalty: 'asc' },
        },
      },
    });

    if (!queue) {
      throw new ApiError(404, 'Queue not found');
    }

    res.json(queue);
  })
);

// POST /api/queues - Create new queue
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const data = createQueueSchema.parse(req.body);

    const existing = await prisma.queue.findUnique({
      where: { name: data.name },
    });

    if (existing) {
      throw new ApiError(409, 'Queue already exists');
    }

    const queue = await prisma.queue.create({
      data: {
        name: data.name,
        description: data.description,
        strategy: data.strategy,
        timeout: data.timeout,
        wrapuptime: data.wrapuptime,
        maxlen: data.maxlen,
        servicelevel: data.servicelevel,
        musiconhold: data.musiconhold,
        announceFrequency: data.announceFrequency,
        announcePosition: data.announcePosition,
      },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: (req as any).user?.id,
        action: 'CREATE',
        entityType: 'queue',
        entityId: data.name,
        newValues: data as any,
        ipAddress: req.ip,
      },
    });

    res.status(201).json(queue);
  })
);

// PUT /api/queues/:name - Update queue
router.put(
  '/:name',
  asyncHandler(async (req, res) => {
    const data = updateQueueSchema.parse(req.body);

    const existing = await prisma.queue.findUnique({
      where: { name: req.params.name },
    });

    if (!existing) {
      throw new ApiError(404, 'Queue not found');
    }

    const queue = await prisma.queue.update({
      where: { name: req.params.name },
      data,
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: (req as any).user?.id,
        action: 'UPDATE',
        entityType: 'queue',
        entityId: req.params.name,
        oldValues: existing as any,
        newValues: data as any,
        ipAddress: req.ip,
      },
    });

    res.json(queue);
  })
);

// DELETE /api/queues/:name - Delete queue
router.delete(
  '/:name',
  asyncHandler(async (req, res) => {
    const existing = await prisma.queue.findUnique({
      where: { name: req.params.name },
    });

    if (!existing) {
      throw new ApiError(404, 'Queue not found');
    }

    await prisma.queue.delete({
      where: { name: req.params.name },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: (req as any).user?.id,
        action: 'DELETE',
        entityType: 'queue',
        entityId: req.params.name,
        oldValues: existing as any,
        ipAddress: req.ip,
      },
    });

    res.status(204).send();
  })
);

// POST /api/queues/:name/members - Add member to queue
router.post(
  '/:name/members',
  asyncHandler(async (req, res) => {
    const data = addMemberSchema.parse(req.body);

    const queue = await prisma.queue.findUnique({
      where: { name: req.params.name },
    });

    if (!queue) {
      throw new ApiError(404, 'Queue not found');
    }

    // Check extension exists
    const extension = await prisma.extension.findUnique({
      where: { id: data.extension },
    });

    if (!extension) {
      throw new ApiError(404, 'Extension not found');
    }

    // Check if already a member
    const existingMember = await prisma.queueMember.findFirst({
      where: {
        queueName: req.params.name,
        interface: `PJSIP/${data.extension}`,
      },
    });

    if (existingMember) {
      throw new ApiError(409, 'Extension is already a member of this queue');
    }

    const member = await prisma.queueMember.create({
      data: {
        queueName: req.params.name,
        interface: `PJSIP/${data.extension}`,
        membername: extension.displayName,
        penalty: data.penalty,
        stateInterface: `PJSIP/${data.extension}`,
      },
    });

    res.status(201).json(member);
  })
);

// DELETE /api/queues/:name/members/:extension - Remove member from queue
router.delete(
  '/:name/members/:extension',
  asyncHandler(async (req, res) => {
    const member = await prisma.queueMember.findFirst({
      where: {
        queueName: req.params.name,
        interface: `PJSIP/${req.params.extension}`,
      },
    });

    if (!member) {
      throw new ApiError(404, 'Member not found in queue');
    }

    await prisma.queueMember.delete({
      where: { uniqueid: member.uniqueid },
    });

    res.status(204).send();
  })
);

// PUT /api/queues/:name/members/:extension/pause - Pause/unpause member
router.put(
  '/:name/members/:extension/pause',
  asyncHandler(async (req, res) => {
    const { paused } = z.object({ paused: z.boolean() }).parse(req.body);

    const member = await prisma.queueMember.findFirst({
      where: {
        queueName: req.params.name,
        interface: `PJSIP/${req.params.extension}`,
      },
    });

    if (!member) {
      throw new ApiError(404, 'Member not found in queue');
    }

    const updated = await prisma.queueMember.update({
      where: { uniqueid: member.uniqueid },
      data: { paused: paused ? 1 : 0 },
    });

    res.json(updated);
  })
);

export default router;
