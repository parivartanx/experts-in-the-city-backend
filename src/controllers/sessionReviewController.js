const { PrismaClient } = require('@prisma/client');
const { formatPaginatedResponse } = require('../middleware/queryHandler');
const { catchAsync } = require('../middleware/errorHandler');

const prisma = new PrismaClient();

// Helper function to determine progress level based on reviews and ratings
const determineProgressLevel = (reviewCount, averageRating) => {
    if (reviewCount >= 100 && averageRating >= 4.8) {
        return 'PLATINUM';
    } else if (reviewCount >= 50 && averageRating >= 4.7) {
        return 'GOLD';
    } else if (reviewCount >= 10 && averageRating >= 4.5) {
        return 'SILVER';
    } else {
        return 'BRONZE';
    }
};

// Helper function to determine badges based on expert performance
const determineBadges = async (expertId, reviewCount, averageRating) => {
    // First get existing badges
    const expert = await prisma.expertDetails.findUnique({
        where: { id: expertId },
        select: { 
            badges: true,
            expertise: true
        }
    });

    // Convert existing badges to Set for easy manipulation
    const badges = new Set(expert.badges);

    // Top Rated Badge
    if (averageRating >= 4.8 && reviewCount >= 10) {
        badges.add('TOP_RATED');
    } else {
        badges.delete('TOP_RATED');
    }

    // Rising Expert Badge
    if (reviewCount >= 3 && reviewCount < 10) {
        badges.add('RISING_EXPERT');
    } else {
        badges.delete('RISING_EXPERT');
    }

    // In-Demand Badge (sessions in last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentSessions = await prisma.sessionReview.count({
        where: {
            expertId,
            createdAt: {
                gte: thirtyDaysAgo
            }
        }
    });

    if (recentSessions >= 10) {
        badges.add('IN_DEMAND');
    } else {
        badges.delete('IN_DEMAND');
    }

    // Elite Expert Badge
    if (reviewCount >= 100 && averageRating >= 4.8) {
        badges.add('ELITE_EXPERT');
    } else {
        badges.delete('ELITE_EXPERT');
    }

    // Versatile Pro Badge
    if (expert.expertise.length >= 3 && averageRating >= 4.5) {
        badges.add('VERSATILE_PRO');
    } else {
        badges.delete('VERSATILE_PRO');
    }

    // Preserve manually assigned badges
    const manualBadges = ['COMMUNITY_CONTRIBUTOR', 'SPECIALIST', 'MULTICITY_EXPERT', 'QUICK_RESPONDER'];
    manualBadges.forEach(badge => {
        if (expert.badges.includes(badge)) {
            badges.add(badge);
        }
    });

    return Array.from(badges);
};

// Helper function to update expert's average rating, progress level, and badges
const updateExpertRating = async (expertId) => {
    const reviews = await prisma.sessionReview.findMany({
        where: { expertId }
    });

    const reviewCount = reviews.length;
    const averageRating = reviewCount > 0
        ? reviews.reduce((acc, review) => acc + review.rating, 0) / reviewCount
        : 0;

    const progressLevel = determineProgressLevel(reviewCount, averageRating);
    const newBadges = await determineBadges(expertId, reviewCount, averageRating);

    // Get previous badges
    const expert = await prisma.expertDetails.findUnique({
        where: { id: expertId },
        select: { badges: true, userId: true }
    });
    const prevBadges = new Set(expert.badges);

    // Update expert details
    await prisma.expertDetails.update({
        where: { id: expertId },
        data: {
            ratings: parseFloat(averageRating.toFixed(1)),
            progressLevel,
            badges: newBadges
        }
    });

    // Notify expert for each new badge earned
    const earnedBadges = newBadges.filter(badge => !prevBadges.has(badge));
    for (const badge of earnedBadges) {
        await prisma.notification.create({
            data: {
                type: 'BADGE_EARNED',
                content: `Congratulations! You have earned the ${badge.replace(/_/g, ' ')} badge.`,
                recipientId: expert.userId,
                senderId: null
            }
        });
    }
};

const createReview = catchAsync(async (req, res) => {
    const { userId } = req.params;
    const { rating, satisfaction, remarks, sessionId } = req.body;
    const reviewerId = req.user.id;

    // Get expertDetails using userId to find expertId
    const expertDetails = await prisma.expertDetails.findUnique({
        where: { userId },
        select: { id: true }
    });

    if (!expertDetails) {
        throw { status: 404, message: 'Expert not found' };
    }
    const expertId = expertDetails.id;

    // Check if expert user exists
    const expert = await prisma.user.findUnique({
        where: { id: userId }
    });

    if (!expert) {
        throw { status: 404, message: 'Expert user not found' };
    }

    // Check if user has already reviewed this expert
    const existingReview = await prisma.sessionReview.findFirst({
        where: {
            reviewerId,
            expertId
        }
    });

    let review;
    if (existingReview) {
        // Update existing review
        review = await prisma.sessionReview.update({
            where: { id: existingReview.id },
            data: {
                sessionId,
                rating,
                satisfaction,
                remarks
            },
            include: {
                reviewer: {
                    select: {
                        id: true,
                        name: true,
                        avatar: true
                    }
                }
            }
        });
    } else {
        // Create new review
        review = await prisma.sessionReview.create({
            data: {
                sessionId,
                rating,
                satisfaction,
                remarks,
                reviewerId,
                expertId
            },
            include: {
                reviewer: {
                    select: {
                        id: true,
                        name: true,
                        avatar: true
                    }
                }
            }
        });
    }

    // Update expert's average rating, progress level, and badges
    await updateExpertRating(expertId);

    res.status(201).json({
        status: 'success',
        data: { review }
    });
});

const getExpertReviews = catchAsync(async (req, res) => {
    const { expertId } = req.params;
    const { skip, take, orderBy } = req.queryOptions;

    const where = {
        ...req.queryOptions.where,
        expertId
    };

    const total = await prisma.sessionReview.count({ where });

    const reviews = await prisma.sessionReview.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
            reviewer: {
                select: {
                    id: true,
                    name: true,
                    avatar: true
                }
            }
        }
    });

    // Get expert's current average rating, progress level, and badges
    const expert = await prisma.expertDetails.findUnique({
        where: { id: expertId },
        select: { 
            ratings: true,
            progressLevel: true,
            badges: true
        }
    });

    res.json(formatPaginatedResponse(
        { 
            reviews,
            averageRating: expert.ratings,
            progressLevel: expert.progressLevel,
            badges: expert.badges
        },
        total,
        req.queryOptions.page,
        req.queryOptions.limit
    ));
});

const getUserReviews = catchAsync(async (req, res) => {
    const userId = req.user.id;
    const { skip, take, orderBy } = req.queryOptions;

    const where = {
        ...req.queryOptions.where,
        reviewerId: userId
    };

    const total = await prisma.sessionReview.count({ where });

    const reviews = await prisma.sessionReview.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
            expert: {
                select: {
                    id: true,
                    headline: true,
                    ratings: true,
                    progressLevel: true,
                    badges: true,
                    user: {
                        select: {
                            id: true,
                            name: true,
                            avatar: true
                        }
                    }
                }
            }
        }
    });

    res.json(formatPaginatedResponse(
        { reviews },
        total,
        req.queryOptions.page,
        req.queryOptions.limit
    ));
});

const updateReview = catchAsync(async (req, res) => {
    const { id, userId } = req.params;
    const { rating, satisfaction, remarks } = req.body;
    const user_id = req.user.id;

    // Get expertDetails using userId to find expertId
    const expertDetails = await prisma.expertDetails.findUnique({
        where: { userId },
        select: { id: true }
    });

    if (!expertDetails) {
        throw { status: 404, message: 'Expert not found' };
    }
    const expertId = expertDetails.id;

    const existingReview = await prisma.sessionReview.findUnique({
        where: { id }
    });

    if (!existingReview) {
        throw { status: 404, message: 'Review not found' };
    }

    if (existingReview.reviewerId !== user_id) {
        throw { status: 403, message: 'You can only update your own reviews' };
    }

    const review = await prisma.sessionReview.update({
        where: { id },
        data: {
            rating,
            satisfaction,
            remarks
        },
        include: {
            reviewer: {
                select: {
                    id: true,
                    name: true,
                    avatar: true
                }
            }
        }
    });

    // Update expert's average rating, progress level, and badges
    await updateExpertRating(expertId);

    res.json({
        status: 'success',
        data: { review }
    });
});

const deleteReview = catchAsync(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    const existingReview = await prisma.sessionReview.findUnique({
        where: { id }
    });

    if (!existingReview) {
        throw { status: 404, message: 'Review not found' };
    }

    if (existingReview.reviewerId !== userId) {
        throw { status: 403, message: 'You can only delete your own reviews' };
    }

    await prisma.sessionReview.delete({
        where: { id }
    });

    // Update expert's average rating, progress level, and badges
    await updateExpertRating(existingReview.expertId);

    res.json({
        status: 'success',
        message: 'Review deleted successfully'
    });
});

module.exports = {
    createReview,
    getExpertReviews,
    getUserReviews,
    updateReview,
    deleteReview
}; 