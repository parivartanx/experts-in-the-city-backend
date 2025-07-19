const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth');
const {
  createExpertProfile,
  getExpertProfile,
  listExperts,
  updateExpertProfile
} = require('../controllers/expertController');

// Create/Update expert profile
router.post('/become-expert', createExpertProfile);

// Get expert profile
router.get('/:id', getExpertProfile);

// List experts with filters
router.get('/', listExperts);

// Update expert profile
router.patch('/profile', isAuthenticated, updateExpertProfile);

module.exports = router;
