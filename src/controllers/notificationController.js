const { PrismaClient } = require('@prisma/client');
const { formatPaginatedResponse } = require('../middleware/queryHandler');
const { catchAsync } = require('../middleware/errorHandler');

const prisma = new PrismaClient();

const getNotifications = catchAsync(async (req, res) => {
    const userId = req.user.id;
    const { skip, take, orderBy } = req.queryOptions;

    // Merge custom filters with queryOptions.where
    let where = { 
      ...req.queryOptions.where,
      recipientId: userId
    };

    // Get total count for pagination
    const total = await prisma.notification.count({ where });

    const notifications = await prisma.notification.findMany({
      where,
      skip,
      take,
      orderBy,
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        },
      }
    });

    res.json(formatPaginatedResponse(
      { notifications },
      total,
      req.queryOptions.page,
      req.queryOptions.limit
    ));
});

const markAsRead = catchAsync(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    const notification = await prisma.notification.findUnique({
      where: { id }
    });

    if (!notification) {
      throw { status: 404, message: 'Notification not found' };
    }

    if (notification.recipientId !== userId) {
      throw { status: 403, message: 'Not authorized to update this notification' };
    }

    const updatedNotification =     await prisma.notification.update({
      where: { id },
      data: { read: true }
    });

    res.json({
      status: 'success',
      data: { notification: updatedNotification }
    });
});

const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;

    await prisma.notification.updateMany({
      where: { recipientId: userId },
      data: { read: true }
    });

    res.json({
      status: 'success',
      message: 'All notifications marked as read'
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

const deleteNotification = catchAsync(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    const notification = await prisma.notification.findUnique({
      where: { id }
    });

    if (!notification) {
      throw { status: 404, message: 'Notification not found' };
    }

    if (notification.recipientId !== userId) {
      throw { status: 403, message: 'Not authorized to delete this notification' };
    }

    await prisma.notification.delete({
      where: { id }
    });

    res.json({
      status: 'success',
      message: 'Notification deleted successfully'
    });
});

// ADMIN

const getAllNotifications = catchAsync(async (req, res) => {
    const { skip, take, orderBy } = req.queryOptions;

    // Get total count for pagination
    const total = await prisma.notification.count({ 
      where: req.queryOptions.where 
    });

    const notifications = await prisma.notification.findMany({
      where: req.queryOptions.where,
      skip,
      take,
      orderBy,
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        },
        recipient: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        },
      }
    });

    res.json(formatPaginatedResponse(
      { notifications },
      total,
      req.queryOptions.page,
      req.queryOptions.limit
    ));
});

const createNotification = catchAsync(async (req, res) => {
    const { recipientId, type, content, senderId } = req.body;

    // Validate required fields
    if (!recipientId || !type || !content) {
      throw { status: 400, message: 'recipientId, type, and content are required' };
    }

    // Check if recipient exists
    const recipient = await prisma.user.findUnique({
      where: { id: recipientId }
    });

    if (!recipient) {
      throw { status: 404, message: 'Recipient not found' };
    }

    // Check if sender exists (if provided)
    if (senderId) {
      const sender = await prisma.user.findUnique({
        where: { id: senderId }
      });

      if (!sender) {
        throw { status: 404, message: 'Sender not found' };
      }
    }

    const notification = await prisma.notification.create({
      data: {
        recipientId,
        type,
        content,
        senderId: senderId || null,
        read: false
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        },
        recipient: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        }
      }
    });

    res.status(201).json({
      status: 'success',
      data: { notification }
    });
});

const updateNotification = catchAsync(async (req, res) => {
    const { id } = req.params;
    const { type, content, read } = req.body;

    // Check if notification exists
    const existingNotification = await prisma.notification.findUnique({
      where: { id }
    });

    if (!existingNotification) {
      throw { status: 404, message: 'Notification not found' };
    }

    // Prepare update data
    const updateData = {};
    if (type !== undefined) updateData.type = type;
    if (content !== undefined) updateData.content = content;
    if (read !== undefined) updateData.read = read;

    const updatedNotification = await prisma.notification.update({
      where: { id },
      data: updateData,
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        },
        recipient: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        }
      }
    });

    res.json({
      status: 'success',
      data: { notification: updatedNotification }
    });
});

const deleteNotificationAdmin = catchAsync(async (req, res) => {
    const { id } = req.params;

    // Check if notification exists
    const notification = await prisma.notification.findUnique({
      where: { id }
    });

    if (!notification) {
      throw { status: 404, message: 'Notification not found' };
    }

    await prisma.notification.delete({
      where: { id }
    });

    res.json({
      status: 'success',
      message: 'Notification deleted successfully'
    });
});

const getNotificationById = catchAsync(async (req, res) => {
    const { id } = req.params;

    const notification = await prisma.notification.findUnique({
      where: { id },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        },
        recipient: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        },
      }
    });

    if (!notification) {
      throw { status: 404, message: 'Notification not found' };
    }

    res.json({
      status: 'success',
      data: { notification }
    });
});

const bulkDeleteNotifications = catchAsync(async (req, res) => {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      throw { status: 400, message: 'ids array is required and must not be empty' };
    }

    // Check if all notifications exist
    const existingNotifications = await prisma.notification.findMany({
      where: { id: { in: ids } }
    });

    if (existingNotifications.length !== ids.length) {
      throw { status: 404, message: 'Some notifications not found' };
    }

    await prisma.notification.deleteMany({
      where: { id: { in: ids } }
    });

    res.json({
      status: 'success',
      message: `${ids.length} notifications deleted successfully`
    });
});

const bulkMarkAsRead = catchAsync(async (req, res) => {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      throw { status: 400, message: 'ids array is required and must not be empty' };
    }

    await prisma.notification.updateMany({
      where: { id: { in: ids } },
      data: { read: true }
    });

    res.json({
      status: 'success',
      message: `${ids.length} notifications marked as read`
    });
});

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  // Admin functions
  getAllNotifications,
  createNotification,
  updateNotification,
  deleteNotificationAdmin,
  getNotificationById,
  bulkDeleteNotifications,
  bulkMarkAsRead
};
