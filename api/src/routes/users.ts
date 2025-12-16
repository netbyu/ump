import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { prisma } from '../utils/db';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { adminOnly } from '../middleware/auth';

const router = Router();

// All routes require admin
router.use(adminOnly);

// GET /api/users - List all users
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json({ data: users });
  })
);

// GET /api/users/:id - Get single user
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id);

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    res.json(user);
  })
);

// POST /api/users - Create new user
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const schema = z.object({
      username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_]+$/),
      email: z.string().email().optional().nullable(),
      password: z.string().min(8),
      role: z.enum(['admin', 'user']).default('user'),
    });

    const { username, email, password, role } = schema.parse(req.body);

    // Check if username exists
    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { username },
          ...(email ? [{ email }] : []),
        ],
      },
    });

    if (existing) {
      throw new ApiError(400, 'Username or email already exists');
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        username,
        email: email || null,
        passwordHash,
        role,
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: (req as any).user?.userId,
        action: 'CREATE',
        entityType: 'user',
        entityId: user.id.toString(),
        newValues: { username, email, role },
        ipAddress: req.ip,
      },
    });

    res.status(201).json(user);
  })
);

// PUT /api/users/:id - Update user
router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id);

    const schema = z.object({
      username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_]+$/).optional(),
      email: z.string().email().optional().nullable(),
      password: z.string().min(8).optional(),
      role: z.enum(['admin', 'user']).optional(),
      isActive: z.boolean().optional(),
    });

    const data = schema.parse(req.body);

    const existing = await prisma.user.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new ApiError(404, 'User not found');
    }

    // Check for duplicate username/email
    if (data.username || data.email) {
      const duplicate = await prisma.user.findFirst({
        where: {
          AND: [
            { id: { not: id } },
            {
              OR: [
                ...(data.username ? [{ username: data.username }] : []),
                ...(data.email ? [{ email: data.email }] : []),
              ],
            },
          ],
        },
      });

      if (duplicate) {
        throw new ApiError(400, 'Username or email already exists');
      }
    }

    const updateData: any = {};
    if (data.username) updateData.username = data.username;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.role) updateData.role = data.role;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.password) {
      updateData.passwordHash = await bcrypt.hash(data.password, 10);
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        isActive: true,
        updatedAt: true,
      },
    });

    // Audit log
    const changedFields = { ...data };
    if (changedFields.password) {
      changedFields.password = '***';
    }

    await prisma.auditLog.create({
      data: {
        userId: (req as any).user?.userId,
        action: 'UPDATE',
        entityType: 'user',
        entityId: id.toString(),
        oldValues: {
          username: existing.username,
          email: existing.email,
          role: existing.role,
          isActive: existing.isActive,
        },
        newValues: changedFields,
        ipAddress: req.ip,
      },
    });

    res.json(user);
  })
);

// DELETE /api/users/:id - Delete user
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id);
    const currentUserId = (req as any).user?.userId;

    // Prevent self-deletion
    if (id === currentUserId) {
      throw new ApiError(400, 'Cannot delete your own account');
    }

    const existing = await prisma.user.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new ApiError(404, 'User not found');
    }

    await prisma.user.delete({
      where: { id },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: currentUserId,
        action: 'DELETE',
        entityType: 'user',
        entityId: id.toString(),
        oldValues: { username: existing.username, email: existing.email },
        ipAddress: req.ip,
      },
    });

    res.json({ message: 'User deleted' });
  })
);

export default router;
