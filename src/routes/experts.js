const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/authMiddleware');
const {
  createExpertProfile,
  getExpertProfile,
  listExperts,
  updateExpertProfile
} = require('../controllers/expertController');

// Public routes
router.get('/', listExperts);
router.get('/:id', getExpertProfile);

// Protected routes
router.use(isAuthenticated);
router.post('/profile', createExpertProfile);
router.patch('/profile', updateExpertProfile);

module.exports = router;
