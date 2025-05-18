const { PrismaClient } = require('@prisma/client');
const { catchAsync } = require('../middleware/errorHandler');
const { formatPaginatedResponse } = require('../middleware/queryHandler');

const prisma = new PrismaClient();

const likePost = catchAsync(async (req, res) => {
  const { id: postId } = req.params;
  const userId = req.user.id;

  // Check if user has already liked this post
  const existingLike = await prisma.like.findUnique({
    where: {
      postId_userId: {
        postId,
        userId
      }
    }
  });

  if (existingLike) {
    return res.status(400).json({
      status: 'error',
      message: 'Post already liked'
    });
  }

  // Create like
  const like = await prisma.like.create({
    data: {
      postId,
      userId
    },
    include: {
      user: {
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
    data: { like }
  });
});

const unlikePost = catchAsync(async (req, res) => {
  const { id: postId } = req.params;
  const userId = req.user.id;

  // Check if like exists
  const existingLike = await prisma.like.findUnique({
    where: {
      postId_userId: {
        postId,
        userId
      }
    }
  });

  if (!existingLike) {
    return res.status(400).json({
      status: 'error',
      message: 'Post not liked yet'
    });
  }

  // Delete like
  await prisma.like.delete({
    where: {
      postId_userId: {
        postId,
        userId
      }
    }
  });

  res.json({
    status: 'success',
    message: 'Post unliked successfully'
  });
});

const getPostLikes = catchAsync(async (req, res) => {
  const { id: postId } = req.params;
  const { skip, take, orderBy } = req.queryOptions;

  // Get total count for pagination
  const total = await prisma.like.count({ where: { postId } });

  const likes = await prisma.like.findMany({
    where: { postId },
    skip,
    take,
    orderBy,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          avatar: true
        }
      }
    }
  });

  res.json(formatPaginatedResponse(
    { likes },
    total,
    req.queryOptions.page,
    req.queryOptions.limit
  ));
});

const getUserLikes = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const { skip, take, orderBy } = req.queryOptions;

  // Get total count for pagination
  const total = await prisma.like.count({ where: { userId } });

  const likes = await prisma.like.findMany({
    where: { userId },
    skip,
    take,
    orderBy,
    include: {
      post: {
        include: {
          author: {
            select: {
              id: true,
              name: true,
              avatar: true
            }
          },
          tags: true,
          _count: {
            select: {
              comments: true,
              likes: true
            }
          }
        }
      }
    }
  });

  // Add post analytics
  const likesWithAnalytics = likes.map(like => ({
    ...like,
    post: {
      ...like.post,
      analytics: {
        comments: like.post._count.comments,
        likes: like.post._count.likes
      }
    }
  }));

  res.json(formatPaginatedResponse(
    { likes: likesWithAnalytics },
    total,
    req.queryOptions.page,
    req.queryOptions.limit
  ));
});

module.exports = {
  likePost,
  unlikePost,
  getPostLikes,
  getUserLikes
};
