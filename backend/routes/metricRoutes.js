const express = require('express');
const {
  getMetrics,
  getMetric,
  createMetric,
  updateMetric,
  deleteMetric,
  getMetricsByType,
  getMetricsStats,
  batchCreateMetrics
} = require('../controllers/metricController');

const router = express.Router();

const { protect } = require('../middleware/auth');

router.route('/')
  .get(protect, getMetrics)
  .post(protect, createMetric);

router.route('/batch')
  .post(protect, batchCreateMetrics);

router.route('/stats')
  .get(protect, getMetricsStats);

router.route('/type/:type')
  .get(protect, getMetricsByType);

router.route('/:id')
  .get(protect, getMetric)
  .put(protect, updateMetric)
  .delete(protect, deleteMetric);

module.exports = router;
