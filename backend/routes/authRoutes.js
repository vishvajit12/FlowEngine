const express = require('express');
const { register, login, getMe } = require('../controllers/authController');
const protect = require('../middlewares/authMiddleware');
const { startOAuth, oauthCallback } = require('../controllers/oauthController');


const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.get('/oauth/:provider', startOAuth);
router.get('/oauth/:provider/callback', oauthCallback);
module.exports = router;
