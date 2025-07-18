const { PrismaClient } = require('@prisma/client');
const { generatePresignedUrl, generateReadUrl } = require('../utils/s3');
const { formatPaginatedResponse } = require('../middleware/queryHandler');
const { catchAsync } = require('../middleware/errorHandler');

const prisma = new PrismaClient();

// Get presigned URL for image upload
const getUploadUrl = catchAsync(async (req, res) => {
  const { contentType, fileName } = req.query;
  
  if (!contentType || !fileName) {
    throw { status: 400, message: 'Content type and file name are required' };
  }

  // Generate a unique key for the file
  const key = `posts/${Date.now()}-${fileName}`;
  
  const { presignedUrl, key: fileKey } = await generatePresignedUrl(key, contentType);

  res.json({
    status: 'success',
    data: {
      uploadUrl: presignedUrl,
      key: fileKey,
      expiresIn: 3600 // 1 hour
    }
  });
});

const createPost = catchAsync(async (req, res) => {
  try {
    const { title, content, imageKey } = req.body;
    const userId = req.user.id;

    // Check if user is an EXPERT
    if (req.user.role !== 'EXPERT') {
      throw { status: 403, message: 'Only experts can create posts' };
    }

    let imageUrl;
    if (imageKey) {
      // Generate a read URL for the uploaded image
      imageUrl = await generateReadUrl(imageKey);
    }

    const post = await prisma.post.create({
      data: {
        title,
        content,
        authorId: userId,
        image: imageUrl
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        },
        tags: true
      }
    });

    res.status(201).json({
      status: 'success',
      data: { post }
    });
  } catch (error) {
    throw error;
  }
});

const getPost = catchAsync(async (req, res) => {
  const { id } = req.params;

  const post = await prisma.post.findUnique({
    where: { id },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          avatar: true
        }
      },
      _count: {
        select: {
          comments: true,
          likes: true
        }
      }
    }
  });

  if (!post) {
    throw { status: 404, message: 'Post not found' };
  }

  res.json({
    status: 'success',
    data: { post }
  });
});

const listPosts = catchAsync(async (req, res) => {
  try {
    const { skip, take, orderBy } = req.queryOptions;
    const { tag, userId, search, startDate, endDate } = req.query;

    // Merge custom filters with queryOptions.where
    let where = { ...req.queryOptions.where };

    // Add tag filter
    if (tag) {
      where.tags = {
        some: {
          name: tag
        }
      };
    }

    // Add user filter
    if (userId) {
      where.authorId = userId;
    }

    // Add search filter
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Add date range filter
    if (startDate || endDate) {
      where.createdAt = {};
      
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    // Get total count for pagination
    const total = await prisma.post.count({ where });

    const posts = await prisma.post.findMany({
      where,
      skip,
      take,
      orderBy,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        },
        _count: {
          select: {
            comments: true,
            likes: true
          }
        }
      }
    });

    // Add analytics data to each post
    const postsWithAnalytics = posts.map(post => ({
      ...post,
      analytics: {
        likes: post._count.likes,
        comments: post._count.comments
      }
    }));

    res.json(formatPaginatedResponse(
      { posts: postsWithAnalytics },
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
});

const updatePost = catchAsync(async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, imageKey } = req.body;
    const userId = req.user.id;

    // Check if user is an EXPERT
    if (req.user.role !== 'EXPERT') {
      throw { status: 403, message: 'Only experts can update posts' };
    }

    // Check if post exists and belongs to user
    const existingPost = await prisma.post.findUnique({
      where: { id },
      select: { authorId: true }
    });

    if (!existingPost) {
      throw { status: 404, message: 'Post not found' };
    }

    if (existingPost.authorId !== userId) {
      throw { status: 403, message: 'You can only update your own posts' };
    }

    let imageUrl;
    if (imageKey) {
      // Generate a read URL for the uploaded image
      imageUrl = await generateReadUrl(imageKey);
    }

    const post = await prisma.post.update({
      where: { id },
      data: {
        title,
        content,
        ...(imageUrl && { image: imageUrl })
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        },
        tags: true
      }
    });

    res.json({
      status: 'success',
      data: { post }
    });
  } catch (error) {
    throw error;
  }
});

const deletePost = catchAsync(async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if user is an EXPERT
    if (req.user.role !== 'EXPERT') {
      throw { status: 403, message: 'Only experts can delete posts' };
    }

    // Check if post exists and belongs to user
    const existingPost = await prisma.post.findUnique({
      where: { id },
      select: { authorId: true }
    });

    if (!existingPost) {
      throw { status: 404, message: 'Post not found' };
    }

    if (existingPost.authorId !== userId) {
      throw { status: 403, message: 'You can only delete your own posts' };
    }

    await prisma.post.delete({
      where: { id }
    });

    res.status(204).send();
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
});

const getFollowingPosts = catchAsync(async (req, res) => {
  try {
    const { skip, take, orderBy } = req.queryOptions;
    const { tag, search, startDate, endDate } = req.query;
    const userId = req.user.id;

    // Get the list of users that the current user is following
    const followingUsers = await prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true }
    });

    const followingUserIds = followingUsers.map(follow => follow.followingId);

    // Include the current user's own posts along with following users' posts
    const allUserIds = [...followingUserIds, userId];

    // Build where clause for posts from following users and own posts
    let where = {
      authorId: { in: allUserIds },
      ...req.queryOptions.where
    };

    // Add tag filter
    if (tag) {
      where.tags = {
        some: {
          name: tag
        }
      };
    }

    // Add search filter
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Add date range filter
    if (startDate || endDate) {
      where.createdAt = {};
      
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    // Get total count for pagination
    const total = await prisma.post.count({ where });

    const posts = await prisma.post.findMany({
      where,
      skip,
      take,
      orderBy,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        },
        _count: {
          select: {
            comments: true,
            likes: true
          }
        }
      }
    });

    // Add analytics data to each post
    const postsWithAnalytics = posts.map(post => ({
      ...post,
      analytics: {
        likes: post._count.likes,
        comments: post._count.comments
      }
    }));

    res.json(formatPaginatedResponse(
      { posts: postsWithAnalytics },
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
});

const reportPost = catchAsync(async (req, res) => {
  const { postId } = req.params;
  const { reason } = req.body;
  const reporterId = req.user.id;

  // Check if post exists
  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) {
    throw { status: 404, message: 'Post not found' };
  }

  // Prevent duplicate reports by the same user
  const existingReport = await prisma.report.findFirst({
    where: { postId, reporterId, targetType: 'POST' }
  });
  if (existingReport) {
    throw { status: 400, message: 'You have already reported this post.' };
  }

  // Create the report
  const report = await prisma.report.create({
    data: {
      postId,
      reporterId,
      reportedUserId: post.authorId, // Set the reported user to the post's author
      reason,
      targetType: 'POST'
    }
  });

  // Notify all admins
  const admins = await prisma.user.findMany({ where: { role: 'ADMIN' } });
  const notifications = admins.map(admin => ({
    type: 'REPORT',
    content: `A post has been reported. Reason: ${reason}`,
    recipientId: admin.id,
    senderId: reporterId
  }));
  if (notifications.length > 0) {
    await prisma.notification.createMany({ data: notifications });
  }

  res.status(201).json({
    status: 'success',
    message: 'Post reported successfully.',
    data: { report }
  });
});

module.exports = {
  getUploadUrl,
  createPost,
  getPost,
  listPosts,
  updatePost,
  deletePost,
  getFollowingPosts,
  reportPost
};
