const { PrismaClient } = require('@prisma/client');
const cloudinary = require('cloudinary').v2;
const { formatPaginatedResponse } = require('../middleware/queryHandler');
const { catchAsync } = require('../middleware/errorHandler');

const prisma = new PrismaClient();

const createPost = catchAsync(async (req, res) => {
  try {
    const { title, content } = req.body;
    const userId = req.user.id;

    let imageUrl;
    if (req.file) {
      // Upload image to Cloudinary
      const uploadOptions = {
        resource_type: 'auto',
        folder: 'posts'
      };

      if (process.env.NODE_ENV === 'production' && process.env.VERCEL) {
        // For Vercel (memory storage)
        const result = await cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
          if (error) throw error;
          imageUrl = result.secure_url;
        }).end(req.file.buffer);
      } else {
        // For local development (disk storage)
        const result = await cloudinary.uploader.upload(req.file.path, uploadOptions);
        imageUrl = result.secure_url;
      }
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
    const { title, content } = req.body;
    const userId = req.user.id;

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
    if (req.file) {
      // Upload image to Cloudinary
      const uploadOptions = {
        resource_type: 'auto',
        folder: 'posts'
      };

      if (process.env.NODE_ENV === 'production' && process.env.VERCEL) {
        // For Vercel (memory storage)
        const result = await cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
          if (error) throw error;
          imageUrl = result.secure_url;
        }).end(req.file.buffer);
      } else {
        // For local development (disk storage)
        const result = await cloudinary.uploader.upload(req.file.path, uploadOptions);
        imageUrl = result.secure_url;
      }
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

const addTags = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { tags } = req.body;
  const userId = req.user.id;

  // Check if post exists and belongs to user
  const existingPost = await prisma.post.findUnique({
    where: { id },
    select: { authorId: true }
  });

  if (!existingPost) {
    throw { status: 404, message: 'Post not found' };
  }

  if (existingPost.authorId !== userId) {
    throw { status: 403, message: 'You can only add tags to your own posts' };
  }

  // Create or connect tags
  const updatedPost = await prisma.post.update({
    where: { id },
    data: {
      tags: {
        connectOrCreate: tags.map(tag => ({
          where: { name: tag },
          create: { name: tag }
        }))
      }
    },
    include: {
      tags: true
    }
  });

  res.json({
    status: 'success',
    data: { post: updatedPost }
  });
});

module.exports = {
  createPost,
  getPost,
  listPosts,
  updatePost,
  deletePost,
  addTags
};
