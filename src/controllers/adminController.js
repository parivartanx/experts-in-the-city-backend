const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get all users with admin status
const getAllUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      include: {
        Admin: true,
        _count: {
          select: {
            posts: true,
            followers: true,
            following: true
          }
        }
      }
    });

    const formattedUsers = users.map(user => ({
      id: user.id,
      email: user.email,
      name: user.name,
      bio: user.bio,
      avatar: user.avatar,
      isAdmin: !!user.Admin,
      createdAt: user.createdAt,
      stats: user._count
    }));

    res.json(formattedUsers);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

// Get user statistics
const getUserStats = async (req, res) => {
  try {
    const stats = await prisma.$transaction([
      prisma.user.count(),
      prisma.admin.count(),
      prisma.post.count(),
      prisma.comment.count(),
      prisma.expertDetails.count()
    ]);

    res.json({
      totalUsers: stats[0],
      totalAdmins: stats[1],
      totalPosts: stats[2],
      totalComments: stats[3],
      totalExperts: stats[4]
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
};



// Delete user
const deleteUser = async (req, res) => {
  const { userId } = req.params;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { Admin: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.Admin) {
      const adminCount = await prisma.admin.count();
      if (adminCount <= 1) {
        return res.status(400).json({ error: 'Cannot delete the last admin' });
      }
    }

    await prisma.$transaction([
      // Delete admin record if exists
      user.Admin 
        ? prisma.admin.delete({ where: { userId } })
        : prisma.$queryRaw`SELECT 1`,
      // Delete user and all related records
      prisma.user.delete({ where: { id: userId } })
    ]);

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
};

module.exports = {
  getAllUsers,
  getUserStats,
  deleteUser
};
