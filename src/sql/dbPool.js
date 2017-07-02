const config = require('./../../config.json');
const mysql = require('async-mysql');

module.exports = new mysql.Pool(config.mysqlConfig);