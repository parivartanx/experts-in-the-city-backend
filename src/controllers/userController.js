const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { catchAsync } = require('../middleware/errorHandler');
const { AppError, ErrorCodes, HttpStatus } = require('../utils/errors');

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
  // First get the user to check their role
  const userWithRole = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { role: true }
  });

  // Base select object for all users
  const baseSelect = {
    id: true,
    email: true,
    name: true,
    role: true,
    bio: true,
    avatar: true,
    interests: true,
    tags: true,
    location: true,
    createdAt: true,
    updatedAt: true,
    posts: {
      select: {
        id: true,
        title: true,
        content: true,
        image: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            likes: true,
            comments: true
          }
        }
      }
    },
    followers: {
      select: {
        id: true,
        follower: {
          select: {
            id: true,
            name: true,
            avatar: true,
            role: true
          }
        },
        createdAt: true
      }
    },
    following: {
      select: {
        id: true,
        following: {
          select: {
            id: true,
            name: true,
            avatar: true,
            role: true
          }
        },
        createdAt: true
      }
    },
    _count: {
      select: {
        posts: true,
        followers: true,
        following: true,
        comments: true,
        likes: true
      }
    }
  };

  // Add expert details only if user is an EXPERT
  if (userWithRole.role === 'EXPERT') {
    baseSelect.expertDetails = {
      select: {
        id: true,
        headline: true,
        summary: true,
        expertise: true,
        experience: true,
        hourlyRate: true,
        about: true,
        availability: true,
        languages: true,
        verified: true,
        badges: true,
        progressLevel: true,
        progressShow: true,
        ratings: true,
        createdAt: true,
        updatedAt: true,
        certifications: {
          select: {
            id: true,
            name: true,
            issuingOrganization: true,
            issueDate: true,
            expiryDate: true,
            credentialId: true,
            credentialUrl: true,
            createdAt: true,
            updatedAt: true
          }
        },
        experiences: {
          select: {
            id: true,
            title: true,
            company: true,
            location: true,
            startDate: true,
            endDate: true,
            isCurrent: true,
            description: true,
            skills: true,
            createdAt: true,
            updatedAt: true
          }
        },
        awards: {
          select: {
            id: true,
            title: true,
            issuer: true,
            date: true,
            description: true,
            createdAt: true,
            updatedAt: true
          }
        },
        education: {
          select: {
            id: true,
            school: true,
            degree: true,
            fieldOfStudy: true,
            startDate: true,
            endDate: true,
            isCurrent: true,
            description: true,
            grade: true,
            activities: true,
            createdAt: true,
            updatedAt: true
          }
        }
      }
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: baseSelect
  });

  res.json({
    status: 'success',
    data: { user }
  });
});

const updateProfile = catchAsync(async (req, res) => {
  const { 
    name, 
    bio, 
    avatar,
    interests,
    tags,
    location,
    expertise,
    experience,
    hourlyRate,
    about
  } = req.body;

  // Validate location object if provided
  if (location) {
    const validLocationFields = ['pincode', 'address', 'country'];
    const providedFields = Object.keys(location);
    
    // Check if all provided fields are valid
    const invalidFields = providedFields.filter(field => !validLocationFields.includes(field));
    if (invalidFields.length > 0) {
      throw new AppError(
        `Invalid location fields: ${invalidFields.join(', ')}`,
        HttpStatus.BAD_REQUEST,
        ErrorCodes.INVALID_INPUT
      );
    }

    // Validate latitude and longitude if provided
    if (location.latitude !== undefined) {
      const lat = parseFloat(location.latitude);
      if (isNaN(lat) || lat < -90 || lat > 90) {
        throw new AppError(
          'Invalid latitude value. Must be between -90 and 90',
          HttpStatus.BAD_REQUEST,
          ErrorCodes.INVALID_INPUT
        );
      }
    }

    if (location.longitude !== undefined) {
      const lng = parseFloat(location.longitude);
      if (isNaN(lng) || lng < -180 || lng > 180) {
        throw new AppError(
          'Invalid longitude value. Must be between -180 and 180',
          HttpStatus.BAD_REQUEST,
          ErrorCodes.INVALID_INPUT
        );
      }
    }
  }

  // Update user profile
  const updatedUser = await prisma.user.update({
    where: { id: req.user.id },
    data: {
      name,
      bio,
      avatar,
      interests: interests || undefined,
      tags: tags || undefined,
      location: location || undefined,
      // Handle expert details if user is an expert
      ...(req.user.role === 'EXPERT' && {
        expertDetails: {
          upsert: {
            create: {
              expertise: expertise || [],
              experience: experience || 0,
              hourlyRate: hourlyRate || 0,
              about: about || ''
            },
            update: {
              expertise: expertise || undefined,
              experience: experience || undefined,
              hourlyRate: hourlyRate || undefined,
              about: about || undefined
            }
          }
        }
      })
    },
    include: {
      expertDetails: true
    }
  });

  res.json({
    status: 'success',
    data: { user: updatedUser }
  });
});

const changePassword = catchAsync(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const isValidPassword = await bcrypt.compare(currentPassword, req.user.password);

  if (!isValidPassword) {
    throw new AppError(
      'Current password is incorrect',
      HttpStatus.UNAUTHORIZED,
      ErrorCodes.INVALID_CREDENTIALS
    );
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
  // Delete user and all related records in a transaction
  await prisma.$transaction([
    // Delete expert details if exists
    prisma.expertDetails.deleteMany({ where: { userId: req.user.id } }),
    // Delete user's posts
    prisma.post.deleteMany({ where: { authorId: req.user.id } }),
    // Delete user's comments
    prisma.comment.deleteMany({ where: { authorId: req.user.id } }),
    // Delete user's likes
    prisma.like.deleteMany({ where: { userId: req.user.id } }),
    // Delete user's follows
    prisma.follow.deleteMany({
      where: {
        OR: [
          { followerId: req.user.id },
          { followingId: req.user.id }
        ]
      }
    }),
    // Delete user
    prisma.user.delete({ where: { id: req.user.id } })
  ]);

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
