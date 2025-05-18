const express = require('express');
const router = express.Router();
const isAuthenticated = require('../middleware/auth');
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
router.post('/profile', isAuthenticated, createExpertProfile);
router.patch('/profile', isAuthenticated, updateExpertProfile);

module.exports = router;
