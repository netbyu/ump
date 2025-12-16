import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/db';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

// GET /api/cdr - List CDR records with filtering
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const querySchema = z.object({
      startDate: z.string().datetime().optional(),
      endDate: z.string().datetime().optional(),
      src: z.string().optional(),
      dst: z.string().optional(),
      disposition: z.enum(['ANSWERED', 'NO ANSWER', 'BUSY', 'FAILED']).optional(),
      minDuration: z.coerce.number().int().min(0).optional(),
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(50),
    });

    const query = querySchema.parse(req.query);

    const where: any = {};

    // Date range filter
    if (query.startDate || query.endDate) {
      where.calldate = {};
      if (query.startDate) {
        where.calldate.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        where.calldate.lte = new Date(query.endDate);
      }
    }

    // Source/destination filter
    if (query.src) {
      where.src = { contains: query.src };
    }
    if (query.dst) {
      where.dst = { contains: query.dst };
    }

    // Disposition filter
    if (query.disposition) {
      where.disposition = query.disposition;
    }

    // Duration filter
    if (query.minDuration !== undefined) {
      where.billsec = { gte: query.minDuration };
    }

    const [records, total] = await Promise.all([
      prisma.cdr.findMany({
        where,
        orderBy: { calldate: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      prisma.cdr.count({ where }),
    ]);

    res.json({
      data: records,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        pages: Math.ceil(total / query.limit),
      },
    });
  })
);

// GET /api/cdr/stats - Get CDR statistics
router.get(
  '/stats',
  asyncHandler(async (req, res) => {
    const querySchema = z.object({
      startDate: z.string().datetime().optional(),
      endDate: z.string().datetime().optional(),
    });

    const query = querySchema.parse(req.query);

    const where: any = {};

    if (query.startDate || query.endDate) {
      where.calldate = {};
      if (query.startDate) {
        where.calldate.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        where.calldate.lte = new Date(query.endDate);
      }
    }

    const [
      totalCalls,
      answeredCalls,
      totalDuration,
      avgDuration,
    ] = await Promise.all([
      prisma.cdr.count({ where }),
      prisma.cdr.count({ where: { ...where, disposition: 'ANSWERED' } }),
      prisma.cdr.aggregate({
        where,
        _sum: { billsec: true },
      }),
      prisma.cdr.aggregate({
        where: { ...where, disposition: 'ANSWERED' },
        _avg: { billsec: true },
      }),
    ]);

    res.json({
      totalCalls,
      answeredCalls,
      missedCalls: totalCalls - answeredCalls,
      answerRate: totalCalls > 0 ? ((answeredCalls / totalCalls) * 100).toFixed(1) : 0,
      totalDuration: totalDuration._sum.billsec || 0,
      avgDuration: Math.round(avgDuration._avg.billsec || 0),
    });
  })
);

// GET /api/cdr/:id - Get single CDR record
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const record = await prisma.cdr.findUnique({
      where: { id: parseInt(req.params.id) },
    });

    if (!record) {
      return res.status(404).json({ error: 'Record not found' });
    }

    res.json(record);
  })
);

export default router;
