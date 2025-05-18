const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cloudinary = require('cloudinary').v2;
const { catchAsync } = require('../middleware/errorHandler');

const prisma = new PrismaClient();


// public controller
const getAllUsers = catchAsync(async (req, res, next) => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      avatar: true,
      bio: true,
      role: true,
      createdAt: true,
    }
  });
  res.json({ status: 'success', data: { users } });
});

const getUserById = catchAsync(async (req, res, next) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    select: {
      id: true,
      name: true,
      email: true,
      avatar: true,
      createdAt: true,
    }
  });
  res.json({ status: 'success', data: { user } });
});


// protected controller
const getProfile = catchAsync(async (req, res) => {
  res.json({
    status: 'success',
    data: { user: req.user }
  });
});

const updateProfile = catchAsync(async (req, res) => {
  const updates = Object.keys(req.body);
  const allowedUpdates = ['name', 'bio', 'avatar'];
  const expertUpdates = ['expertise', 'experience', 'hourlyRate', 'about'];
  
  // If user is an expert, allow expert-specific updates
  if (req.user.role === 'EXPERT') {
    allowedUpdates.push(...expertUpdates);
  }

  const isValidOperation = updates.every(update => allowedUpdates.includes(update));

  if (!isValidOperation) {
    throw { status: 400, message: 'Invalid updates' };
  }

  try {
    // Separate expert details from regular user updates
    const userUpdates = {};
    const expertDetailsUpdates = {};

    updates.forEach(update => {
      if (expertUpdates.includes(update)) {
        expertDetailsUpdates[update] = req.body[update];
      } else {
        userUpdates[update] = req.body[update];
      }
    });

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        ...userUpdates,
        expertDetails: req.user.role === 'EXPERT' && Object.keys(expertDetailsUpdates).length > 0
          ? {
              upsert: {
                create: expertDetailsUpdates,
                update: expertDetailsUpdates
              }
            }
          : undefined
      },
      select: {
        id: true,
        email: true,
        name: true,
        bio: true,
        avatar: true,
        role: true,
        expertDetails: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.json({
      status: 'success',
      data: { user }
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
});

const changePassword = catchAsync(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const isValidPassword = await bcrypt.compare(currentPassword, req.user.password);

  if (!isValidPassword) {
    throw { status: 401, message: 'Current password is incorrect' };
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await prisma.user.update({
    where: { id: req.user.id },
    data: { password: hashedPassword }
  });

  res.json({
    status: 'success',
    message: 'Password changed successfully'
  });
});

const deleteAccount = catchAsync(async (req, res) => {
  await prisma.user.delete({
    where: { id: req.user.id }
  });

  res.json({
    status: 'success',
    message: 'Account deleted successfully'
  });
});

module.exports = {
  getAllUsers,
  getUserById,
  getProfile,
  updateProfile,
  changePassword,
  deleteAccount
};
