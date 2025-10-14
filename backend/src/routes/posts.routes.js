const express = require('express');
const router = express.Router();
const postsController = require('../controllers/posts.controller');
const { authenticate } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

// Configure multer storage to keep original name suffix for readability
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads'),
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9_.-]/g, '_');
    cb(null, `${Date.now()}-${safeName}`);
  }
});
const upload = multer({ storage });

// All post routes require authentication
router.use(authenticate);

// Post CRUD operations
router.get('/', postsController.getAllPosts);
router.get('/section/:sectionId', postsController.getPostsBySection);
router.post('/', postsController.createPost);
router.post('/upload', upload.single('file'), postsController.uploadAttachment);
router.put('/:postId', postsController.updatePost);
router.delete('/:postId', postsController.deletePost);

module.exports = router;
