const mysql = require ("mysql2/promise");

class Mysql {
  static pool = null;
  static setupConnection(){
    this.pool = mysql.createPool({
      host: 'localhost',
      user: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME
    });
  }
}

module.exports = Mysql;
