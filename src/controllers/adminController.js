const { PrismaClient } = require('@prisma/client');
const { AppError, ErrorCodes, HttpStatus } = require('../utils/errors');
const prisma = new PrismaClient();

// Get dashboard statistics
const getDashboardStats = async (req, res) => {
  try {
    // Get all basic counts in a single transaction
    const [
      totalUsers,
      totalExperts,
      totalPosts,
      totalReviews,
      totalCategories,
      totalSubcategories
    ] = await prisma.$transaction([
      prisma.user.count({ where: { role: 'USER' } }),
      prisma.user.count({ where: { role: 'EXPERT' } }),
      prisma.post.count(),
      prisma.sessionReview.count(),
      prisma.category.count(),
      prisma.subcategory.count()
    ]);

    // User role distribution
    const userRoleStats = await prisma.user.groupBy({
      by: ['role'],
      _count: { role: true }
    });
    const allRoles = ['USER', 'EXPERT', 'ADMIN'];
    const roleCounts = {};
    allRoles.forEach(role => roleCounts[role] = 0);
    (Array.isArray(userRoleStats) ? userRoleStats : []).forEach(stat => {
      roleCounts[stat.role] = stat._count.role;
    });

    // Expert progress level distribution
    const expertProgressStats = await prisma.expertDetails.groupBy({
      by: ['progressLevel'],
      _count: { progressLevel: true }
    });

    // Badge distribution
    const expertBadgeStats = await prisma.expertDetails.findMany({ select: { badges: true } });
    const badgeCounts = {};
    (Array.isArray(expertBadgeStats) ? expertBadgeStats : []).forEach(expert => {
      (expert.badges || []).forEach(badge => {
        badgeCounts[badge] = (badgeCounts[badge] || 0) + 1;
      });
    });

    // Category stats
    const categoryStats = await prisma.category.findMany({
      include: { _count: { select: { subcategories: true } } }
    });
    const categoryStatsMapped = (Array.isArray(categoryStats) ? categoryStats : []).map(category => ({
      name: category.name,
      subcategoryCount: category._count.subcategories
    }));

    // Recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentActivity = await prisma.$transaction([
      prisma.user.count({ where: { role: 'USER', createdAt: { gte: sevenDaysAgo } } }),
      prisma.post.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.comment.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.follow.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.sessionReview.count({ where: { createdAt: { gte: sevenDaysAgo } } })
    ]);

    // Get top performing experts (limited to 10)
    const topExperts = await prisma.expertDetails.findMany({
      select: {
        id: true,
        headline: true,
        ratings: true,
        experience: true,
        hourlyRate: true,
        user: {
          select: {
            name: true,
            avatar: true
          }
        },
        reviews: {
          select: {
            id: true
          }
        }
      },
      where: { ratings: { gt: 0 } },
      orderBy: [
        { ratings: 'desc' }
      ],
      take: 10
    });

    // Process top experts to include review count
    const processedTopExperts = topExperts.map(expert => ({
      id: expert.id,
      name: expert.user.name,
      avatar: expert.user.avatar,
      headline: expert.headline,
      rating: expert.ratings,
      experience: expert.experience,
      hourlyRate: expert.hourlyRate,
      reviewCount: expert.reviews.length
    })).sort((a, b) => {
      // Sort by rating first, then by review count
      if (b.rating !== a.rating) {
        return b.rating - a.rating;
      }
      return b.reviewCount - a.reviewCount;
    });

    // Get expertise distribution (optimized)
    const expertiseStats = await prisma.expertDetails.findMany({
      select: { expertise: true },
      take: 1000 // Limit to prevent memory issues
    });

    const expertiseCounts = {};
    expertiseStats.forEach(expert => {
      expert.expertise.forEach(skill => {
        expertiseCounts[skill] = (expertiseCounts[skill] || 0) + 1;
      });
    });

    const sortedExpertise = Object.entries(expertiseCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([skill, count]) => ({ skill, count }));

    expertBadgeStats.forEach(expert => {
      expert.badges.forEach(badge => {
        badgeCounts[badge] = (badgeCounts[badge] || 0) + 1;
      });
    });

    // Monthly-wise count of EXPERT vs USER for last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5); // include current month
    sixMonthsAgo.setDate(1); // start from the first day of the month

    const usersLast6Months = await prisma.user.findMany({
      where: { createdAt: { gte: sixMonthsAgo } },
      select: { role: true, createdAt: true }
    });

    // Helper to get YYYY-MM in UTC
    const getMonthUTC = date => {
      const year = date.getUTCFullYear();
      const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
      return `${year}-${month}`;
    };

    // Build months array for last 6 months including current month (UTC)
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
      months.push(getMonthUTC(d));
    }

    // Initialize result
    const monthlyUserExpertCounts = months.map(month => ({
      month,
      USER: 0,
      EXPERT: 0
    }));

    // Aggregate
    usersLast6Months.forEach(user => {
      const month = getMonthUTC(new Date(user.createdAt));
      const entry = monthlyUserExpertCounts.find(m => m.month === month);
      if (entry && (user.role === 'USER' || user.role === 'EXPERT')) {
        entry[user.role]++;
      }
    });

    // Notification statistics
    const notificationStats = await prisma.notification.groupBy({
      by: ['type'],
      _count: { type: true }
    });

    // Review satisfaction statistics
    const satisfactionStats = await prisma.sessionReview.groupBy({
      by: ['satisfaction'],
      _count: { satisfaction: true }
    });

    // Average rating
    const averageRating = await prisma.sessionReview.aggregate({
      _avg: { rating: true }
    });

    // Verified experts count
    const verifiedExpertsCount = await prisma.expertDetails.count({
      where: { verified: true }
    });

    // Hourly rate stats
    const hourlyRateStats = await prisma.expertDetails.aggregate({
      _avg: { hourlyRate: true },
      _min: { hourlyRate: true },
      _max: { hourlyRate: true }
    });

    // Remove engagementMetrics from the response
    res.json({
      status: 'success',
      data: {
        totalStats: {
          totalUsers,
          totalPosts,
          totalExperts,
          totalReviews,
          totalCategories,
          totalSubcategories
        },
        recentActivity: {
          newUsers: recentActivity[0],
          newPosts: recentActivity[1],
          newComments: recentActivity[2],
          newFollows: recentActivity[3],
          newReviews: recentActivity[4]
        },
        userDistribution: {
          byRole: Object.entries(roleCounts).map(([role, count]) => ({
            role,
            count
          })),
          byProgressLevel: (Array.isArray(expertProgressStats) ? expertProgressStats : []).map(stat => ({
            level: stat.progressLevel,
            count: stat._count.progressLevel
          }))
        },
        badgeDistribution: Object.entries(badgeCounts).map(([badge, count]) => ({
          badge,
          count
        })),
        topExperts: processedTopExperts,
        notificationStats: (Array.isArray(notificationStats) ? notificationStats : []).map(stat => ({
          type: stat.type,
          count: stat._count.type
        })),
        reviewStats: {
          averageRating: Math.round(((averageRating?._avg?.rating || 0) * 10)) / 10,
          satisfactionDistribution: (Array.isArray(satisfactionStats) ? satisfactionStats : []).map(stat => ({
            level: stat.satisfaction,
            count: stat._count.satisfaction
          }))
        },
        expertiseDistribution: sortedExpertise,
        categoryStats: categoryStatsMapped,
        monthlyUserExpertCounts,
        expertQualityMetrics: {
          verifiedExperts: verifiedExpertsCount,
          verifiedPercentage: totalExperts > 0 ? Math.round((verifiedExpertsCount / totalExperts) * 100) : 0,
          averageHourlyRate: Math.round(((hourlyRateStats?._avg?.hourlyRate || 0) * 100)) / 100,
          minHourlyRate: hourlyRateStats?._min?.hourlyRate || 0,
          maxHourlyRate: hourlyRateStats?._max?.hourlyRate || 0,
          totalExperts
        }
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
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
      isAdmin: !!user.admin,
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
        admin: true,
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
      verified,
      location
    } = req.body;

    const user = await prisma.user.findUnique({
      where: { id },
      include: { 
        admin: true,
        expertDetails: {
          select: {
            id: true,
            badges: true
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

    // Prevent updating the last admin
    if (user.admin && role !== 'ADMIN') {
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

    // Handle expert verification and badges
    if (user.expertDetails && verified !== undefined) {
      const currentBadges = user.expertDetails.badges || [];
      let updatedBadges = [...currentBadges];

      if (verified) {
        // Add VERIFIED_EXPERT badge if not already present
        if (!updatedBadges.includes('VERIFIED_EXPERT')) {
          updatedBadges.push('VERIFIED_EXPERT');
        }
      } else {
        // Remove VERIFIED_EXPERT badge if present
        updatedBadges = updatedBadges.filter(badge => badge !== 'VERIFIED_EXPERT');
      }

      // Update expert details with new badges
      await prisma.expertDetails.update({
        where: { id: user.expertDetails.id },
        data: {
          verified,
          badges: updatedBadges
        }
      });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        name,
        email,
        role,
        bio,
        avatar,
        verified,
        interests: interests || undefined,
        tags: tags || undefined,
        location: location || undefined
      },
      include: {
        admin: true,
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
      include: { admin: true }
    });

    if (!user) {
      throw new AppError(
        'User not found',
        HttpStatus.NOT_FOUND,
        ErrorCodes.NOT_FOUND
      );
    }

    // Prevent deleting the last admin
    if (user.admin) {
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
      user.admin 
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

// Get all experts with filtering, sorting, and pagination
const getAllExperts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      expertise,
      sortBy = 'experience',
      sortOrder = 'desc',
      startDate,
      endDate
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Build where clause
    const where = {
      user: { role: 'EXPERT' }
    };
    if (search) {
      where.OR = [
        { headline: { contains: search, mode: 'insensitive' } },
        { summary: { contains: search, mode: 'insensitive' } },
        { about: { contains: search, mode: 'insensitive' } },
        { user: { name: { contains: search, mode: 'insensitive' } } }
      ];
    }
    if (expertise) {
      where.expertise = { hasSome: expertise.split(',') };
    }
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [experts, total] = await Promise.all([
      prisma.expertDetails.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
              bio: true,
              role: true,
              interests: true,
              tags: true,
              location: true,
              createdAt: true
            }
          },
          certifications: {
            select: {
              name: true,
              issuingOrganization: true,
              issueDate: true
            },
            orderBy: { issueDate: 'desc' },
            take: 3
          },
          experiences: {
            select: {
              title: true,
              company: true,
              startDate: true,
              endDate: true,
              isCurrent: true
            },
            orderBy: { startDate: 'desc' },
            take: 3
          }
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take
      }),
      prisma.expertDetails.count({ where })
    ]);

    res.json({
      status: 'success',
      data: {
        experts,
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
      'Failed to fetch experts',
      HttpStatus.INTERNAL_SERVER_ERROR,
      ErrorCodes.INTERNAL_ERROR
    );
  }
};

// Get expert by ID with detailed information
const getExpertById = async (req, res) => {
  try {
    const { id } = req.params;
    const expert = await prisma.expertDetails.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            bio: true,
            role: true,
            interests: true,
            tags: true,
            location: true,
            ratings: true,
            badges: true,
            progressLevel: true,
            progressShow: true,
            reviews: true,
            createdAt: true,
            _count: {
              select: {
                followers: true,
                following: true
              }
            }
          }
        },
        certifications: { orderBy: { issueDate: 'desc' } },
        experiences: { orderBy: { startDate: 'desc' } },
        awards: { orderBy: { date: 'desc' } },
        education: { orderBy: { startDate: 'desc' } }
      }
    });
    if (!expert) {
      throw new AppError(
        'Expert profile not found',
        HttpStatus.NOT_FOUND,
        ErrorCodes.NOT_FOUND
      );
    }
    // Transform the response to include follower and following counts
    const transformedExpert = {
      ...expert,
      user: {
        ...expert.user,
        followersCount: expert.user._count.followers,
        followingCount: expert.user._count.following
      }
    };
    delete transformedExpert.user._count;
    res.json({
      status: 'success',
      data: { expert: transformedExpert }
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      'Failed to fetch expert',
      HttpStatus.INTERNAL_SERVER_ERROR,
      ErrorCodes.INTERNAL_ERROR
    );
  }
};

// Update expert by ID (admin can update any expert)
const updateExpert = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      headline,
      summary,
      expertise,
      experience,
      hourlyRate,
      about,
      availability,
      languages,
      certifications,
      experiences,
      awards,
      education,
      sectionOperation = 'update'
    } = req.body;

    const expert = await prisma.expertDetails.findUnique({ where: { id } });
    if (!expert) {
      throw new AppError(
        'Expert profile not found',
        HttpStatus.NOT_FOUND,
        ErrorCodes.NOT_FOUND
      );
    }
    // Prepare the update data
    const updateData = {
      headline,
      summary,
      expertise,
      experience,
      hourlyRate,
      about,
      availability,
      languages
    };
    // Handle section updates based on operation type
    if (sectionOperation === 'add') {
      if (certifications) {
        updateData.certifications = {
          create: certifications.map(cert => ({
            name: cert.name,
            issuingOrganization: cert.issuingOrganization,
            issueDate: new Date(cert.issueDate),
            expiryDate: cert.expiryDate ? new Date(cert.expiryDate) : null,
            credentialId: cert.credentialId,
            credentialUrl: cert.credentialUrl
          }))
        };
      }
      if (experiences) {
        updateData.experiences = {
          create: experiences.map(exp => ({
            title: exp.title,
            company: exp.company,
            location: exp.location,
            startDate: new Date(exp.startDate),
            endDate: exp.endDate ? new Date(exp.endDate) : null,
            isCurrent: exp.isCurrent || false,
            description: exp.description,
            skills: exp.skills || []
          }))
        };
      }
      if (awards) {
        updateData.awards = {
          create: awards.map(award => ({
            title: award.title,
            issuer: award.issuer,
            date: new Date(award.date),
            description: award.description
          }))
        };
      }
      if (education) {
        updateData.education = {
          create: education.map(edu => ({
            school: edu.school,
            degree: edu.degree,
            fieldOfStudy: edu.fieldOfStudy,
            startDate: new Date(edu.startDate),
            endDate: edu.endDate ? new Date(edu.endDate) : null,
            isCurrent: edu.isCurrent || false,
            description: edu.description,
            grade: edu.grade,
            activities: edu.activities
          }))
        };
      }
    } else if (sectionOperation === 'update') {
      if (certifications) {
        updateData.certifications = {
          deleteMany: {},
          create: certifications.map(cert => ({
            name: cert.name,
            issuingOrganization: cert.issuingOrganization,
            issueDate: new Date(cert.issueDate),
            expiryDate: cert.expiryDate ? new Date(cert.expiryDate) : null,
            credentialId: cert.credentialId,
            credentialUrl: cert.credentialUrl
          }))
        };
      }
      if (experiences) {
        updateData.experiences = {
          deleteMany: {},
          create: experiences.map(exp => ({
            title: exp.title,
            company: exp.company,
            location: exp.location,
            startDate: new Date(exp.startDate),
            endDate: exp.endDate ? new Date(exp.endDate) : null,
            isCurrent: exp.isCurrent || false,
            description: exp.description,
            skills: exp.skills || []
          }))
        };
      }
      if (awards) {
        updateData.awards = {
          deleteMany: {},
          create: awards.map(award => ({
            title: award.title,
            issuer: award.issuer,
            date: new Date(award.date),
            description: award.description
          }))
        };
      }
      if (education) {
        updateData.education = {
          deleteMany: {},
          create: education.map(edu => ({
            school: edu.school,
            degree: edu.degree,
            fieldOfStudy: edu.fieldOfStudy,
            startDate: new Date(edu.startDate),
            endDate: edu.endDate ? new Date(edu.endDate) : null,
            isCurrent: edu.isCurrent || false,
            description: edu.description,
            grade: edu.grade,
            activities: edu.activities
          }))
        };
      }
    } else if (sectionOperation === 'delete') {
      if (certifications) {
        updateData.certifications = {
          deleteMany: {
            id: { in: certifications.map(c => c.id) }
          }
        };
      }
      if (experiences) {
        updateData.experiences = {
          deleteMany: {
            id: { in: experiences.map(e => e.id) }
          }
        };
      }
      if (awards) {
        updateData.awards = {
          deleteMany: {
            id: { in: awards.map(a => a.id) }
          }
        };
      }
      if (education) {
        updateData.education = {
          deleteMany: {
            id: { in: education.map(e => e.id) }
          }
        };
      }
    }
    const updatedExpert = await prisma.expertDetails.update({
      where: { id },
      data: updateData,
      include: {
        user: { select: { role: true } },
        certifications: true,
        experiences: true,
        awards: true,
        education: true
      }
    });
    // Ensure user role is EXPERT
    if (updatedExpert.user.role !== 'EXPERT') {
      await prisma.user.update({
        where: { id: updatedExpert.userId },
        data: { role: 'EXPERT' }
      });
    }
    res.json({
      status: 'success',
      data: { expert: updatedExpert }
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      'Failed to update expert',
      HttpStatus.INTERNAL_SERVER_ERROR,
      ErrorCodes.INTERNAL_ERROR
    );
  }
};

// Delete expert by ID (admin only)
const deleteExpert = async (req, res) => {
  try {
    const { id } = req.params;
    // Find expert details
    const expert = await prisma.expertDetails.findUnique({
      where: { id },
      include: { user: true }
    });
    if (!expert) {
      throw new AppError(
        'Expert profile not found',
        HttpStatus.NOT_FOUND,
        ErrorCodes.NOT_FOUND
      );
    }
    const userId = expert.userId;
    // Delete all related expert data and user
    await prisma.$transaction([
      // Delete expert sections
      prisma.certification.deleteMany({ where: { expertDetailsId: id } }),
      prisma.experience.deleteMany({ where: { expertDetailsId: id } }),
      prisma.award.deleteMany({ where: { expertDetailsId: id } }),
      prisma.education.deleteMany({ where: { expertDetailsId: id } }),
      // Delete expert details
      prisma.expertDetails.delete({ where: { id } }),
      // Delete user's posts
      prisma.post.deleteMany({ where: { authorId: userId } }),
      // Delete user's comments
      prisma.comment.deleteMany({ where: { authorId: userId } }),
      // Delete user's likes
      prisma.like.deleteMany({ where: { userId } }),
      // Delete user's follows
      prisma.follow.deleteMany({
        where: {
          OR: [
            { followerId: userId },
            { followingId: userId }
          ]
        }
      }),
      // Delete user
      prisma.user.delete({ where: { id: userId } })
    ]);
    res.json({
      status: 'success',
      message: 'Expert and all related data deleted successfully'
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      'Failed to delete expert',
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
  deletePost,
  // Expert management
  getAllExperts,
  getExpertById,
  updateExpert,
  deleteExpert
};
