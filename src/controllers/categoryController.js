const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Category Controllers
const createCategory = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    const existingCategory = await prisma.category.findUnique({
      where: { name }
    });

    if (existingCategory) {
      return res.status(400).json({ error: 'Category with this name already exists' });
    }

    const category = await prisma.category.create({
      data: { name },
      include: {
        subcategories: true
      }
    });

    res.status(201).json({
      success: true,
      data: category
    });
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getAllCategories = async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      include: {
        subcategories: true
      },
      orderBy: {
        name: 'asc'
      }
    });

    res.status(200).json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        subcategories: true
      }
    });

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.status(200).json({
      success: true,
      data: category
    });
  } catch (error) {
    console.error('Error fetching category:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    // Check if category exists
    const existingCategory = await prisma.category.findUnique({
      where: { id }
    });

    if (!existingCategory) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Check if new name already exists (excluding current category)
    const nameExists = await prisma.category.findFirst({
      where: {
        name,
        id: { not: id }
      }
    });

    if (nameExists) {
      return res.status(400).json({ error: 'Category with this name already exists' });
    }

    const updatedCategory = await prisma.category.update({
      where: { id },
      data: { name },
      include: {
        subcategories: true
      }
    });

    res.status(200).json({
      success: true,
      data: updatedCategory
    });
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if category exists
    const existingCategory = await prisma.category.findUnique({
      where: { id },
      include: {
        subcategories: true
      }
    });

    if (!existingCategory) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Check if category has subcategories
    if (existingCategory.subcategories.length > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete category with existing subcategories. Please delete subcategories first.' 
      });
    }

    await prisma.category.delete({
      where: { id }
    });

    res.status(200).json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Subcategory Controllers
const createSubcategory = async (req, res) => {
  try {
    const { name, categoryId } = req.body;

    if (!name || !categoryId) {
      return res.status(400).json({ error: 'Subcategory name and category ID are required' });
    }

    // Check if category exists
    const category = await prisma.category.findUnique({
      where: { id: categoryId }
    });

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Check if subcategory name already exists in this category
    const existingSubcategory = await prisma.subcategory.findFirst({
      where: {
        name,
        categoryId
      }
    });

    if (existingSubcategory) {
      return res.status(400).json({ error: 'Subcategory with this name already exists in this category' });
    }

    const subcategory = await prisma.subcategory.create({
      data: { name, categoryId },
      include: {
        category: true
      }
    });

    res.status(201).json({
      success: true,
      data: subcategory
    });
  } catch (error) {
    console.error('Error creating subcategory:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getAllSubcategories = async (req, res) => {
  try {
    const { categoryId } = req.query;

    const where = {};
    if (categoryId) {
      where.categoryId = categoryId;
    }

    const subcategories = await prisma.subcategory.findMany({
      where,
      include: {
        category: true
      },
      orderBy: {
        name: 'asc'
      }
    });

    res.status(200).json({
      success: true,
      data: subcategories
    });
  } catch (error) {
    console.error('Error fetching subcategories:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getSubcategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    const subcategory = await prisma.subcategory.findUnique({
      where: { id },
      include: {
        category: true
      }
    });

    if (!subcategory) {
      return res.status(404).json({ error: 'Subcategory not found' });
    }

    res.status(200).json({
      success: true,
      data: subcategory
    });
  } catch (error) {
    console.error('Error fetching subcategory:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const updateSubcategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, categoryId } = req.body;

    if (!name || !categoryId) {
      return res.status(400).json({ error: 'Subcategory name and category ID are required' });
    }

    // Check if subcategory exists
    const existingSubcategory = await prisma.subcategory.findUnique({
      where: { id }
    });

    if (!existingSubcategory) {
      return res.status(404).json({ error: 'Subcategory not found' });
    }

    // Check if category exists
    const category = await prisma.category.findUnique({
      where: { id: categoryId }
    });

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Check if new name already exists in this category (excluding current subcategory)
    const nameExists = await prisma.subcategory.findFirst({
      where: {
        name,
        categoryId,
        id: { not: id }
      }
    });

    if (nameExists) {
      return res.status(400).json({ error: 'Subcategory with this name already exists in this category' });
    }

    const updatedSubcategory = await prisma.subcategory.update({
      where: { id },
      data: { name, categoryId },
      include: {
        category: true
      }
    });

    res.status(200).json({
      success: true,
      data: updatedSubcategory
    });
  } catch (error) {
    console.error('Error updating subcategory:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const deleteSubcategory = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if subcategory exists
    const existingSubcategory = await prisma.subcategory.findUnique({
      where: { id }
    });

    if (!existingSubcategory) {
      return res.status(404).json({ error: 'Subcategory not found' });
    }

    await prisma.subcategory.delete({
      where: { id }
    });

    res.status(200).json({
      success: true,
      message: 'Subcategory deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting subcategory:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  // Category controllers
  createCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
  
  // Subcategory controllers
  createSubcategory,
  getAllSubcategories,
  getSubcategoryById,
  updateSubcategory,
  deleteSubcategory
}; 