const { PrismaClient } = require('@prisma/client');
const { formatPaginatedResponse } = require('../middleware/queryHandler');
const { catchAsync } = require('../middleware/errorHandler');

const prisma = new PrismaClient();

const createComment = catchAsync(async (req, res) => {
    const { postId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    if (!postId) {
      throw { status: 400, message: 'Post ID is required' };
    }

    // Validate content
    if (!content || content.trim().length === 0) {
      throw { status: 400, message: 'Comment content is required' };
    }

    // Check if post exists
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { authorId: true }
    });

    if (!post) {
      throw { status: 404, message: 'Post not found' };
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true }
    });

    if (!user) {
      throw { status: 404, message: 'User not found' };
    }

    const comment = await prisma.comment.create({
      data: {
        content: content.trim(),
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

    // Notify post author if not self-comment
    if (post.authorId !== userId) {
      await prisma.notification.create({
        data: {
          type: 'COMMENT',
          content: `${user.name} commented on your post`,
          recipientId: post.authorId,
          senderId: userId
        }
      });
    }

    res.status(201).json({
      status: 'success',
      data: { comment }
    });
});

const getComments = catchAsync(async (req, res) => {
    console.log(req.params)
    const { postId } = req.params;
    const { skip, take, orderBy } = req.queryOptions;

    if (!postId) {
      throw { status: 400, message: 'Post ID is required' };
    }

    // Check if post exists
    const post = await prisma.post.findUnique({
      where: { id: postId }
    });

    if (!post) {
      throw { status: 404, message: 'Post not found' };
    }

    const where = { 
      ...req.queryOptions.where,
      postId
    };

    const total = await prisma.comment.count({ where });

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
        }
      }
    });

    res.json(formatPaginatedResponse(
      { comments },
      total,
      req.queryOptions.page,
      req.queryOptions.limit
    ));
});

const createReply = catchAsync(async (req, res) => {
    const { commentId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    // Validate content
    if (!content || content.trim().length === 0) {
      throw { status: 400, message: 'Reply content is required' };
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw { status: 404, message: 'User not found' };
    }

    // First get the parent comment to get the postId
    const parentComment = await prisma.comment.findUnique({
      where: { id: commentId }
    });

    if (!parentComment) {
      throw { status: 404, message: 'Parent comment not found' };
    }

    const reply = await prisma.reply.create({
      data: {
        content: content.trim(),
        commentId,
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

    res.status(201).json({
      status: 'success',
      data: { reply }
    });
});

const getReplies = catchAsync(async (req, res) => {
    const { commentId } = req.params;
    const { skip, take, orderBy } = req.queryOptions;

    // Check if parent comment exists
    const parentComment = await prisma.comment.findUnique({
      where: { id: commentId }
    });

    if (!parentComment) {
      throw { status: 404, message: 'Parent comment not found' };
    }

    const where = { 
      ...req.queryOptions.where,
      commentId
    };

    const total = await prisma.reply.count({ where });

    const replies = await prisma.reply.findMany({
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
        }
      }
    });

    res.json(formatPaginatedResponse(
      { replies },
      total,
      req.queryOptions.page,
      req.queryOptions.limit
    ));
});

const deleteComment = catchAsync(async (req, res) => {
    const { commentId } = req.params;
    const userId = req.user.id;

    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        replies: true
      }
    });

    if (!comment) {
      throw { status: 404, message: 'Comment not found' };
    }

    if (comment.authorId !== userId) {
      throw { status: 403, message: 'Not authorized to delete this comment' };
    }

    // Delete comment and its replies in a transaction
    await prisma.$transaction(async (tx) => {
      // First delete all replies
      await tx.reply.deleteMany({
        where: { commentId }
      });

      // Then delete the comment itself
      await tx.comment.delete({
        where: { id: commentId }
      });
    });

    res.json({
      status: 'success',
      message: 'Comment and its replies deleted successfully'
    });
});

const deleteReply = catchAsync(async (req, res) => {
    const { replyId: id } = req.params;
    const userId = req.user.id;

    const reply = await prisma.reply.findUnique({
      where: { id }
    });

    if (!reply) {
      throw { status: 404, message: 'Reply not found' };
    }

    if (reply.authorId !== userId) {
      throw { status: 403, message: 'Not authorized to delete this reply' };
    }

    await prisma.reply.delete({
      where: { id }
    });

    res.json({
      status: 'success',
      message: 'Reply deleted successfully'
    });
});

const updateComment = catchAsync(async (req, res) => {
    const { commentId: id } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    // Validate content
    if (!content || content.trim().length === 0) {
      throw { status: 400, message: 'Comment content is required' };
    }

    const existingComment = await prisma.comment.findUnique({
      where: { id },
      select: { authorId: true }
    });

    if (!existingComment) {
      throw { status: 404, message: 'Comment not found' };
    }

    if (existingComment.authorId !== userId) {
      throw { status: 403, message: 'You can only update your own comments' };
    }

    const comment = await prisma.comment.update({
      where: { id },
      data: { content: content.trim() },
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

    res.json({
      status: 'success',
      data: { comment }
    });
});

const updateReply = catchAsync(async (req, res) => {
    const { replyId: id } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    // Validate content
    if (!content || content.trim().length === 0) {
      throw { status: 400, message: 'Reply content is required' };
    }

    const existingReply = await prisma.reply.findUnique({
      where: { id },
      select: { authorId: true }
    });

    if (!existingReply) {
      throw { status: 404, message: 'Reply not found' };
    }

    if (existingReply.authorId !== userId) {
      throw { status: 403, message: 'You can only update your own replies' };
    }

    const reply = await prisma.reply.update({
      where: { id },
      data: { content: content.trim() },
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

    res.json({
      status: 'success',
      data: { reply }
    });
});

module.exports = {
  createComment,
  getComments,
  createReply,
  getReplies,
  deleteComment,
  deleteReply,
  updateComment,
  updateReply
};
