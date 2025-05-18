const express = require('express');
const multer = require('multer');
const isAuthenticated = require('../middleware/auth');
const { queryHandler } = require('../middleware/queryHandler');
const postController = require('../controllers/postController');

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: './uploads',
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix + '.' + file.originalname.split('.').pop());
    }
  }),
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Not an image! Please upload an image.'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// List all posts with filters (public)
router.get('/', queryHandler, postController.listPosts);

// Create post (protected)
router.post('/', isAuthenticated, upload.single('image'), postController.createPost);

// Add tags to post (protected)
router.post('/:id/tags', isAuthenticated, postController.addTags);

// Get post by ID (public)
router.get('/:id', postController.getPost);

// Update post (protected)
router.patch('/:id', isAuthenticated, upload.single('image'), postController.updatePost);

// Delete post (protected)
router.delete('/:id', isAuthenticated, postController.deletePost);

module.exports = router;
