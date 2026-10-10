const jwt = require('jsonwebtoken');
const config = require('../config/env');

module.exports = (userId) => jwt.sign({ userId }, config.jwt.secret, { expiresIn: config.jwt.expiresIn });