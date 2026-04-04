const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

/**
 * @route   GET /api/reports/dashboard
 * @desc    Get dashboard statistics
 * @access  Private/Admin
 */
router.get('/dashboard', authenticate, requireAdmin, async (req, res, next) => {
  try {
    // Get total staff count
    const totalStaff = await prisma.user.count({
      where: { role: 'staff' },
    });

    const activeStaff = await prisma.user.count({
      where: { role: 'staff', isActive: true },
    });

    // Get list statistics
    const totalLists = await prisma.readingList.count();
    
    const activeLists = await prisma.readingList.count({
      where: { status: 'active' },
    });

    const completedLists = await prisma.readingList.count({
      where: { status: 'completed' },
    });

    const hiddenLists = await prisma.readingList.count({
      where: { status: 'hidden' },
    });

    const archivedLists = await prisma.readingList.count({
      where: { status: 'archived' },
    });

    // Get record statistics
    const totalRecords = await prisma.meterRecord.count();

    const pendingRecords = await prisma.meterRecord.count({
      where: { status: 'pending' },
    });

    const inProgressRecords = await prisma.meterRecord.count({
      where: { status: 'in_progress' },
    });

    const completedRecords = await prisma.meterRecord.count({
      where: { status: 'completed' },
    });

    // Get recent activity
    const recentActivity = await prisma.activityLog.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            fullName: true,
          },
        },
      },
    });

    // Calculate overall progress
    const overallProgress = totalRecords > 0 
      ? Math.round((completedRecords / totalRecords) * 100) 
      : 0;

    res.json({
      stats: {
        staff: {
          total: totalStaff,
          active: activeStaff,
        },
        lists: {
          total: totalLists,
          active: activeLists,
          completed: completedLists,
          hidden: hiddenLists,
          archived: archivedLists,
        },
        records: {
          total: totalRecords,
          pending: pendingRecords,
          inProgress: inProgressRecords,
          completed: completedRecords,
          overallProgress,
        },
      },
      recentActivity,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/reports/list-progress
 * @desc    Get progress for all lists
 * @access  Private/Admin
 */
router.get('/list-progress', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const lists = await prisma.readingList.findMany({
      include: {
        _count: {
          select: { records: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const listsWithProgress = await Promise.all(
      lists.map(async (list) => {
        const stats = await prisma.meterRecord.groupBy({
          by: ['status'],
          where: { readingListId: list.id },
          _count: { status: true },
        });

        const pending = stats.find(s => s.status === 'pending')?._count.status || 0;
        const inProgress = stats.find(s => s.status === 'in_progress')?._count.status || 0;
        const completed = stats.find(s => s.status === 'completed')?._count.status || 0;
        const total = list._count.records;

        // Get unique location count
        const locationCount = await prisma.meterRecord.groupBy({
          by: ['locationId'],
          where: { readingListId: list.id },
        });

        // Get assigned staff
        const assignedStaff = await prisma.meterRecord.findMany({
          where: {
            readingListId: list.id,
            assignedToUserId: { not: null },
          },
          select: {
            assignedTo: {
              select: {
                id: true,
                fullName: true,
              },
            },
          },
          distinct: ['assignedToUserId'],
        });

        return {
          id: list.id,
          listName: list.listName,
          status: list.status,
          createdAt: list.createdAt,
          stats: {
            total,
            pending,
            inProgress,
            completed,
            progressPercentage: total > 0 ? Math.round((completed / total) * 100) : 0,
          },
          locationCount: locationCount.length,
          assignedStaff: assignedStaff.map(s => s.assignedTo),
        };
      })
    );

    res.json({ lists: listsWithProgress });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/reports/staff-progress
 * @desc    Get progress for all staff members
 * @access  Private/Admin
 */
router.get('/staff-progress', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const staffMembers = await prisma.user.findMany({
      where: { role: 'staff', isActive: true },
      select: {
        id: true,
        username: true,
        fullName: true,
      },
      orderBy: { fullName: 'asc' },
    });

    const staffWithProgress = await Promise.all(
      staffMembers.map(async (staff) => {
        // Get assigned records count
        const assignedStats = await prisma.meterRecord.groupBy({
          by: ['status'],
          where: { assignedToUserId: staff.id },
          _count: { status: true },
        });

        const totalAssigned = assignedStats.reduce((sum, s) => sum + s._count.status, 0);
        const pending = assignedStats.find(s => s.status === 'pending')?._count.status || 0;
        const inProgress = assignedStats.find(s => s.status === 'in_progress')?._count.status || 0;
        const assignedCompleted = assignedStats.find(s => s.status === 'completed')?._count.status || 0;

        // Get completed by this staff (including self-completed)
        const completedByStaff = await prisma.meterRecord.count({
          where: { completedByUserId: staff.id },
        });

        // Get unique lists assigned
        const assignedLists = await prisma.meterRecord.findMany({
          where: { assignedToUserId: staff.id },
          select: { readingListId: true },
          distinct: ['readingListId'],
        });

        // Get unique locations assigned
        const assignedLocations = await prisma.meterRecord.findMany({
          where: { assignedToUserId: staff.id },
          select: { locationId: true },
          distinct: ['locationId'],
        });

        // Get recent completions
        const recentCompletions = await prisma.meterRecord.findMany({
          where: { completedByUserId: staff.id },
          orderBy: { completedAt: 'desc' },
          take: 5,
          select: {
            id: true,
            meterId: true,
            customer: true,
            completedAt: true,
            readingList: {
              select: { listName: true },
            },
          },
        });

        return {
          ...staff,
          stats: {
            totalAssigned,
            pending,
            inProgress,
            completed: assignedCompleted,
            progressPercentage: totalAssigned > 0 
              ? Math.round((assignedCompleted / totalAssigned) * 100) 
              : 0,
          },
          completedByStaff,
          listCount: assignedLists.length,
          locationCount: assignedLocations.length,
          recentCompletions,
        };
      })
    );

    res.json({ staff: staffWithProgress });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/reports/location-progress/:listId
 * @desc    Get progress by location ID for a specific list
 * @access  Private/Admin
 */
router.get('/location-progress/:listId', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const listId = parseInt(req.params.listId);

    // Verify list exists
    const list = await prisma.readingList.findUnique({
      where: { id: listId },
    });

    if (!list) {
      return res.status(404).json({ message: 'Reading list not found' });
    }

    // Get all locations with their progress
    const locations = await prisma.meterRecord.groupBy({
      by: ['locationId'],
      where: { readingListId: listId },
      _count: { locationId: true },
    });

    const locationsWithProgress = await Promise.all(
      locations.map(async (loc) => {
        const stats = await prisma.meterRecord.groupBy({
          by: ['status'],
          where: {
            readingListId: listId,
            locationId: loc.locationId,
          },
          _count: { status: true },
        });

        const pending = stats.find(s => s.status === 'pending')?._count.status || 0;
        const inProgress = stats.find(s => s.status === 'in_progress')?._count.status || 0;
        const completed = stats.find(s => s.status === 'completed')?._count.status || 0;
        const total = loc._count.locationId;

        // Get assigned staff for this location
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
                fullName: true,
              },
            },
          },
        });

        return {
          locationId: loc.locationId,
          total,
          pending,
          inProgress,
          completed,
          progressPercentage: total > 0 ? Math.round((completed / total) * 100) : 0,
          assignedTo: assignment?.assignedTo || null,
        };
      })
    );

    res.json({
      listId,
      listName: list.listName,
      locations: locationsWithProgress.sort((a, b) => 
        a.locationId.localeCompare(b.locationId)
      ),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/reports/activity-logs
 * @desc    Get activity logs with pagination
 * @access  Private/Admin
 */
router.get('/activity-logs', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { page = 1, limit = 50, userId, actionType } = req.query;

    const where = {};

    if (userId) {
      where.userId = parseInt(userId);
    }

    if (actionType) {
      where.actionType = actionType;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              fullName: true,
            },
          },
        },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.activityLog.count({ where }),
    ]);

    res.json({
      logs,
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
 * @route   GET /api/reports/my-stats
 * @desc    Get current user's statistics (for staff)
 * @access  Private
 */
router.get('/my-stats', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Get assigned records stats
    const assignedStats = await prisma.meterRecord.groupBy({
      by: ['status'],
      where: { 
        assignedToUserId: userId,
        readingList: { hiddenFromStaff: false },
      },
      _count: { status: true },
    });

    const totalAssigned = assignedStats.reduce((sum, s) => sum + s._count.status, 0);
    const pending = assignedStats.find(s => s.status === 'pending')?._count.status || 0;
    const inProgress = assignedStats.find(s => s.status === 'in_progress')?._count.status || 0;
    const completed = assignedStats.find(s => s.status === 'completed')?._count.status || 0;

    // Get assigned lists
    const assignedLists = await prisma.meterRecord.findMany({
      where: { 
        assignedToUserId: userId,
        readingList: { hiddenFromStaff: false },
      },
      select: {
        readingList: {
          select: {
            id: true,
            listName: true,
            status: true,
          },
        },
      },
      distinct: ['readingListId'],
    });

    // Get recent completions
    const recentCompletions = await prisma.meterRecord.findMany({
      where: { completedByUserId: userId },
      orderBy: { completedAt: 'desc' },
      take: 10,
      select: {
        id: true,
        meterId: true,
        customer: true,
        newRead: true,
        completedAt: true,
        readingList: {
          select: { listName: true },
        },
      },
    });

    res.json({
      stats: {
        totalAssigned,
        pending,
        inProgress,
        completed,
        progressPercentage: totalAssigned > 0 
          ? Math.round((completed / totalAssigned) * 100) 
          : 0,
      },
      assignedLists: assignedLists.map(l => l.readingList),
      recentCompletions,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
