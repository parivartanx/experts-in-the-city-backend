const { PrismaClient } = require('@prisma/client');
const { formatPaginatedResponse } = require('../middleware/queryHandler');
const { catchAsync } = require('../middleware/errorHandler');

const prisma = new PrismaClient();

const createComment = catchAsync(async (req, res) => {
    const { id: postId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    // Create comment in a transaction to update post analytics
    const comment = await prisma.$transaction(async (prisma) => {
      const comment = await prisma.comment.create({
        data: {
          content,
          postId,
          authorId: userId
        },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              avatar: true
            }
          }
        }
      });

      return comment;
    });

    res.status(201).json({
      status: 'success',
      data: { comment }
    });
});

const getComments = catchAsync(async (req, res) => {
    const { id: postId } = req.params;
    const { skip, take, orderBy } = req.queryOptions;

    // Merge custom filters with queryOptions.where
    let where = { 
      ...req.queryOptions.where,
      postId,
      parentId: null // Only get top-level comments
    };

    // Get total count for pagination
    const total = await prisma.comment.count({ where });

    // Get all top-level comments (no parent) with their replies
    const comments = await prisma.comment.findMany({
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
        replies: {
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
            createdAt: 'asc'
          }
        },
        _count: {
          select: {
            replies: true
          }
        }
      }
    });

    // Add reply count to each comment
    const commentsWithCounts = comments.map(comment => ({
      ...comment,
      replyCount: comment._count.replies
    }));

    res.json(formatPaginatedResponse(
      { comments: commentsWithCounts },
      total,
      req.queryOptions.page,
      req.queryOptions.limit
    ));
});

const replyToComment = catchAsync(async (req, res) => {
    const { id: parentCommentId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    // First get the parent comment to get the postId
    const parentComment = await prisma.comment.findUnique({
      where: { id: parentCommentId }
    });

    if (!parentComment) {
      throw { status: 404, message: 'Parent comment not found' };
    }

    // Create reply in a transaction
    const reply = await prisma.$transaction(async (prisma) => {
      const reply = await prisma.comment.create({
        data: {
          content,
          postId: parentComment.postId,
          authorId: userId,
          parentId: parentCommentId
        },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              avatar: true
            }
          }
        }
      });

      return reply;
    });

    res.status(201).json({
      status: 'success',
      data: { reply }
    });
});

const deleteComment = catchAsync(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    const comment = await prisma.comment.findUnique({
      where: { id }
    });

    if (!comment) {
      throw { status: 404, message: 'Comment not found' };
    }

    if (comment.authorId !== userId) {
      throw { status: 403, message: 'Not authorized to delete this comment' };
    }

    // Delete comment and its replies in a transaction
    await prisma.$transaction(async (prisma) => {
      // First delete all replies
      await prisma.comment.deleteMany({
        where: { parentId: id }
      });

      // Then delete the comment itself
      await prisma.comment.delete({
        where: { id }
      });
    });

    res.json({
      status: 'success',
      message: 'Comment deleted successfully'
    });
});

module.exports = {
  createComment,
  getComments,
  replyToComment,
  deleteComment
};
