const express = require('express');
const isAuthenticated = require('../middleware/auth');
const adminMiddleware = require('../middleware/adminMiddleware');
const reportController = require('../controllers/reportController');

const router = express.Router();

// User: Get all reports made by or against a user
router.get('/user/:userId', isAuthenticated, reportController.getReportsByUserId);

// Admin: Get all reports (with pagination, filters, search)
router.get('/admin', isAuthenticated, adminMiddleware, reportController.adminGetAllReports);

// Admin: Get a single report by ID
router.get('/admin/:id', isAuthenticated, adminMiddleware, reportController.adminGetReportById);

// Admin: Update a report (status or details)
router.patch('/admin/:id', isAuthenticated, adminMiddleware, reportController.adminUpdateReport);

// Admin: Delete a report
router.delete('/admin/:id', isAuthenticated, adminMiddleware, reportController.adminDeleteReport);

module.exports = router; 