const express = require('express');
const { isAuthenticated } = require('../middleware/auth');
const sessionReviewController = require('../controllers/sessionReviewController');

const router = express.Router();

// All routes are protected
router.use(isAuthenticated);

// Create a review for an expert
router.post('/expert/:expertId', sessionReviewController.createReview);

// Get all reviews for an expert
router.get('/expert/:expertId', sessionReviewController.getExpertReviews);

// Get all reviews given by the current user
router.get('/user', sessionReviewController.getUserReviews);

// Update a review
router.patch('/:id', sessionReviewController.updateReview);

// Delete a review
router.delete('/:id', sessionReviewController.deleteReview);

module.exports = router; 