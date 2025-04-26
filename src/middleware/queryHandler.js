/**
 * Middleware to handle pagination, sorting, and filtering
 * Query parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 10)
 * - sort: Sort field (e.g., 'createdAt:desc')
 * - filter: JSON string of filter conditions
 */
const queryHandler = (req, res, next) => {
  try {
    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Sorting
    let orderBy = {};
    if (req.query.sort) {
      const [field, order] = req.query.sort.split(':');
      orderBy[field] = order.toLowerCase() === 'desc' ? 'desc' : 'asc';
    } else {
      // Default sort by createdAt desc
      orderBy = { createdAt: 'desc' };
    }

    // Filtering
    let where = {};
    if (req.query.filter) {
      try {
        const filterObj = JSON.parse(req.query.filter);
        
        // Convert simple filter conditions to Prisma format
        Object.entries(filterObj).forEach(([key, value]) => {
          if (typeof value === 'string') {
            // Handle string contains
            where[key] = { contains: value, mode: 'insensitive' };
          } else if (Array.isArray(value)) {
            // Handle array of values (in)
            where[key] = { in: value };
          } else if (typeof value === 'object') {
            // Handle range queries
            where[key] = {};
            if (value.gt) where[key].gt = value.gt;
            if (value.gte) where[key].gte = value.gte;
            if (value.lt) where[key].lt = value.lt;
            if (value.lte) where[key].lte = value.lte;
            if (value.equals) where[key].equals = value.equals;
          } else {
            // Handle exact match
            where[key] = value;
          }
        });
      } catch (error) {
        console.error('Filter parsing error:', error);
      }
    }

    // Attach to request object
    req.queryOptions = {
      skip,
      take: limit,
      orderBy,
      where,
      page,
      limit
    };

    next();
  } catch (error) {
    console.error('Query handler error:', error);
    next();
  }
};

/**
 * Helper function to format paginated response
 */
const formatPaginatedResponse = (data, total, page, limit) => {
  const totalPages = Math.ceil(total / limit);
  
  return {
    status: 'success',
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    }
  };
};

module.exports = {
  queryHandler,
  formatPaginatedResponse
};
