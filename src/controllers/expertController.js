const { PrismaClient } = require('@prisma/client');
const { formatPaginatedResponse } = require('../middleware/queryHandler');
const { catchAsync } = require('../middleware/errorHandler');

const prisma = new PrismaClient();

const createExpertProfile = catchAsync(async (req, res) => {
  const { expertise, experience, hourlyRate, about } = req.body;
  const userId = req.user.id;

  // Check if expert profile already exists
  const existingProfile = await prisma.expertDetails.findUnique({
    where: { userId }
  });

  if (existingProfile) {
    // Update existing profile
    const updatedProfile = await prisma.expertDetails.update({
      where: { userId },
      data: {
        expertise,
        experience,
        hourlyRate,
        about
      }
    });

    return res.json({
      status: 'success',
      data: { expert: updatedProfile }
    });
  }

  // Create new profile and update user role
  const [expertProfile] = await prisma.$transaction([
    prisma.expertDetails.create({
      data: {
        userId,
        expertise,
        experience,
        hourlyRate,
        about
      }
    }),
    prisma.user.update({
      where: { id: userId },
      data: { role: 'EXPERT' }
    })
  ]);

  res.status(201).json({
    status: 'success',
    data: { expert: expertProfile }
  });
});


const getExpertProfile = catchAsync(async (req, res) => {
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
          createdAt: true,
          _count: {
            select: {
              followers: true,
              following: true
            }
          }
        }
      }
    }
  });

  if (!expert) {
    throw { status: 404, message: 'Expert profile not found' };
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

  // Remove the _count field from the response
  delete transformedExpert.user._count;

  res.json({
    status: 'success',
    data: { expert: transformedExpert }
  });
});

const listExperts = catchAsync(async (req, res) => {
  const { expertise, search } = req.query;

  const where = {};
  
  // Filter by expertise if provided
  if (expertise) {
    where.role = 'EXPERT';
  }

  // Add search filter if provided
  if (search) {
    where.OR = [
      {
        user: {
          name: {
            contains: search,
            mode: 'insensitive'
          }
        }
      },
      {
        about: {
          contains: search,
          mode: 'insensitive'
        }
      }
    ];
  }

  const experts = await prisma.expertDetails.findMany({
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
          createdAt: true,
        }
      }
    },
    orderBy: {
      experience: 'desc'
    }
  });

  res.json({
    status: 'success',
    data: { experts }
  });
});

const updateExpertProfile = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const { expertise, experience, hourlyRate, about } = req.body;

  const expert = await prisma.expertDetails.findUnique({
    where: { userId }
  });

  if (!expert) {
    throw { status: 404, message: 'Expert profile not found' };
  }

  if (expert.userId !== userId) {
    throw { status: 403, message: 'Not authorized to update this profile' };
  }

  const updatedExpert = await prisma.expertDetails.update({
    where: { userId },
    data: {
      expertise,
      experience,
      hourlyRate,
      about
    },
    include: {
      user: {
        select: {
          role: true
        }
      }
    }
  });

  // Ensure user role is EXPERT
  if (updatedExpert.user.role !== 'EXPERT') {
    await prisma.user.update({
      where: { id: userId },
      data: { role: 'EXPERT' }
    });
  }

  res.json({
    status: 'success',
    data: { expert: updatedExpert }
  });
});

module.exports = {
  createExpertProfile,
  getExpertProfile,
  listExperts,
  updateExpertProfile
};
