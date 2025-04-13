const express = require('express');
const {
  getGoals,
  getGoal,
  createGoal,
  updateGoal,
  deleteGoal,
  addCheckIn,
  getGoalStats
} = require('../controllers/goalController');

const router = express.Router();

const { protect } = require('../middleware/auth');

// Apply auth middleware to all routes
router.use(protect);

router.route('/')
  .get(getGoals)
  .post(createGoal);

router.route('/stats')
  .get(getGoalStats);

router.route('/:id')
  .get(getGoal)
  .put(updateGoal)
  .delete(deleteGoal);

router.route('/:id/checkin')
  .post(addCheckIn);

module.exports = router;
