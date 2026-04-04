const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { body, param, query, validationResult } = require('express-validator');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

/**
 * @route   GET /api/records
 * @desc    Get meter records with filters
 * @access  Private
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const {
      listId,
      locationId,
      status,
      assignedTo,
      meterId,
      customer,
      page = 1,
      limit = 50,
    } = req.query;

    const isAdmin = req.user.role === 'admin';
    const userId = req.user.id;

    // Build filter conditions
    const where = {};

    // Staff can only see their assigned records
    if (!isAdmin) {
      where.assignedToUserId = userId;
      
      // Staff should not see records from hidden lists
      where.readingList = {
        hiddenFromStaff: false,
      };
    }

    if (listId) {
      where.readingListId = parseInt(listId);
    }

    if (locationId) {
      where.locationId = locationId;
    }

    if (status && ['pending', 'in_progress', 'completed'].includes(status)) {
      where.status = status;
    }

    if (assignedTo && isAdmin) {
      where.assignedToUserId = parseInt(assignedTo);
    }

    if (meterId) {
      where.meterId = { contains: meterId, mode: 'insensitive' };
    }

    if (customer) {
      where.customer = { contains: customer, mode: 'insensitive' };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const [records, total] = await Promise.all([
      prisma.meterRecord.findMany({
        where,
        include: {
          readingList: {
            select: {
              id: true,
              listName: true,
            },
          },
          assignedTo: {
            select: {
              id: true,
              username: true,
              fullName: true,
            },
          },
          completedBy: {
            select: {
              id: true,
              username: true,
              fullName: true,
            },
          },
        },
        skip,
        take,
        orderBy: [
          { readingListId: 'desc' },
          { locationId: 'asc' },
          { meterId: 'asc' },
        ],
      }),
      prisma.meterRecord.count({ where }),
    ]);

    res.json({
      records,
      pagination: {
        page: parseInt(page),
        limit: take,
        total,
        totalPages: Math.ceil(total / take),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/records/:id
 * @desc    Get single meter record by ID
 * @access  Private
 */
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const recordId = parseInt(req.params.id);
    const isAdmin = req.user.role === 'admin';
    const userId = req.user.id;

    const record = await prisma.meterRecord.findUnique({
      where: { id: recordId },
      include: {
        readingList: {
          select: {
            id: true,
            listName: true,
            status: true,
            hiddenFromStaff: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            username: true,
            fullName: true,
          },
        },
        completedBy: {
          select: {
            id: true,
            username: true,
            fullName: true,
          },
        },
      },
    });

    if (!record) {
      return res.status(404).json({ message: 'Record not found' });
    }

    // Check permissions
    if (!isAdmin) {
      // Staff can only see their assigned records
      if (record.assignedToUserId !== userId) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      // Staff cannot see records from hidden lists
      if (record.readingList.hiddenFromStaff) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    res.json({ record });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/records/pending/me
 * @desc    Get pending records assigned to current user
 * @access  Private/Staff
 */
router.get('/pending/me', authenticate, async (req, res, next) => {
  try {
    const { listId, locationId, page = 1, limit = 20 } = req.query;
    const userId = req.user.id;

    const where = {
      assignedToUserId: userId,
      status: { in: ['pending', 'in_progress'] },
      readingList: {
        hiddenFromStaff: false,
      },
    };

    if (listId) {
      where.readingListId = parseInt(listId);
    }

    if (locationId) {
      where.locationId = locationId;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const [records, total] = await Promise.all([
      prisma.meterRecord.findMany({
        where,
        include: {
          readingList: {
            select: {
              id: true,
              listName: true,
            },
          },
        },
        skip,
        take,
        orderBy: [
          { readingListId: 'desc' },
          { locationId: 'asc' },
          { meterId: 'asc' },
        ],
      }),
      prisma.meterRecord.count({ where }),
    ]);

    res.json({
      records,
      pagination: {
        page: parseInt(page),
        limit: take,
        total,
        totalPages: Math.ceil(total / take),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/records/completed/me
 * @desc    Get completed records by current user
 * @access  Private/Staff
 */
router.get('/completed/me', authenticate, async (req, res, next) => {
  try {
    const { listId, page = 1, limit = 20 } = req.query;
    const userId = req.user.id;

    const where = {
      completedByUserId: userId,
      status: 'completed',
    };

    if (listId) {
      where.readingListId = parseInt(listId);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const [records, total] = await Promise.all([
      prisma.meterRecord.findMany({
        where,
        include: {
          readingList: {
            select: {
              id: true,
              listName: true,
            },
          },
        },
        skip,
        take,
        orderBy: { completedAt: 'desc' },
      }),
      prisma.meterRecord.count({ where }),
    ]);

    res.json({
      records,
      pagination: {
        page: parseInt(page),
        limit: take,
        total,
        totalPages: Math.ceil(total / take),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PATCH /api/records/:id/new-read
 * @desc    Update new reading for a record (staff entry)
 * @access  Private
 */
router.patch(
  '/:id/new-read',
  authenticate,
  [
    param('id').isInt().withMessage('Invalid record ID'),
    body('newRead')
      .notEmpty()
      .withMessage('New reading is required')
      .custom((value) => {
        const num = parseFloat(value);
        if (isNaN(num) || num < 0) {
          throw new Error('New reading must be a valid non-negative number');
        }
        return true;
      }),
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

      const recordId = parseInt(req.params.id);
      const { newRead, notes } = req.body;
      const userId = req.user.id;
      const isAdmin = req.user.role === 'admin';

      // Get the record
      const record = await prisma.meterRecord.findUnique({
        where: { id: recordId },
        include: {
          readingList: {
            select: {
              id: true,
              listName: true,
              hiddenFromStaff: true,
            },
          },
        },
      });

      if (!record) {
        return res.status(404).json({ message: 'Record not found' });
      }

      // Check permissions
      if (!isAdmin) {
        // Staff can only update their assigned records
        if (record.assignedToUserId !== userId) {
          return res.status(403).json({ message: 'Access denied' });
        }
        
        // Staff cannot update records from hidden lists
        if (record.readingList.hiddenFromStaff) {
          return res.status(403).json({ message: 'Access denied' });
        }

        // Staff cannot update already completed records
        if (record.status === 'completed' && record.completedByUserId !== userId) {
          return res.status(400).json({ message: 'Cannot modify record completed by another user' });
        }
      }

      // Validate new reading is not lower than old reading
      const newReadValue = parseFloat(newRead);
      if (record.oldRead !== null && newReadValue < parseFloat(record.oldRead)) {
        return res.status(400).json({
          message: 'New reading cannot be lower than old reading',
          oldRead: record.oldRead,
          newRead: newReadValue,
        });
      }

      // Update the record
      const updatedRecord = await prisma.meterRecord.update({
        where: { id: recordId },
        data: {
          newRead: newReadValue,
          status: 'completed',
          completedByUserId: userId,
          completedAt: new Date(),
          text34: notes || record.text34,
        },
        include: {
          readingList: {
            select: {
              id: true,
              listName: true,
            },
          },
          completedBy: {
            select: {
              id: true,
              username: true,
              fullName: true,
            },
          },
        },
      });

      // Log activity
      await prisma.activityLog.create({
        data: {
          userId,
          actionType: 'RECORD_UPDATE',
          description: `Updated reading for meter ${record.meterId}: ${newReadValue}`,
          relatedListId: record.readingListId,
          relatedRecordId: recordId,
        },
      });

      res.json({
        message: 'Reading updated successfully',
        record: updatedRecord,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   PATCH /api/records/:id/status
 * @desc    Update record status (admin only)
 * @access  Private/Admin
 */
router.patch(
  '/:id/status',
  authenticate,
  requireAdmin,
  [
    param('id').isInt().withMessage('Invalid record ID'),
    body('status')
      .isIn(['pending', 'in_progress', 'completed'])
      .withMessage('Status must be pending, in_progress, or completed'),
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

      const recordId = parseInt(req.params.id);
      const { status } = req.body;

      const record = await prisma.meterRecord.findUnique({
        where: { id: recordId },
      });

      if (!record) {
        return res.status(404).json({ message: 'Record not found' });
      }

      const updateData = { status };

      // If marking as completed, set completed info
      if (status === 'completed') {
        updateData.completedByUserId = req.user.id;
        updateData.completedAt = new Date();
      } else {
        // If un-completing, clear completed info
        updateData.completedByUserId = null;
        updateData.completedAt = null;
      }

      const updatedRecord = await prisma.meterRecord.update({
        where: { id: recordId },
        data: updateData,
        include: {
          readingList: {
            select: {
              id: true,
              listName: true,
            },
          },
          assignedTo: {
            select: {
              id: true,
              username: true,
              fullName: true,
            },
          },
        },
      });

      // Log activity
      await prisma.activityLog.create({
        data: {
          userId: req.user.id,
          actionType: 'RECORD_STATUS_CHANGE',
          description: `Changed status of meter ${record.meterId} to ${status}`,
          relatedListId: record.readingListId,
          relatedRecordId: recordId,
        },
      });

      res.json({
        message: 'Record status updated successfully',
        record: updatedRecord,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/records/locations/:listId
 * @desc    Get all unique location IDs for a list
 * @access  Private/Admin
 */
router.get(
  '/locations/:listId',
  authenticate,
  requireAdmin,
  async (req, res, next) => {
    try {
      const listId = parseInt(req.params.listId);

      // Check if list exists
      const list = await prisma.readingList.findUnique({
        where: { id: listId },
      });

      if (!list) {
        return res.status(404).json({ message: 'Reading list not found' });
      }

      // Get unique location IDs with counts
      const locations = await prisma.meterRecord.groupBy({
        by: ['locationId'],
        where: { readingListId: listId },
        _count: {
          locationId: true,
        },
      });

      // Get assignment info for each location
      const locationsWithAssignments = await Promise.all(
        locations.map(async (loc) => {
          const assignment = await prisma.meterRecord.findFirst({
            where: {
              readingListId: listId,
              locationId: loc.locationId,
              assignedToUserId: { not: null },
            },
            select: {
              assignedTo: {
                select: {
                  id: true,
                  username: true,
                  fullName: true,
                },
              },
            },
          });

          // Get completion stats
          const stats = await prisma.meterRecord.groupBy({
            by: ['status'],
            where: {
              readingListId: listId,
              locationId: loc.locationId,
            },
            _count: {
              status: true,
            },
          });

          const pending = stats.find(s => s.status === 'pending')?._count.status || 0;
          const inProgress = stats.find(s => s.status === 'in_progress')?._count.status || 0;
          const completed = stats.find(s => s.status === 'completed')?._count.status || 0;

          return {
            locationId: loc.locationId,
            totalRecords: loc._count.locationId,
            pending,
            inProgress,
            completed,
            progressPercentage: loc._count.locationId > 0 
              ? Math.round((completed / loc._count.locationId) * 100) 
              : 0,
            assignedTo: assignment?.assignedTo || null,
          };
        })
      );

      res.json({
        locations: locationsWithAssignments.sort((a, b) => 
          a.locationId.localeCompare(b.locationId)
        ),
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
