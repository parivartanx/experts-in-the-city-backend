const { PrismaClient } = require('@prisma/client');
const { formatPaginatedResponse } = require('../middleware/queryHandler');
const { catchAsync } = require('../middleware/errorHandler');
const { AppError, ErrorCodes, HttpStatus } = require('../utils/errors');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

const createExpertProfile = catchAsync(async (req, res) => {
  // console.log('🔍 DEBUG - Request body:', req.body);
  // console.log('🔍 DEBUG - req.user:', req.user);
  // console.log('🔍 DEBUG - req.headers.authorization:', req.headers.authorization);
  
  let userId;
  let user;
  // Destructure only the fields needed for expert profile
  const {
    name, email, password, phone, bio, avatar, interests, tags, location,
    headline, summary, expertise, experience, hourlyRate, about, availability, languages,
    certifications, experiences, awards, education
  } = req.body;

  if (req.user) {
    // Authenticated user: use their ID, ignore name/email/password from body
    // console.log('🔍 DEBUG - Authenticated user flow');
    userId = req.user.id;
    user = req.user;
  } else if (email && password && name) {
    // Public registration: create user
    // console.log('🔍 DEBUG - Public registration flow');
    // Check if email already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new AppError('Email already in use', HttpStatus.BAD_REQUEST, ErrorCodes.DUPLICATE_EMAIL);
    }
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    // Create user
    user = await prisma.user.create({
      data: {
        name,
        email,
        phone,
        password: hashedPassword,
        bio,
        avatar,
        interests,
        tags,
        location,
        role: 'EXPERT'
      }
    });
    userId = user.id;
  } else {
    // Invalid request
    throw new AppError('Invalid request', HttpStatus.BAD_REQUEST, ErrorCodes.INVALID_INPUT);
  }

  // Check if expert profile already exists
  const existingProfile = await prisma.expertDetails.findUnique({
    where: { userId }
  });

  if (existingProfile) {
    // Update existing profile
    const updatedProfile = await prisma.expertDetails.update({
      where: { userId },
      data: {
        headline,
        summary,
        expertise,
        experience,
        hourlyRate,
        about,
        availability,
        languages,
        certifications: {
          create: certifications?.map(cert => ({
            name: cert.name,
            issuingOrganization: cert.issuingOrganization,
            issueDate: new Date(cert.issueDate),
            expiryDate: cert.expiryDate ? new Date(cert.expiryDate) : null,
            credentialId: cert.credentialId,
            credentialUrl: cert.credentialUrl
          }))
        },
        experiences: {
          create: experiences?.map(exp => ({
            title: exp.title,
            company: exp.company,
            location: exp.location,
            startDate: new Date(exp.startDate),
            endDate: exp.endDate ? new Date(exp.endDate) : null,
            isCurrent: exp.isCurrent || false,
            description: exp.description,
            skills: exp.skills || []
          }))
        },
        awards: {
          create: awards?.map(award => ({
            title: award.title,
            issuer: award.issuer,
            date: new Date(award.date),
            description: award.description
          }))
        },
        education: {
          create: education?.map(edu => ({
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
        }
      },
      include: {
        certifications: true,
        experiences: true,
        awards: true,
        education: true
      }
    });

    return res.json({
      status: 'success',
      data: { user, expert: updatedProfile }
    });
  }

  // Create new expert profile (and user if public registration)
  const expertProfile = await prisma.expertDetails.create({
    data: {
      userId,
      headline,
      summary,
      expertise,
      experience,
      hourlyRate,
      about,
      availability,
      languages,
      certifications: {
        create: certifications?.map(cert => ({
          name: cert.name,
          issuingOrganization: cert.issuingOrganization,
          issueDate: new Date(cert.issueDate),
          expiryDate: cert.expiryDate ? new Date(cert.expiryDate) : null,
          credentialId: cert.credentialId,
          credentialUrl: cert.credentialUrl
        }))
      },
      experiences: {
        create: experiences?.map(exp => ({
          title: exp.title,
          company: exp.company,
          location: exp.location,
          startDate: new Date(exp.startDate),
          endDate: exp.endDate ? new Date(exp.endDate) : null,
          isCurrent: exp.isCurrent || false,
          description: exp.description,
          skills: exp.skills || []
        }))
      },
      awards: {
        create: awards?.map(award => ({
          title: award.title,
          issuer: award.issuer,
          date: new Date(award.date),
          description: award.description
        }))
      },
      education: {
        create: education?.map(edu => ({
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
      }
    },
    include: {
      certifications: true,
      experiences: true,
      awards: true,
      education: true
    }
  });

  res.status(201).json({
    status: 'success',
    data: { user, expert: expertProfile }
  });
});

const getExpertProfile = catchAsync(async (req, res) => {
  const { id } = req.params;

  // First try to find by expertDetails id
  let expert = await prisma.expertDetails.findUnique({
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
          createdAt: true,
          _count: {
            select: {
              followers: true,
              following: true
            }
          }
        }
      },
      certifications: {
        orderBy: { issueDate: 'desc' }
      },
      experiences: {
        orderBy: { startDate: 'desc' }
      },
      awards: {
        orderBy: { date: 'desc' }
      },
      education: {
        orderBy: { startDate: 'desc' }
      }
    }
  });

  // If not found in expertDetails, try to find by user id
  if (!expert) {
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        expertDetails: {
          include: {
            certifications: {
              orderBy: { issueDate: 'desc' }
            },
            experiences: {
              orderBy: { startDate: 'desc' }
            },
            awards: {
              orderBy: { date: 'desc' }
            },
            education: {
              orderBy: { startDate: 'desc' }
            }
          }
        },
        _count: {
          select: {
            followers: true,
            following: true
          }
        }
      }
    });

    if (!user) {
      throw new AppError(
        'Profile not found',
        HttpStatus.NOT_FOUND,
        ErrorCodes.NOT_FOUND
      );
    }

    // If user is not an expert, return error
    if (user.role !== 'EXPERT') {
      throw new AppError(
        'User is not an expert',
        HttpStatus.BAD_REQUEST,
        ErrorCodes.INVALID_INPUT
      );
    }

    // If user doesn't have expert details, return error
    if (!user.expertDetails) {
      throw new AppError(
        'Expert profile not found',
        HttpStatus.NOT_FOUND,
        ErrorCodes.NOT_FOUND
      );
    }

    // Transform user-based result to match expert-based structure
    expert = {
      ...user.expertDetails,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        bio: user.bio,
        role: user.role,
        interests: user.interests,
        tags: user.tags,
        location: user.location,
        createdAt: user.createdAt,
        _count: user._count
      }
    };
  }

  // Transform the response to flatten the structure
  const transformedExpert = {
    ...expert.user,
    ...expert,
    followersCount: expert.user._count.followers,
    followingCount: expert.user._count.following
  };

  // Remove nested user object and _count
  delete transformedExpert.user;
  delete transformedExpert._count;

  res.json({
    status: 'success',
    data: transformedExpert
  });
});

const listExperts = catchAsync(async (req, res) => {
  const { expertise, search, availability, languages } = req.query;

  const where = {
    user: {
      role: 'EXPERT'
    }
  };
  
  // Filter by expertise if provided
  if (expertise) {
    where.expertise = {
      hasSome: expertise.split(',')
    };
  }

  // Filter by availability if provided
  if (availability) {
    where.availability = {
      contains: availability,
      mode: 'insensitive'
    };
  }

  // Filter by languages if provided
  if (languages) {
    where.languages = {
      hasSome: languages.split(',')
    };
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
        headline: {
          contains: search,
          mode: 'insensitive'
        }
      },
      {
        summary: {
          contains: search,
          mode: 'insensitive'
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
          interests: true,
          tags: true,
          location: true,
          createdAt: true,
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
  const { 
    headline,
    summary,
    expertise,
    experience,
    hourlyRate,
    about,
    availability,
    languages,
    // Section updates
    certifications,
    experiences,
    awards,
    education,
    // Operation type for sections (add/update/delete)
    sectionOperation = 'update' // 'add', 'update', or 'delete'
  } = req.body;

  const expert = await prisma.expertDetails.findUnique({
    where: { userId }
  });

  if (!expert) {
    throw new AppError(
      'Expert profile not found',
      HttpStatus.NOT_FOUND,
      ErrorCodes.NOT_FOUND
    );
  }

  if (expert.userId !== userId) {
    throw new AppError(
      'Not authorized to update this profile',
      HttpStatus.FORBIDDEN,
      ErrorCodes.FORBIDDEN
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
    // Add new items to existing sections
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
    // Update existing sections
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
    // Delete specified sections
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
    where: { userId },
    data: updateData,
    include: {
      user: {
        select: {
          role: true
        }
      },
      certifications: true,
      experiences: true,
      awards: true,
      education: true
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
