const express = require('express');
const {
  getJournalEntries,
  getJournalEntry,
  createJournalEntry,
  updateJournalEntry,
  deleteJournalEntry,
  searchJournalEntries,
  getJournalInsights
} = require('../controllers/journalController');

const router = express.Router();

const { protect } = require('../middleware/auth');

// Apply auth middleware to all routes
router.use(protect);

router.route('/')
  .get(getJournalEntries)
  .post(createJournalEntry);

router.route('/search')
  .get(searchJournalEntries);

router.route('/insights')
  .get(getJournalInsights);

router.route('/:id')
  .get(getJournalEntry)
  .put(updateJournalEntry)
  .delete(deleteJournalEntry);

module.exports = router;
