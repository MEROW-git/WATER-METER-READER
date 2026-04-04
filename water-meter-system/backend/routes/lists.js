const express = require('express');
const multer = require('multer');
const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const { body, param, validationResult } = require('express-validator');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', process.env.UPLOAD_DIR || 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `excel-${uniqueSuffix}-${sanitizedName}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'application/octet-stream',
  ];
  
  if (allowedTypes.includes(file.mimetype) || file.originalname.match(/\.(xlsx|xls)$/i)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only Excel files (.xlsx, .xls) are allowed.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB
  },
});

const normalizeHeader = (value) =>
  String(value ?? '')
    .trim()
    .replace(/^\ufeff/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

const findHeaderRowIndex = (rows) =>
  rows.findIndex((row) => {
    if (!Array.isArray(row) || row.length === 0) {
      return false;
    }

    const normalizedRow = row.map(normalizeHeader).filter(Boolean);
    return (
      normalizedRow.includes('meterid') &&
      normalizedRow.includes('customer') &&
      normalizedRow.includes('locationid')
    );
  });

const excelSerialToDate = (serial) => {
  const parsed = xlsx.SSF.parse_date_code(serial);
  if (!parsed) {
    return null;
  }

  return new Date(
    parsed.y,
    parsed.m - 1,
    parsed.d,
    parsed.H || 0,
    parsed.M || 0,
    parsed.S || 0
  );
};

/**
 * @route   GET /api/lists
 * @desc    Get all reading lists
 * @access  Private
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { status, search, includeHidden } = req.query;
    const isAdmin = req.user.role === 'admin';

    // Build filter conditions
    const where = {};
    
    // Staff should not see hidden lists unless explicitly requested by admin
    if (!isAdmin || includeHidden !== 'true') {
      where.hiddenFromStaff = false;
    }

    if (status && ['draft', 'active', 'completed', 'hidden', 'archived'].includes(status)) {
      where.status = status;
    }

    if (search) {
      where.listName = { contains: search, mode: 'insensitive' };
    }

    const lists = await prisma.readingList.findMany({
      where,
      include: {
        uploader: {
          select: {
            id: true,
            username: true,
            fullName: true,
          },
        },
        _count: {
          select: {
            records: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get progress stats for each list
    const listsWithStats = await Promise.all(
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

        return {
          ...list,
          stats: {
            total,
            pending,
            inProgress,
            completed,
            progressPercentage: total > 0 ? Math.round((completed / total) * 100) : 0,
          },
        };
      })
    );

    res.json({ lists: listsWithStats, count: listsWithStats.length });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/lists/:id
 * @desc    Get reading list by ID with records
 * @access  Private
 */
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const listId = parseInt(req.params.id);
    const isAdmin = req.user.role === 'admin';

    const list = await prisma.readingList.findUnique({
      where: { id: listId },
      include: {
        uploader: {
          select: {
            id: true,
            username: true,
            fullName: true,
          },
        },
        _count: {
          select: {
            records: true,
          },
        },
      },
    });

    if (!list) {
      return res.status(404).json({ message: 'Reading list not found' });
    }

    // Staff cannot see hidden lists
    if (!isAdmin && list.hiddenFromStaff) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Get location IDs for this list
    const locationIds = await prisma.meterRecord.findMany({
      where: { readingListId: listId },
      select: { locationId: true },
      distinct: ['locationId'],
    });

    // Get stats
    const stats = await prisma.meterRecord.groupBy({
      by: ['status'],
      where: { readingListId: listId },
      _count: { status: true },
    });

    const pending = stats.find(s => s.status === 'pending')?._count.status || 0;
    const inProgress = stats.find(s => s.status === 'in_progress')?._count.status || 0;
    const completed = stats.find(s => s.status === 'completed')?._count.status || 0;
    const total = list._count.records;

    res.json({
      list: {
        ...list,
        locationIds: locationIds.map(l => l.locationId),
        stats: {
          total,
          pending,
          inProgress,
          completed,
          progressPercentage: total > 0 ? Math.round((completed / total) * 100) : 0,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/lists/upload
 * @desc    Upload Excel file and create reading list
 * @access  Private/Admin
 */
router.post(
  '/upload',
  authenticate,
  requireAdmin,
  upload.single('file'),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      const { listName, sheetDate } = req.body;
      const filePath = req.file.path;

      if (!sheetDate) {
        fs.unlinkSync(filePath);
        return res.status(400).json({ message: 'Sheet date is required' });
      }

      const parsedSheetDate = new Date(sheetDate);
      if (Number.isNaN(parsedSheetDate.getTime())) {
        fs.unlinkSync(filePath);
        return res.status(400).json({ message: 'Sheet date is invalid' });
      }

      // Parse Excel file
      const workbook = xlsx.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rawData = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

      if (rawData.length < 2) {
        fs.unlinkSync(filePath);
        return res.status(400).json({ message: 'Excel file is empty or has no data rows' });
      }

      const headerRowIndex = findHeaderRowIndex(rawData);

      if (headerRowIndex === -1) {
        fs.unlinkSync(filePath);
        return res.status(400).json({
          message: 'Could not find a header row with the required columns',
        });
      }

      // Map column headers from the detected header row
      const headers = rawData[headerRowIndex].map(normalizeHeader);
      const columnMap = {
        nameId: headers.findIndex(h => h === 'nameid'),
        meterId: headers.findIndex(h => h === 'meterid'),
        customer: headers.findIndex(h => h === 'customer'),
        locationId: headers.findIndex(h => h === 'locationid'),
        st: headers.findIndex(h => h === 'st' || h === 'street'),
        village: headers.findIndex(h => h === 'village'),
        date: headers.findIndex(h => h === 'date'),
        oldRead: headers.findIndex(h => h === 'oldread'),
        newRead: headers.findIndex(h => h === 'newread'),
        text34: headers.findIndex(h => h === 'text34'),
      };

      // Validate required columns
      const requiredColumns = ['meterId', 'customer', 'locationId'];
      const missingColumns = requiredColumns.filter(col => columnMap[col] === -1);

      if (missingColumns.length > 0) {
        fs.unlinkSync(filePath);
        return res.status(400).json({
          message: `Missing required columns: ${missingColumns.join(', ')}`,
          foundHeaders: rawData[headerRowIndex],
        });
      }

      // Parse data rows
      const records = [];
      const duplicateMeterIds = new Set();
      const seenMeterIds = new Set();
      let skippedRows = 0;

      for (let i = headerRowIndex + 1; i < rawData.length; i++) {
        const row = rawData[i];
        
        // Skip empty rows
        if (!row || row.length === 0 || !row[columnMap.meterId]) {
          skippedRows++;
          continue;
        }

        const meterId = String(row[columnMap.meterId]).trim();
        
        // Check for duplicate meter IDs
        if (seenMeterIds.has(meterId)) {
          duplicateMeterIds.add(meterId);
          continue;
        }
        seenMeterIds.add(meterId);

        // Parse date if present
        let readingDate = null;
        if (columnMap.date !== -1 && row[columnMap.date]) {
          const dateValue = row[columnMap.date];
          if (dateValue instanceof Date) {
            readingDate = dateValue;
          } else if (typeof dateValue === 'number') {
            readingDate = excelSerialToDate(dateValue);
          } else {
            const parsedDate = new Date(dateValue);
            readingDate = Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
          }
        }

        // Parse old_read and new_read
        const oldRead = columnMap.oldRead !== -1 && row[columnMap.oldRead] 
          ? parseFloat(row[columnMap.oldRead]) 
          : null;
        
        const newRead = columnMap.newRead !== -1 && row[columnMap.newRead] 
          ? parseFloat(row[columnMap.newRead]) 
          : null;

        records.push({
          nameId: columnMap.nameId !== -1 && row[columnMap.nameId] 
            ? String(row[columnMap.nameId]).trim() 
            : null,
          meterId,
          customer: columnMap.customer !== -1 && row[columnMap.customer] 
            ? String(row[columnMap.customer]).trim() 
            : '',
          locationId: columnMap.locationId !== -1 && row[columnMap.locationId] 
            ? String(row[columnMap.locationId]).trim() 
            : '',
          st: columnMap.st !== -1 && row[columnMap.st] 
            ? String(row[columnMap.st]).trim() 
            : null,
          village: columnMap.village !== -1 && row[columnMap.village] 
            ? String(row[columnMap.village]).trim() 
            : null,
          readingDate,
          oldRead,
          newRead,
          text34: columnMap.text34 !== -1 && row[columnMap.text34] 
            ? String(row[columnMap.text34]).trim()
            : null,
          status: newRead ? 'completed' : 'pending',
        });
      }

      if (records.length === 0) {
        fs.unlinkSync(filePath);
        return res.status(400).json({ message: 'No valid records found in Excel file' });
      }

      // Create reading list and records in transaction
      const result = await prisma.$transaction(async (tx) => {
        // Create reading list
        const readingList = await tx.readingList.create({
          data: {
            listName: listName || req.file.originalname.replace(/\.[^/.]+$/, ''),
            sheetDate: parsedSheetDate,
            uploadedFileName: req.file.originalname,
            status: 'active',
            uploadedBy: req.user.id,
            hiddenFromStaff: false,
          },
        });

        // Create meter records
        await tx.meterRecord.createMany({
          data: records.map(record => ({
            ...record,
            readingListId: readingList.id,
          })),
        });

        return readingList;
      });

      // Log activity
      await prisma.activityLog.create({
        data: {
          userId: req.user.id,
          actionType: 'LIST_UPLOAD',
          description: `Uploaded reading list "${result.listName}" with ${records.length} records`,
          relatedListId: result.id,
        },
      });

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      res.status(201).json({
        message: 'Reading list uploaded successfully',
        list: result,
        summary: {
          totalRows: rawData.length - 1,
          successfulRows: records.length,
          skippedRows,
          duplicateMeterIds: Array.from(duplicateMeterIds),
          duplicateCount: duplicateMeterIds.size,
        },
      });
    } catch (error) {
      // Clean up uploaded file on error
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      next(error);
    }
  }
);

/**
 * @route   PATCH /api/lists/:id/hide
 * @desc    Hide reading list from staff
 * @access  Private/Admin
 */
router.patch(
  '/:id/hide',
  authenticate,
  requireAdmin,
  [param('id').isInt().withMessage('Invalid list ID')],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const listId = parseInt(req.params.id);
      const { hidden } = req.body;

      const list = await prisma.readingList.update({
        where: { id: listId },
        data: {
          hiddenFromStaff: hidden !== false,
          status: hidden !== false ? 'hidden' : 'active',
        },
      });

      // Log activity
      await prisma.activityLog.create({
        data: {
          userId: req.user.id,
          actionType: 'LIST_HIDE',
          description: `${hidden !== false ? 'Hidden' : 'Unhidden'} reading list "${list.listName}"`,
          relatedListId: list.id,
        },
      });

      res.json({
        message: `List ${hidden !== false ? 'hidden' : 'unhidden'} successfully`,
        list,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   PATCH /api/lists/:id/archive
 * @desc    Archive reading list
 * @access  Private/Admin
 */
router.patch(
  '/:id/archive',
  authenticate,
  requireAdmin,
  [param('id').isInt().withMessage('Invalid list ID')],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const listId = parseInt(req.params.id);

      const list = await prisma.readingList.update({
        where: { id: listId },
        data: { status: 'archived' },
      });

      // Log activity
      await prisma.activityLog.create({
        data: {
          userId: req.user.id,
          actionType: 'LIST_ARCHIVE',
          description: `Archived reading list "${list.listName}"`,
          relatedListId: list.id,
        },
      });

      res.json({
        message: 'List archived successfully',
        list,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   PATCH /api/lists/:id/reopen
 * @desc    Reopen archived/hidden list
 * @access  Private/Admin
 */
router.patch(
  '/:id/reopen',
  authenticate,
  requireAdmin,
  [param('id').isInt().withMessage('Invalid list ID')],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const listId = parseInt(req.params.id);

      const list = await prisma.readingList.update({
        where: { id: listId },
        data: {
          status: 'active',
          hiddenFromStaff: false,
        },
      });

      // Log activity
      await prisma.activityLog.create({
        data: {
          userId: req.user.id,
          actionType: 'LIST_REOPEN',
          description: `Reopened reading list "${list.listName}"`,
          relatedListId: list.id,
        },
      });

      res.json({
        message: 'List reopened successfully',
        list,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   DELETE /api/lists/:id
 * @desc    Delete reading list
 * @access  Private/Admin
 */
router.delete(
  '/:id',
  authenticate,
  requireAdmin,
  [param('id').isInt().withMessage('Invalid list ID')],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const listId = parseInt(req.params.id);

      // Get list info before deletion
      const list = await prisma.readingList.findUnique({
        where: { id: listId },
      });

      if (!list) {
        return res.status(404).json({ message: 'Reading list not found' });
      }

      // Delete list (cascade will delete records and assignments)
      await prisma.readingList.delete({
        where: { id: listId },
      });

      // Log activity
      await prisma.activityLog.create({
        data: {
          userId: req.user.id,
          actionType: 'LIST_DELETE',
          description: `Deleted reading list "${list.listName}"`,
        },
      });

      res.json({ message: 'List deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
