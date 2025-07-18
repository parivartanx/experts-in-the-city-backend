const { PrismaClient } = require('@prisma/client');
const { catchAsync } = require('../middleware/errorHandler');
const { AppError, ErrorCodes, HttpStatus } = require('../utils/errors');

const prisma = new PrismaClient();

// Get all reports made by or against a user
const getReportsByUserId = catchAsync(async (req, res) => {
  const { userId } = req.params;

  // Reports made by the user
  const reportsMade = await prisma.report.findMany({
    where: { reporterId: userId },
    include: {
      post: true,
      reportedUser: true
    }
  });

  // Reports received (against the user)
  const reportsReceived = await prisma.report.findMany({
    where: { reportedUserId: userId },
    include: {
      post: true,
      reporter: true
    }
  });

  res.json({
    status: 'success',
    data: {
      reportsMade,
      reportsReceived
    }
  });
});

// Admin: Get all reports (with optional filters)
const adminGetAllReports = catchAsync(async (req, res) => {
  let { status, targetType, search, page = 1, limit = 20 } = req.query;
  page = parseInt(page);
  limit = parseInt(limit);
  const skip = (page - 1) * limit;

  // Build where clause
  const where = {};
  if (status) where.status = status;
  if (targetType) where.targetType = targetType;
  if (search) {
    where.OR = [
      { reason: { contains: search, mode: 'insensitive' } },
      { reporter: { name: { contains: search, mode: 'insensitive' } } },
      { reportedUser: { name: { contains: search, mode: 'insensitive' } } }
    ];
  }

  // Get total count for pagination
  const total = await prisma.report.count({ where });

  const reports = await prisma.report.findMany({
    where,
    include: {
      post: true,
      reporter: true,
      reportedUser: true
    },
    orderBy: { createdAt: 'desc' },
    skip,
    take: limit
  });

  res.json({
    status: 'success',
    data: {
      reports,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit)
    }
  });
});

// Admin: Get a single report by ID
const adminGetReportById = catchAsync(async (req, res) => {
  const { id } = req.params;
  const report = await prisma.report.findUnique({
    where: { id },
    include: {
      post: true,
      reporter: true,
      reportedUser: true
    }
  });
  if (!report) {
    throw new AppError('Report not found', HttpStatus.NOT_FOUND, ErrorCodes.NOT_FOUND);
  }
  res.json({ status: 'success', data: { report } });
});

// Admin: Update a report (status or details)
const adminUpdateReport = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { status, reason } = req.body;
  const data = {};
  if (status) data.status = status;
  if (reason) data.reason = reason;

  const report = await prisma.report.update({
    where: { id },
    data
  });
  res.json({ status: 'success', data: { report } });
});

// Admin: Delete a report
const adminDeleteReport = catchAsync(async (req, res) => {
  const { id } = req.params;
  await prisma.report.delete({ where: { id } });
  res.json({ status: 'success', message: 'Report deleted' });
});

module.exports = {
  getReportsByUserId,
  adminGetAllReports,
  adminGetReportById,
  adminUpdateReport,
  adminDeleteReport
}; 