const { PrismaClient } = require('@prisma/client');
const { AppError, ErrorCodes, HttpStatus } = require('../utils/errors');
const prisma = new PrismaClient();

// Get dashboard statistics
const getDashboardStats = async (req, res) => {
  try {
    const stats = await prisma.$transaction([
      prisma.user.count(),
      prisma.post.count(),
      prisma.comment.count(),
      prisma.expertDetails.count(),
      prisma.like.count(),
      prisma.follow.count()
    ]);

    // Get recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentActivity = await prisma.$transaction([
      prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.post.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.comment.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.follow.count({ where: { createdAt: { gte: sevenDaysAgo } } })
    ]);

    res.json({
      status: 'success',
      data: {
        totalStats: {
          totalUsers: stats[0],
          totalPosts: stats[2],
          totalComments: stats[3],
          totalExperts: stats[4],
          totalLikes: stats[5],
          totalFollows: stats[6]
        },
        recentActivity: {
          newUsers: recentActivity[0],
          newPosts: recentActivity[1],
          newComments: recentActivity[2],
          newFollows: recentActivity[3]
        }
      }
    });
  } catch (error) {
    throw new AppError(
      'Failed to fetch dashboard statistics',
      HttpStatus.INTERNAL_SERVER_ERROR,
      ErrorCodes.INTERNAL_ERROR
    );
  }
};

// Get all users with filtering, sorting, and pagination
const getAllUsers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      role,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      startDate,
      endDate
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Build where clause
    const where = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }
    if (role) {
      where.role = role;
    }
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    // Get users with related data
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: {
          Admin: true,
          expertDetails: true,
          _count: {
            select: {
              posts: true,
              followers: true,
              following: true,
              likes: true,
              comments: true
            }
          }
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take
      }),
      prisma.user.count({ where })
    ]);

    const formattedUsers = users.map(user => ({
      id: user.id,
      email: user.email,
      name: user.name,
      bio: user.bio,
      avatar: user.avatar,
      role: user.role,
      isAdmin: !!user.Admin,
      expertDetails: user.expertDetails,
      stats: user._count,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }));

    res.json({
      status: 'success',
      data: {
        users: formattedUsers,
        pagination: {
          total,
          page: parseInt(page),
          limit: take,
          pages: Math.ceil(total / take)
        }
      }
    });
  } catch (error) {
    throw new AppError(
      'Failed to fetch users',
      HttpStatus.INTERNAL_SERVER_ERROR,
      ErrorCodes.INTERNAL_ERROR
    );
  }
};

// Get user by ID with detailed information
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        Admin: true,
        expertDetails: true,
        posts: {
          include: {
            _count: {
              select: {
                likes: true,
                comments: true
              }
            }
          }
        },
        followers: {
          include: {
            follower: {
              select: {
                id: true,
                name: true,
                avatar: true
              }
            }
          }
        },
        following: {
          include: {
            following: {
              select: {
                id: true,
                name: true,
                avatar: true
              }
            }
          }
        },
        _count: {
          select: {
            posts: true,
            followers: true,
            following: true,
            likes: true,
            comments: true
          }
        }
      }
    });

    if (!user) {
      throw new AppError(
        'User not found',
        HttpStatus.NOT_FOUND,
        ErrorCodes.NOT_FOUND
      );
    }

    res.json({
      status: 'success',
      data: { user }
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      'Failed to fetch user',
      HttpStatus.INTERNAL_SERVER_ERROR,
      ErrorCodes.INTERNAL_ERROR
    );
  }
};

// Update user
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      name, 
      email, 
      role, 
      bio, 
      avatar,
      interests,
      tags,
      location
    } = req.body;

    const user = await prisma.user.findUnique({
      where: { id },
      include: { Admin: true }
    });

    if (!user) {
      throw new AppError(
        'User not found',
        HttpStatus.NOT_FOUND,
        ErrorCodes.NOT_FOUND
      );
    }

    // Prevent updating the last admin
    if (user.Admin && role !== 'ADMIN') {
      const adminCount = await prisma.admin.count();
      if (adminCount <= 1) {
        throw new AppError(
          'Cannot remove admin role from the last admin',
          HttpStatus.BAD_REQUEST,
          ErrorCodes.INVALID_INPUT
        );
      }
    }

    // Validate location object if provided
    if (location) {
      const validLocationFields = ['pincode', 'address', 'country', 'latitude', 'longitude'];
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

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        name,
        email,
        role,
        bio,
        avatar,
        interests: interests || undefined,
        tags: tags || undefined,
        location: location || undefined
      },
      include: {
        Admin: true,
        expertDetails: true
      }
    });

    res.json({
      status: 'success',
      data: { user: updatedUser }
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      'Failed to update user',
      HttpStatus.INTERNAL_SERVER_ERROR,
      ErrorCodes.INTERNAL_ERROR
    );
  }
};

// Delete user
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      include: { Admin: true }
    });

    if (!user) {
      throw new AppError(
        'User not found',
        HttpStatus.NOT_FOUND,
        ErrorCodes.NOT_FOUND
      );
    }

    // Prevent deleting the last admin
    if (user.Admin) {
      const adminCount = await prisma.admin.count();
      if (adminCount <= 1) {
        throw new AppError(
          'Cannot delete the last admin',
          HttpStatus.BAD_REQUEST,
          ErrorCodes.INVALID_INPUT
        );
      }
    }

    // Delete user and all related records in a transaction
    await prisma.$transaction([
      // Delete admin record if exists
      user.Admin 
        ? prisma.admin.delete({ where: { userId: id } })
        : prisma.$queryRaw`SELECT 1`,
      // Delete expert details if exists
      prisma.expertDetails.deleteMany({ where: { userId: id } }),
      // Delete user's posts
      prisma.post.deleteMany({ where: { authorId: id } }),
      // Delete user's comments
      prisma.comment.deleteMany({ where: { authorId: id } }),
      // Delete user's likes
      prisma.like.deleteMany({ where: { userId: id } }),
      // Delete user's follows
      prisma.follow.deleteMany({
        where: {
          OR: [
            { followerId: id },
            { followingId: id }
          ]
        }
      }),
      // Delete user
      prisma.user.delete({ where: { id } })
    ]);

    res.json({
      status: 'success',
      message: 'User and all related data deleted successfully'
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      'Failed to delete user',
      HttpStatus.INTERNAL_SERVER_ERROR,
      ErrorCodes.INTERNAL_ERROR
    );
  }
};

// Get all posts with filtering, sorting, and pagination
const getAllPosts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      authorId,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      startDate,
      endDate
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Build where clause
    const where = {};
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } }
      ];
    }
    if (authorId) {
      where.authorId = authorId;
    }
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    // Get posts with related data
    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
        include: {
          author: {
            select: {
              id: true,
              name: true,
              avatar: true,
              role: true
            }
          },
          _count: {
            select: {
              likes: true,
              comments: true
            }
          }
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take
      }),
      prisma.post.count({ where })
    ]);

    res.json({
      status: 'success',
      data: {
        posts,
        pagination: {
          total,
          page: parseInt(page),
          limit: take,
          pages: Math.ceil(total / take)
        }
      }
    });
  } catch (error) {
    throw new AppError(
      'Failed to fetch posts',
      HttpStatus.INTERNAL_SERVER_ERROR,
      ErrorCodes.INTERNAL_ERROR
    );
  }
};

// Delete post
const deletePost = async (req, res) => {
  try {
    const { id } = req.params;

    const post = await prisma.post.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            likes: true,
            comments: true
          }
        }
      }
    });

    if (!post) {
      throw new AppError(
        'Post not found',
        HttpStatus.NOT_FOUND,
        ErrorCodes.NOT_FOUND
      );
    }

    // Delete post and all related records in a transaction
    await prisma.$transaction([
      // Delete likes
      prisma.like.deleteMany({ where: { postId: id } }),
      // Delete comments
      prisma.comment.deleteMany({ where: { postId: id } }),
      // Delete post
      prisma.post.delete({ where: { id } })
    ]);

    res.json({
      status: 'success',
      message: 'Post and all related data deleted successfully'
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      'Failed to delete post',
      HttpStatus.INTERNAL_SERVER_ERROR,
      ErrorCodes.INTERNAL_ERROR
    );
  }
};

// Get post by ID with detailed information
const getPostById = async (req, res) => {
  try {
    const { id } = req.params;

    const post = await prisma.post.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatar: true,
            role: true,
            email: true
          }
        },
        comments: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                avatar: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        },
        likes: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatar: true
              }
            }
          }
        },
        tags: true,
        _count: {
          select: {
            likes: true,
            comments: true
          }
        }
      }
    });

    if (!post) {
      throw new AppError(
        'Post not found',
        HttpStatus.NOT_FOUND,
        ErrorCodes.NOT_FOUND
      );
    }

    res.json({
      status: 'success',
      data: { post }
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      'Failed to fetch post',
      HttpStatus.INTERNAL_SERVER_ERROR,
      ErrorCodes.INTERNAL_ERROR
    );
  }
};

// Update post
const updatePost = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, imageKey, tags } = req.body;

    const post = await prisma.post.findUnique({
      where: { id },
      include: {
        tags: true
      }
    });

    if (!post) {
      throw new AppError(
        'Post not found',
        HttpStatus.NOT_FOUND,
        ErrorCodes.NOT_FOUND
      );
    }

    // Update post with transaction to handle tags
    const updatedPost = await prisma.$transaction(async (prisma) => {
      // Update post
      const post = await prisma.post.update({
        where: { id },
        data: {
          title,
          content,
          image: imageKey,
          // Handle tags if provided
          ...(tags && {
            tags: {
              deleteMany: {},
              create: tags.map(tag => ({
                name: tag
              }))
            }
          })
        },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              avatar: true,
              role: true
            }
          },
          tags: true,
          _count: {
            select: {
              likes: true,
              comments: true
            }
          }
        }
      });

      return post;
    });

    res.json({
      status: 'success',
      data: { post: updatedPost }
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      'Failed to update post',
      HttpStatus.INTERNAL_SERVER_ERROR,
      ErrorCodes.INTERNAL_ERROR
    );
  }
};

module.exports = {
  getDashboardStats,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  getAllPosts,
  getPostById,
  updatePost,
  deletePost
};
