const { PrismaClient } = require('@prisma/client');
const { formatPaginatedResponse } = require('../middleware/queryHandler');

const prisma = new PrismaClient();

const followUser = async (req, res) => {
  try {
    const { id: followingId } = req.params;
    const followerId = req.user.id;

    // Prevent self-following
    if (followerId === followingId) {
      return res.status(400).json({
        status: 'error',
        message: 'Cannot follow yourself'
      });
    }

    // Check if user to follow exists
    const userToFollow = await prisma.user.findUnique({
      where: { id: followingId }
    });

    if (!userToFollow) {
      return res.status(404).json({
        status: 'error',
        message: 'User to follow not found'
      });
    }

    // Check if already following
    const existingFollow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId
        }
      }
    });

    if (existingFollow) {
      return res.status(400).json({
        status: 'error',
        message: 'Already following this user'
      });
    }

    // Create follow relationship and notification in a transaction
    const follow = await prisma.$transaction(async (prisma) => {
      const follow = await prisma.follow.create({
        data: {
          followerId,
          followingId
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

      // Create notification for the followed user
      await prisma.notification.create({
        data: {
          type: 'FOLLOW',
          content: `${req.user.name} started following you`,
          recipientId: followingId,
          senderId: followerId
        }
      });

      return follow;
    });

    res.status(201).json({
      status: 'success',
      data: { follow }
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

const unfollowUser = async (req, res) => {
  try {
    const { id: followingId } = req.params;
    const followerId = req.user.id;

    await prisma.follow.delete({
      where: {
        followerId_followingId: {
          followerId,
          followingId
        }
      }
    });

    res.json({
      status: 'success',
      message: 'Successfully unfollowed user'
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        status: 'error',
        message: 'Not following this user'
      });
    }
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

const getFollowers = async (req, res) => {
  try {
    const { id: userId } = req.params;
    const { skip, take, orderBy } = req.queryOptions;

    // Merge custom filters with queryOptions.where
    let where = { 
      ...req.queryOptions.where,
      followingId: userId
    };

    // Get total count for pagination
    const total = await prisma.follow.count({ where });

    const followers = await prisma.follow.findMany({
      where,
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
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

const getFollowing = async (req, res) => {
  try {
    const { id: userId } = req.params;
    const { skip, take, orderBy } = req.queryOptions;

    // Merge custom filters with queryOptions.where
    let where = { 
      ...req.queryOptions.where,
      followerId: userId
    };

    // Get total count for pagination
    const total = await prisma.follow.count({ where });

    const following = await prisma.follow.findMany({
      where,
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
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

module.exports = {
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing
};
