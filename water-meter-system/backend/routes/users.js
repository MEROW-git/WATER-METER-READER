const express = require('express');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { body, param, validationResult } = require('express-validator');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

/**
 * @route   GET /api/users
 * @desc    Get all users (admin only)
 * @access  Private/Admin
 */
router.get('/', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { role, isActive, search } = req.query;

    // Build filter conditions
    const where = {};
    
    if (role && ['admin', 'staff'].includes(role)) {
      where.role = role;
    }
    
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    if (search) {
      where.OR = [
        { username: { contains: search, mode: 'insensitive' } },
        { fullName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        username: true,
        fullName: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ users, count: users.length });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/users/staff
 * @desc    Get all active staff users
 * @access  Private/Admin
 */
router.get('/staff', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const staff = await prisma.user.findMany({
      where: {
        role: 'staff',
        isActive: true,
      },
      select: {
        id: true,
        username: true,
        fullName: true,
      },
      orderBy: { fullName: 'asc' },
    });

    res.json({ staff, count: staff.length });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/users/:id
 * @desc    Get user by ID
 * @access  Private/Admin
 */
router.get(
  '/:id',
  authenticate,
  requireAdmin,
  [param('id').isInt().withMessage('Invalid user ID')],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const userId = parseInt(req.params.id);

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          username: true,
          fullName: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json({ user });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/users
 * @desc    Create new user (admin only)
 * @access  Private/Admin
 */
router.post(
  '/',
  authenticate,
  requireAdmin,
  [
    body('username')
      .trim()
      .isLength({ min: 3, max: 50 })
      .withMessage('Username must be 3-50 characters'),
    body('password')
      .isLength({ min: 10 })
      .withMessage('Password must be at least 10 characters'),
    body('fullName')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Full name must be 2-100 characters'),
    body('role')
      .isIn(['admin', 'staff'])
      .withMessage('Role must be admin or staff'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const { username, password, fullName, role } = req.body;

      // Check if username already exists
      const existingUser = await prisma.user.findUnique({
        where: { username: username.toLowerCase() },
      });

      if (existingUser) {
        return res.status(409).json({ message: 'Username already exists' });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // Create user
      const user = await prisma.user.create({
        data: {
          username: username.toLowerCase(),
          passwordHash,
          fullName,
          role,
          isActive: true,
        },
        select: {
          id: true,
          username: true,
          fullName: true,
          role: true,
          isActive: true,
          createdAt: true,
        },
      });

      // Log activity
      await prisma.activityLog.create({
        data: {
          userId: req.user.id,
          actionType: 'USER_CREATE',
          description: `Created user ${user.username} with role ${role}`,
        },
      });

      res.status(201).json({
        message: 'User created successfully',
        user,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   PUT /api/users/:id
 * @desc    Update user
 * @access  Private/Admin
 */
router.put(
  '/:id',
  authenticate,
  requireAdmin,
  [
    param('id').isInt().withMessage('Invalid user ID'),
    body('fullName')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Full name must be 2-100 characters'),
    body('role')
      .optional()
      .isIn(['admin', 'staff'])
      .withMessage('Role must be admin or staff'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const userId = parseInt(req.params.id);
      const { fullName, role } = req.body;

      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!existingUser) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Prevent changing own role (admin cannot demote themselves)
      if (userId === req.user.id && role && role !== existingUser.role) {
        return res.status(400).json({
          message: 'Cannot change your own role',
        });
      }

      // Update user
      const updateData = {};
      if (fullName) updateData.fullName = fullName;
      if (role) updateData.role = role;

      const user = await prisma.user.update({
        where: { id: userId },
        data: updateData,
        select: {
          id: true,
          username: true,
          fullName: true,
          role: true,
          isActive: true,
          updatedAt: true,
        },
      });

      // Log activity
      await prisma.activityLog.create({
        data: {
          userId: req.user.id,
          actionType: 'USER_UPDATE',
          description: `Updated user ${user.username}`,
        },
      });

      res.json({
        message: 'User updated successfully',
        user,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   PATCH /api/users/:id/status
 * @desc    Activate/Deactivate user
 * @access  Private/Admin
 */
router.patch(
  '/:id/status',
  authenticate,
  requireAdmin,
  [
    param('id').isInt().withMessage('Invalid user ID'),
    body('isActive').isBoolean().withMessage('isActive must be boolean'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const userId = parseInt(req.params.id);
      const { isActive } = req.body;

      // Prevent deactivating self
      if (userId === req.user.id && !isActive) {
        return res.status(400).json({
          message: 'Cannot deactivate your own account',
        });
      }

      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!existingUser) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Update status
      const user = await prisma.user.update({
        where: { id: userId },
        data: { isActive },
        select: {
          id: true,
          username: true,
          fullName: true,
          role: true,
          isActive: true,
        },
      });

      // Log activity
      const action = isActive ? 'activated' : 'deactivated';
      await prisma.activityLog.create({
        data: {
          userId: req.user.id,
          actionType: 'USER_STATUS_CHANGE',
          description: `${action} user ${user.username}`,
        },
      });

      res.json({
        message: `User ${action} successfully`,
        user,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/users/:id/reset-password
 * @desc    Reset user password (admin only)
 * @access  Private/Admin
 */
router.post(
  '/:id/reset-password',
  authenticate,
  requireAdmin,
  [
    param('id').isInt().withMessage('Invalid user ID'),
    body('newPassword')
      .isLength({ min: 10 })
      .withMessage('New password must be at least 10 characters'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const userId = parseInt(req.params.id);
      const { newPassword } = req.body;

      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!existingUser) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Hash new password
      const passwordHash = await bcrypt.hash(newPassword, 10);

      // Update password
      await prisma.user.update({
        where: { id: userId },
        data: { passwordHash },
      });

      // Log activity
      await prisma.activityLog.create({
        data: {
          userId: req.user.id,
          actionType: 'PASSWORD_RESET',
          description: `Reset password for user ${existingUser.username}`,
        },
      });

      res.json({
        message: 'Password reset successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   DELETE /api/users/:id
 * @desc    Delete user (admin only)
 * @access  Private/Admin
 */
router.delete(
  '/:id',
  authenticate,
  requireAdmin,
  [param('id').isInt().withMessage('Invalid user ID')],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const userId = parseInt(req.params.id);

      // Prevent deleting self
      if (userId === req.user.id) {
        return res.status(400).json({
          message: 'Cannot delete your own account',
        });
      }

      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!existingUser) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Delete user
      await prisma.user.delete({
        where: { id: userId },
      });

      // Log activity
      await prisma.activityLog.create({
        data: {
          userId: req.user.id,
          actionType: 'USER_DELETE',
          description: `Deleted user ${existingUser.username}`,
        },
      });

      res.json({ message: 'User deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
