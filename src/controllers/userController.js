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
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    include: {
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
      expertDetails: {
        include: {
          certifications: {
            orderBy: { issueDate: 'desc' }
          },
          experiences: {
            orderBy: { startDate: 'desc' }
          },
          awards: {
            orderBy: { date: 'desc' }
          },
          education: {
            orderBy: { startDate: 'desc' }
          }
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
    }
  });

  if (!user) {
    throw new AppError(
      'User profile not found',
      HttpStatus.NOT_FOUND,
      ErrorCodes.NOT_FOUND
    );
  }

  // Transform the response to flatten the structure if user is an expert
  let transformedUser = { ...user };
  
  if (user.role === 'EXPERT' && user.expertDetails) {
    transformedUser = {
      ...user,
      ...user.expertDetails,
      followersCount: user._count.followers,
      followingCount: user._count.following,
      postsCount: user._count.posts,
      commentsCount: user._count.comments,
      likesCount: user._count.likes
    };
    
    // Remove nested objects
    delete transformedUser.expertDetails;
    delete transformedUser._count;
  } else {
    // For regular users, just add the counts
    transformedUser = {
      ...user,
      followersCount: user._count.followers,
      followingCount: user._count.following,
      postsCount: user._count.posts,
      commentsCount: user._count.comments,
      likesCount: user._count.likes
    };
    
    delete transformedUser._count;
  }

  res.json({
    status: 'success',
    data: { user: transformedUser }
  });
});

const updateProfile = catchAsync(async (req, res) => {
  const { 
    name, 
    bio, 
    avatar,
    phone,
    interests,
    tags,
    location,
    // Expert-specific fields
    headline,
    summary,
    expertise,
    experience,
    hourlyRate,
    about,
    availability,
    languages
  } = req.body;

  // Validate expert-specific fields if user is an expert
  if (req.user.role === 'EXPERT') {
    if (experience !== undefined && (typeof experience !== 'number' || experience < 0)) {
      throw new AppError(
        'Experience must be a non-negative number',
        HttpStatus.BAD_REQUEST,
        ErrorCodes.INVALID_INPUT
      );
    }

    if (hourlyRate !== undefined && (typeof hourlyRate !== 'number' || hourlyRate < 0)) {
      throw new AppError(
        'Hourly rate must be a non-negative number',
        HttpStatus.BAD_REQUEST,
        ErrorCodes.INVALID_INPUT
      );
    }

    if (expertise !== undefined && !Array.isArray(expertise)) {
      throw new AppError(
        'Expertise must be an array of strings',
        HttpStatus.BAD_REQUEST,
        ErrorCodes.INVALID_INPUT
      );
    }

    if (languages !== undefined && !Array.isArray(languages)) {
      throw new AppError(
        'Languages must be an array of strings',
        HttpStatus.BAD_REQUEST,
        ErrorCodes.INVALID_INPUT
      );
    }
  }

  // Update user profile
  const updatedUser = await prisma.user.update({
    where: { id: req.user.id },
    data: {
      name,
      bio,
      avatar,
      phone,
      interests: interests || undefined,
      tags: tags || undefined,
      location: location || undefined,
      // Handle expert details if user is an expert
      ...(req.user.role === 'EXPERT' && {
        expertDetails: {
          upsert: {
            create: {
              headline: headline || null,
              summary: summary || null,
              expertise: expertise || [],
              experience: experience || 0,
              hourlyRate: hourlyRate || 0,
              about: about || '',
              availability: availability || null,
              languages: languages || []
            },
            update: {
              headline: headline || undefined,
              summary: summary || undefined,
              expertise: expertise || undefined,
              experience: experience || undefined,
              hourlyRate: hourlyRate || undefined,
              about: about || undefined,
              availability: availability || undefined,
              languages: languages || undefined
            }
          }
        }
      })
    },
    include: {
      expertDetails: {
        include: {
          certifications: {
            orderBy: { issueDate: 'desc' }
          },
          experiences: {
            orderBy: { startDate: 'desc' }
          },
          awards: {
            orderBy: { date: 'desc' }
          },
          education: {
            orderBy: { startDate: 'desc' }
          }
        }
      }
    }
  });

  // Transform the response to match getProfile structure
  let transformedUser = { ...updatedUser };
  
  if (updatedUser.role === 'EXPERT' && updatedUser.expertDetails) {
    transformedUser = {
      ...updatedUser,
      ...updatedUser.expertDetails
    };
    
    // Remove nested objects
    delete transformedUser.expertDetails;
  }

  res.json({
    status: 'success',
    data: { user: transformedUser }
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

const reportUser = catchAsync(async (req, res) => {
  const { userId } = req.params;
  const { reason } = req.body;
  const reporterId = req.user.id;

  if (userId === reporterId) {
    throw new AppError('You cannot report yourself.', HttpStatus.BAD_REQUEST, ErrorCodes.INVALID_INPUT);
  }

  // Check if user exists
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new AppError('User not found', HttpStatus.NOT_FOUND, ErrorCodes.NOT_FOUND);
  }

  // Prevent duplicate reports by the same user
  const existingReport = await prisma.report.findFirst({
    where: { reportedUserId: userId, reporterId, targetType: 'USER' }
  });
  if (existingReport) {
    throw new AppError('You have already reported this user.', HttpStatus.BAD_REQUEST, ErrorCodes.INVALID_INPUT);
  }

  // Create the report
  const report = await prisma.report.create({
    data: {
      reportedUserId: userId,
      reporterId,
      reason,
      targetType: 'USER'
    }
  });

  // Notify all admins
  const admins = await prisma.user.findMany({ where: { role: 'ADMIN' } });
  const notifications = admins.map(admin => ({
    type: 'REPORT',
    content: `A user has been reported. Reason: ${reason}`,
    recipientId: admin.id,
    senderId: reporterId
  }));
  if (notifications.length > 0) {
    await prisma.notification.createMany({ data: notifications });
  }

  res.status(201).json({
    status: 'success',
    message: 'User reported successfully.',
    data: { report }
  });
});

module.exports = {
  getAllUsers,
  getUserById,
  getProfile,
  updateProfile,
  changePassword,
  deleteAccount,
  reportUser
};
