const express = require('express');
const router = express.Router();
const {
  createCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
  createSubcategory,
  getAllSubcategories,
  getSubcategoryById,
  updateSubcategory,
  deleteSubcategory
} = require('../controllers/categoryController');

// Category routes
router.post('/categories', createCategory);
router.get('/categories', getAllCategories);
router.get('/categories/:id', getCategoryById);
router.put('/categories/:id', updateCategory);
router.delete('/categories/:id', deleteCategory);

// Subcategory routes
router.post('/subcategories', createSubcategory);
router.get('/subcategories', getAllSubcategories);
router.get('/subcategories/:id', getSubcategoryById);
router.put('/subcategories/:id', updateSubcategory);
router.delete('/subcategories/:id', deleteSubcategory);

module.exports = router; 