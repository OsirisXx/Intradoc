const express = require('express');
const router = express.Router();
const postsController = require('../controllers/posts.controller');
const { authenticate } = require('../middleware/auth');

// All post routes require authentication
router.use(authenticate);

// Post CRUD operations
router.get('/', postsController.getAllPosts);
router.get('/section/:sectionId', postsController.getPostsBySection);
router.post('/', postsController.createPost);
router.put('/:postId', postsController.updatePost);
router.delete('/:postId', postsController.deletePost);

module.exports = router;
