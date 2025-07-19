const { PrismaClient } = require('@prisma/client');
const { formatPaginatedResponse } = require('../middleware/queryHandler');
const { catchAsync } = require('../middleware/errorHandler');
const { AppError, ErrorCodes, HttpStatus } = require('../utils/errors');

const prisma = new PrismaClient();

const followUser = catchAsync(async (req, res) => {
  const { id } = req.params;
  const followerId = req.user.id;

  // Prevent self-following
  if (followerId === id) {
    throw new AppError(
      'Cannot follow yourself',
      HttpStatus.BAD_REQUEST,
      ErrorCodes.INVALID_INPUT
    );
  }

  // Check if user exists and is actually an expert
  const expertToFollow = await prisma.user.findUnique({
    where: { id },
  });

  if (!expertToFollow) {
    throw new AppError(
      'User not found',
      HttpStatus.NOT_FOUND,
      ErrorCodes.NOT_FOUND
    );
  }

  // Check if already following
  const existingFollow = await prisma.follow.findUnique({
    where: {
      followerId_followingId: {
        followerId,
        followingId: id
      }
    }
  });

  if (existingFollow) {
    throw new AppError(
      'Already following this expert',
      HttpStatus.BAD_REQUEST,
      ErrorCodes.INVALID_INPUT
    );
  }

  // Create follow relationship and notification in a transaction
  const follow = await prisma.$transaction(async (prisma) => {
    const follow = await prisma.follow.create({
      data: {
        followerId,
        followingId: id
      },
      include: {
        following: {
          select: {
            id: true,
            name: true,
            avatar: true,
            role: true
          }
        }
      }
    });

    // Create notification for the followed expert
    await prisma.notification.create({
      data: {
        type: 'FOLLOW',
        content: `${req.user.name} started following you`,
        recipientId: id,
        senderId: followerId
      }
    });

    return follow;
  });

  res.status(201).json({
    status: 'success',
    data: { follow }
  });
});

const unFollowUser = catchAsync(async (req, res) => {
  const { id } = req.params;
  const followerId = req.user.id;

  // Check if follow relationship exists
  const existingFollow = await prisma.follow.findUnique({
    where: {
      followerId_followingId: {
        followerId,
        followingId: id
      }
    }
  });

  if (!existingFollow) {
    throw new AppError(
      'Not following this expert',
      HttpStatus.BAD_REQUEST,
      ErrorCodes.INVALID_INPUT
    );
  }

  await prisma.follow.delete({
    where: {
      followerId_followingId: {
        followerId,
        followingId: id
      }
    }
  });

  res.json({
    status: 'success',
    message: 'Successfully unfollowed expert'
  });
});

const checkFollowStatus = catchAsync(async (req, res) => {
  const { id } = req.params;
  const followerId = req.user.id;

  // Validate that the user being checked exists
  const userToCheck = await prisma.user.findUnique({
    where: { id }
  });

  if (!userToCheck) {
    throw new AppError(
      'User not found',
      HttpStatus.NOT_FOUND,
      ErrorCodes.NOT_FOUND
    );
  }

  const follow = await prisma.follow.findUnique({
    where: {
      followerId_followingId: {
        followerId,
        followingId: id
      }
    }
  });

  res.json({
    status: 'success',
    data: {
      isFollowing: !!follow
    }
  });
});

const getFollowers = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const { skip, take, orderBy } = req.queryOptions;

  // Validate that the user exists
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!user) {
    throw new AppError(
      'User not found',
      HttpStatus.NOT_FOUND,
      ErrorCodes.NOT_FOUND
    );
  }

  // Get total count for pagination
  const total = await prisma.follow.count({
    where: { followingId: userId }
  });

  const followers = await prisma.follow.findMany({
    where: { followingId: userId },
    skip,
    take,
    orderBy,
    include: {
      follower: {
        select: {
          id: true,
          name: true,
          avatar: true,
          role: true
        }
      }
    }
  });

  const formattedFollowers = followers.map(follow => ({
    id: follow.follower.id,
    name: follow.follower.name,
    avatar: follow.follower.avatar,
    role: follow.follower.role,
    followedAt: follow.createdAt
  }));

  res.json(formatPaginatedResponse(
    { followers: formattedFollowers },
    total,
    req.queryOptions.page,
    req.queryOptions.limit
  ));
});

const getFollowing = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const { skip, take, orderBy } = req.queryOptions;

  // Validate that the user exists
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!user) {
    throw new AppError(
      'User not found',
      HttpStatus.NOT_FOUND,
      ErrorCodes.NOT_FOUND
    );
  }

  // Get total count for pagination
  const total = await prisma.follow.count({
    where: { followerId: userId }
  });

  const following = await prisma.follow.findMany({
    where: { followerId: userId },
    skip,
    take,
    orderBy,
    include: {
      following: {
        select: {
          id: true,
          name: true,
          avatar: true,
          role: true
        }
      }
    }
  });

  const formattedFollowing = following.map(follow => ({
    id: follow.following.id,
    name: follow.following.name,
    avatar: follow.following.avatar,
    role: follow.following.role,
    followedAt: follow.createdAt
  }));

  res.json(formatPaginatedResponse(
    { following: formattedFollowing },
    total,
    req.queryOptions.page,
    req.queryOptions.limit
  ));
});

module.exports = {
  followUser,
  unFollowUser,
  checkFollowStatus,
  getFollowers,
  getFollowing
};
