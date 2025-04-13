const express = require('express');
const {
  getSymptoms,
  getSymptom,
  createSymptom,
  updateSymptom,
  deleteSymptom,
  getSymptomsByBodyPart,
  getSymptomFrequency,
  getSymptomCorrelations
} = require('../controllers/symptomController');

const router = express.Router();

const { protect } = require('../middleware/auth');

router.use(protect);

router.route('/')
  .get(getSymptoms)
  .post(createSymptom);

router.route('/bodypart/:bodyPart')
  .get(getSymptomsByBodyPart);

router.route('/frequency')
  .get(getSymptomFrequency);

router.route('/correlations')
  .get(getSymptomCorrelations);

router.route('/:id')
  .get(getSymptom)
  .put(updateSymptom)
  .delete(deleteSymptom);

module.exports = router;
