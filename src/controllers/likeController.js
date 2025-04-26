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

  // Create like and update post in a transaction
  const like = await prisma.$transaction(async (prisma) => {
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

    // Get post details for notification
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: {
        id: true,
        title: true,
        content: true,
        author: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        }
      }
    });

    // Get total count for pagination
    const total = await prisma.like.count({ where: { postId } });

    const likes = await prisma.like.findMany({
      where: { postId },
      skip: req.queryOptions.skip,
      take: req.queryOptions.take,
      orderBy: req.queryOptions.orderBy,
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

  res.json({
    status: 'success',
    data: { like }
  });
});

module.exports = {
  likePost,
  unlikePost,
  getPostLikes,
  getUserLikes
};
