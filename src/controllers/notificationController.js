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
        post: {
          select: {
            id: true,
            title: true,
            content: true
          }
        }
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

    await prisma.notification.update({
      where: { id },
      data: { isRead: true }
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
      data: { isRead: true }
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

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification
};
