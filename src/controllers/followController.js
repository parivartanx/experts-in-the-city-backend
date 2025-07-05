const { PrismaClient } = require('@prisma/client');
const { formatPaginatedResponse } = require('../middleware/queryHandler');
const { catchAsync } = require('../middleware/errorHandler');

const prisma = new PrismaClient();

const followExpert = catchAsync(async (req, res) => {
  const { id } = req.params;
  const followerId = req.user.id;

  // Prevent self-following
  if (followerId === id) {
    throw { status: 400, message: 'Cannot follow yourself' };
  }

  // Check if expert exists
  const expertToFollow = await prisma.user.findUnique({
    where: { id }
  });

  if (!expertToFollow) {
    throw { status: 404, message: 'Expert not found' };
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
    throw { status: 400, message: 'Already following this expert' };
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
            avatar: true
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

const unfollowExpert = catchAsync(async (req, res) => {
  const { id } = req.params;
  const followerId = req.user.id;

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
          avatar: true
        }
      }
    }
  });

  const formattedFollowers = followers.map(follow => ({
    id: follow.follower.id,
    name: follow.follower.name,
    avatar: follow.follower.avatar,
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
          avatar: true
        }
      }
    }
  });

  const formattedFollowing = following.map(follow => ({
    id: follow.following.id,
    name: follow.following.name,
    avatar: follow.following.avatar,
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
  followExpert,
  unfollowExpert,
  checkFollowStatus,
  getFollowers,
  getFollowing
};
