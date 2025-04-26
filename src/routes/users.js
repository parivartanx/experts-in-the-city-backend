const express = require('express');
const auth = require('../middleware/auth');
const userController = require('../controllers/userController');

const router = express.Router();

// Auth routes
router.post('/register', userController.register);
router.post('/login', userController.login);

// Profile routes (protected)
router.get('/me', auth, userController.getProfile);
router.patch('/me', auth, userController.updateProfile);

module.exports = router;
