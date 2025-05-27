const express = require('express');
const router = express.Router();
const isAuthenticated = require('../middleware/auth');
const { getUploadUrls } = require('../controllers/uploadController');

// Get presigned URL(s) for file upload(s)
// Supports both single file (via query params) and bulk upload (via request body)
router.post('/presigned-url', isAuthenticated, getUploadUrls);

module.exports = router; 