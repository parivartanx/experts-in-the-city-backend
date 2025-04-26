const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cloudinary = require('cloudinary').v2;
const { catchAsync } = require('../middleware/errorHandler');

const prisma = new PrismaClient();

const register = catchAsync(async (req, res) => {
  const { email, password, name } = req.body;

  // Check if user exists
  const existingUser = await prisma.user.findUnique({
    where: { email }
  });

  if (existingUser) {
    throw { status: 400, message: 'Email already in use' };
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create user
  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name
    },
    select: {
      id: true,
      email: true,
      name: true,
      avatar: true
    }
  });

  // Generate token
  const token = jwt.sign(
    { id: user.id },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );

  res.status(201).json({
    status: 'success',
    data: { user, token }
  });
});

const login = catchAsync(async (req, res) => {
  const { email, password } = req.body;

  // Find user
  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw { status: 401, message: 'Invalid email or password' };
  }

  // Generate token
  const token = jwt.sign(
    { id: user.id },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );

  const userData = {
    id: user.id,
    email: user.email,
    name: user.name,
    avatar: user.avatar
  };

  res.json({
    status: 'success',
    data: { user: userData, token }
  });
});

const getProfile = catchAsync(async (req, res) => {
  res.json({
    status: 'success',
    data: { user: req.user }
  });
});

const updateProfile = catchAsync(async (req, res) => {
  const updates = Object.keys(req.body);
  const allowedUpdates = ['name', 'bio', 'avatar'];
  const isValidOperation = updates.every(update => allowedUpdates.includes(update));

  if (!isValidOperation) {
    throw { status: 400, message: 'Invalid updates' };
  }

  try {
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: req.body,
      select: {
        id: true,
        email: true,
        name: true,
        bio: true,
        avatar: true
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
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
  deleteAccount
};
