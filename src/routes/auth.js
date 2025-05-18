const express = require('express');
const authController = require('../controllers/authController');

const router = express.Router();

// Auth routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/google', authController.googleSignIn);
router.post('/refresh-token', authController.refreshToken);

module.exports = router; 