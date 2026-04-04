const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { body, validationResult } = require('express-validator');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

/**
 * @route   POST /api/assignments/location
 * @desc    Assign a single location ID to a staff member
 * @access  Private/Admin
 */
router.post(
  '/location',
  authenticate,
  requireAdmin,
  [
    body('listId').isInt().withMessage('Valid list ID is required'),
    body('locationId').notEmpty().withMessage('Location ID is required'),
    body('staffId').isInt().withMessage('Valid staff ID is required'),
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

      const { listId, locationId, staffId } = req.body;
      const adminId = req.user.id;

      // Verify list exists
      const list = await prisma.readingList.findUnique({
        where: { id: listId },
      });

      if (!list) {
        return res.status(404).json({ message: 'Reading list not found' });
      }

      // Verify staff exists and is active
      const staff = await prisma.user.findFirst({
        where: {
          id: staffId,
          role: 'staff',
          isActive: true,
        },
      });

      if (!staff) {
        return res.status(404).json({ message: 'Staff member not found or inactive' });
      }

      // Check if location has records in this list
      const locationRecords = await prisma.meterRecord.findMany({
        where: {
          readingListId: listId,
          locationId: String(locationId),
        },
      });

      if (locationRecords.length === 0) {
        return res.status(404).json({ 
          message: 'No records found for this location ID in the specified list' 
        });
      }

      // Update all records for this location in the list
      const updatedRecords = await prisma.meterRecord.updateMany({
        where: {
          readingListId: listId,
          locationId: String(locationId),
        },
        data: {
          assignedToUserId: staffId,
          status: 'in_progress',
        },
      });

      // Create assignment record
      await prisma.assignment.create({
        data: {
          readingListId: listId,
          locationId: String(locationId),
          assignedToUserId: staffId,
          assignedByUserId: adminId,
        },
      });

      // Log activity
      await prisma.activityLog.create({
        data: {
          userId: adminId,
          actionType: 'ASSIGNMENT_CREATE',
          description: `Assigned location ${locationId} (${updatedRecords.count} records) to ${staff.fullName}`,
          relatedListId: listId,
        },
      });

      res.json({
        message: 'Location assigned successfully',
        assignment: {
          listId,
          locationId: String(locationId),
          staffId,
          staffName: staff.fullName,
          recordsAssigned: updatedRecords.count,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/assignments/bulk-location
 * @desc    Assign multiple location IDs to a staff member
 * @access  Private/Admin
 */
router.post(
  '/bulk-location',
  authenticate,
  requireAdmin,
  [
    body('listId').isInt().withMessage('Valid list ID is required'),
    body('locationIds').isArray({ min: 1 }).withMessage('At least one location ID is required'),
    body('staffId').isInt().withMessage('Valid staff ID is required'),
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

      const { listId, locationIds, staffId } = req.body;
      const adminId = req.user.id;

      // Verify list exists
      const list = await prisma.readingList.findUnique({
        where: { id: listId },
      });

      if (!list) {
        return res.status(404).json({ message: 'Reading list not found' });
      }

      // Verify staff exists and is active
      const staff = await prisma.user.findFirst({
        where: {
          id: staffId,
          role: 'staff',
          isActive: true,
        },
      });

      if (!staff) {
        return res.status(404).json({ message: 'Staff member not found or inactive' });
      }

      // Convert locationIds to strings
      const locationIdsStr = locationIds.map(id => String(id));

      // Update all records for these locations in the list
      const updatedRecords = await prisma.meterRecord.updateMany({
        where: {
          readingListId: listId,
          locationId: { in: locationIdsStr },
        },
        data: {
          assignedToUserId: staffId,
          status: 'in_progress',
        },
      });

      // Create assignment records for each location
      const assignmentData = locationIdsStr.map(locId => ({
        readingListId: listId,
        locationId: locId,
        assignedToUserId: staffId,
        assignedByUserId: adminId,
      }));

      await prisma.assignment.createMany({
        data: assignmentData,
      });

      // Log activity
      await prisma.activityLog.create({
        data: {
          userId: adminId,
          actionType: 'ASSIGNMENT_BULK',
          description: `Assigned ${locationIds.length} locations (${updatedRecords.count} records) to ${staff.fullName}`,
          relatedListId: listId,
        },
      });

      res.json({
        message: 'Locations assigned successfully',
        assignment: {
          listId,
          locationCount: locationIds.length,
          staffId,
          staffName: staff.fullName,
          recordsAssigned: updatedRecords.count,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/assignments/assign-all-to-staff
 * @desc    Assign all locations in a list to one staff member
 * @access  Private/Admin
 */
router.post(
  '/assign-all-to-staff',
  authenticate,
  requireAdmin,
  [
    body('listId').isInt().withMessage('Valid list ID is required'),
    body('staffId').isInt().withMessage('Valid staff ID is required'),
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

      const { listId, staffId } = req.body;
      const adminId = req.user.id;

      // Verify list exists
      const list = await prisma.readingList.findUnique({
        where: { id: listId },
      });

      if (!list) {
        return res.status(404).json({ message: 'Reading list not found' });
      }

      // Verify staff exists and is active
      const staff = await prisma.user.findFirst({
        where: {
          id: staffId,
          role: 'staff',
          isActive: true,
        },
      });

      if (!staff) {
        return res.status(404).json({ message: 'Staff member not found or inactive' });
      }

      // Get all unique location IDs in this list
      const locations = await prisma.meterRecord.findMany({
        where: { readingListId: listId },
        select: { locationId: true },
        distinct: ['locationId'],
      });

      if (locations.length === 0) {
        return res.status(404).json({ message: 'No locations found in this list' });
      }

      const locationIds = locations.map(l => l.locationId);

      // Update all records in the list
      const updatedRecords = await prisma.meterRecord.updateMany({
        where: { readingListId: listId },
        data: {
          assignedToUserId: staffId,
          status: 'in_progress',
        },
      });

      // Create assignment records for each location
      const assignmentData = locationIds.map(locId => ({
        readingListId: listId,
        locationId: locId,
        assignedToUserId: staffId,
        assignedByUserId: adminId,
      }));

      await prisma.assignment.createMany({
        data: assignmentData,
      });

      // Log activity
      await prisma.activityLog.create({
        data: {
          userId: adminId,
          actionType: 'ASSIGNMENT_ALL',
          description: `Assigned all ${locations.length} locations (${updatedRecords.count} records) to ${staff.fullName}`,
          relatedListId: listId,
        },
      });

      res.json({
        message: 'All locations assigned successfully',
        assignment: {
          listId,
          locationCount: locations.length,
          staffId,
          staffName: staff.fullName,
          recordsAssigned: updatedRecords.count,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/assignments/reassign
 * @desc    Reassign locations from one staff to another
 * @access  Private/Admin
 */
router.post(
  '/reassign',
  authenticate,
  requireAdmin,
  [
    body('listId').isInt().withMessage('Valid list ID is required'),
    body('fromStaffId').isInt().withMessage('Valid source staff ID is required'),
    body('toStaffId').isInt().withMessage('Valid target staff ID is required'),
    body('locationIds').optional().isArray().withMessage('Location IDs must be an array'),
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

      const { listId, fromStaffId, toStaffId, locationIds } = req.body;
      const adminId = req.user.id;

      // Verify list exists
      const list = await prisma.readingList.findUnique({
        where: { id: listId },
      });

      if (!list) {
        return res.status(404).json({ message: 'Reading list not found' });
      }

      // Verify both staff members exist and are active
      const [fromStaff, toStaff] = await Promise.all([
        prisma.user.findFirst({
          where: { id: fromStaffId, role: 'staff', isActive: true },
        }),
        prisma.user.findFirst({
          where: { id: toStaffId, role: 'staff', isActive: true },
        }),
      ]);

      if (!fromStaff) {
        return res.status(404).json({ message: 'Source staff member not found or inactive' });
      }

      if (!toStaff) {
        return res.status(404).json({ message: 'Target staff member not found or inactive' });
      }

      // Build where clause
      const whereClause = {
        readingListId: listId,
        assignedToUserId: fromStaffId,
      };

      if (locationIds && locationIds.length > 0) {
        whereClause.locationId = { in: locationIds.map(id => String(id)) };
      }

      // Update records
      const updatedRecords = await prisma.meterRecord.updateMany({
        where: whereClause,
        data: {
          assignedToUserId: toStaffId,
        },
      });

      if (updatedRecords.count === 0) {
        return res.status(404).json({ message: 'No records found to reassign' });
      }

      // Update assignment records
      await prisma.assignment.updateMany({
        where: {
          readingListId: listId,
          assignedToUserId: fromStaffId,
          ...(locationIds && locationIds.length > 0 && {
            locationId: { in: locationIds.map(id => String(id)) },
          }),
        },
        data: {
          assignedToUserId: toStaffId,
          assignedByUserId: adminId,
          assignedAt: new Date(),
        },
      });

      // Log activity
      await prisma.activityLog.create({
        data: {
          userId: adminId,
          actionType: 'ASSIGNMENT_REASSIGN',
          description: `Reassigned ${updatedRecords.count} records from ${fromStaff.fullName} to ${toStaff.fullName}`,
          relatedListId: listId,
        },
      });

      res.json({
        message: 'Records reassigned successfully',
        reassignment: {
          listId,
          fromStaffId,
          fromStaffName: fromStaff.fullName,
          toStaffId,
          toStaffName: toStaff.fullName,
          recordsReassigned: updatedRecords.count,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/assignments/by-staff/:staffId
 * @desc    Get all assignments for a staff member
 * @access  Private/Admin
 */
router.get(
  '/by-staff/:staffId',
  authenticate,
  requireAdmin,
  async (req, res, next) => {
    try {
      const staffId = parseInt(req.params.staffId);

      const assignments = await prisma.assignment.findMany({
        where: { assignedToUserId: staffId },
        include: {
          readingList: {
            select: {
              id: true,
              listName: true,
              status: true,
            },
          },
          assignedBy: {
            select: {
              id: true,
              username: true,
              fullName: true,
            },
          },
        },
        orderBy: { assignedAt: 'desc' },
      });

      res.json({ assignments, count: assignments.length });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/assignments/by-list/:listId
 * @desc    Get all assignments for a reading list
 * @access  Private/Admin
 */
router.get(
  '/by-list/:listId',
  authenticate,
  requireAdmin,
  async (req, res, next) => {
    try {
      const listId = parseInt(req.params.listId);

      const assignments = await prisma.assignment.findMany({
        where: { readingListId: listId },
        include: {
          assignedTo: {
            select: {
              id: true,
              username: true,
              fullName: true,
            },
          },
          assignedBy: {
            select: {
              id: true,
              username: true,
              fullName: true,
            },
          },
        },
        orderBy: { assignedAt: 'desc' },
      });

      res.json({ assignments, count: assignments.length });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   DELETE /api/assignments/location
 * @desc    Remove assignment from a location
 * @access  Private/Admin
 */
router.delete(
  '/location',
  authenticate,
  requireAdmin,
  [
    body('listId').isInt().withMessage('Valid list ID is required'),
    body('locationId').notEmpty().withMessage('Location ID is required'),
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

      const { listId, locationId } = req.body;

      // Remove assignment from records
      const updatedRecords = await prisma.meterRecord.updateMany({
        where: {
          readingListId: listId,
          locationId: String(locationId),
        },
        data: {
          assignedToUserId: null,
          status: 'pending',
        },
      });

      // Delete assignment record
      await prisma.assignment.deleteMany({
        where: {
          readingListId: listId,
          locationId: String(locationId),
        },
      });

      // Log activity
      await prisma.activityLog.create({
        data: {
          userId: req.user.id,
          actionType: 'ASSIGNMENT_REMOVE',
          description: `Removed assignment from location ${locationId} (${updatedRecords.count} records)`,
          relatedListId: listId,
        },
      });

      res.json({
        message: 'Assignment removed successfully',
        recordsUpdated: updatedRecords.count,
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
