import { Router } from 'express';
import { prisma } from '../utils/db';
import { asyncHandler } from '../utils/asyncHandler';
import { AriService } from '../services/ari';
import { adminOnly } from '../middleware/auth';

const router = Router();

// GET /api/system/status - System status
router.get(
  '/status',
  asyncHandler(async (req, res) => {
    const ariService = AriService.getInstance();

    res.json({
      api: 'ok',
      database: 'ok',
      asterisk: ariService.isConnected() ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
    });
  })
);

// GET /api/system/settings - Get system settings
router.get(
  '/settings',
  asyncHandler(async (req, res) => {
    const settings = await prisma.setting.findMany();

    const settingsMap = settings.reduce((acc, s) => {
      acc[s.key] = s.value;
      return acc;
    }, {} as Record<string, string | null>);

    res.json(settingsMap);
  })
);

// PUT /api/system/settings - Update settings (admin only)
router.put(
  '/settings',
  adminOnly,
  asyncHandler(async (req, res) => {
    const updates = req.body as Record<string, string>;

    for (const [key, value] of Object.entries(updates)) {
      await prisma.setting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      });
    }

    res.json({ message: 'Settings updated' });
  })
);

// GET /api/system/channels - Get active channels
router.get(
  '/channels',
  asyncHandler(async (req, res) => {
    const ariService = AriService.getInstance();

    if (!ariService.isConnected()) {
      return res.status(503).json({ error: 'Asterisk not connected' });
    }

    const channels = await ariService.getChannels();
    res.json({ data: channels });
  })
);

// GET /api/system/audit - Get audit log (admin only)
router.get(
  '/audit',
  adminOnly,
  asyncHandler(async (req, res) => {
    const { page = '1', limit = '50' } = req.query;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        include: {
          user: {
            select: { username: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(String(page)) - 1) * parseInt(String(limit)),
        take: parseInt(String(limit)),
      }),
      prisma.auditLog.count(),
    ]);

    res.json({
      data: logs,
      pagination: {
        page: parseInt(String(page)),
        limit: parseInt(String(limit)),
        total,
        pages: Math.ceil(total / parseInt(String(limit))),
      },
    });
  })
);

export default router;
