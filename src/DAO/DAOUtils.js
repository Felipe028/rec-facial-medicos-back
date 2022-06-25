//const sql = require('mssql')
const oracledb = require('oracledb')
const dotenv = require('dotenv')


dotenv.config()

// it's Connection on Benner - Mssql
/*const config = {
	user: process.env.BENNER_USER,
    password: process.env.BENNER_PASSWD,
    server: process.env.BENNER_SERVER,
    database: process.env.BENNER_DB,
    requestTimeout: 100000,
    pool: {
        max: 20,
        min: 5,
        idleTimeoutMillis: 60000
    }
}

const poolPromise = new sql.ConnectionPool(config)
  .connect()
  .then(pool => {
    console.log('Connected to MSSQL')
    return pool
  })
  .catch(err => console.log('Database Connection Failed! Bad Config: ', err))

// it's Conneting on Tasy - Oracle 
const tasyConfig = {
    user: process.env.TASY_USER,
    password: process.env.TASY_PASSWD,
    connectionString: `${process.env.TASY_SERVER}/${process.env.TASY_DB}`,
    poolMin: 5,
    poolMax: 10,
    poolPingInterval: 10,
    autoCommit: true
}

const poolPromiseOracle = oracledb.createPool(tasyConfig)
  .then(function (pool){
    console.log('Connected to Oracle')
    return pool
  })
  .catch(function (err){
    console.log('Oracle connection', err)
    return 
  })*/

const tasy1Config = {
    user: process.env.TASY_USER_1,
    password: process.env.TASY_PASSWORD_1,
    connectionString: `${process.env.TASY_SERVER}/${process.env.TASY_DB_1}`,
    poolMin: 5,
    poolMax: 10,
    poolPingInterval: 10,
    autoCommit: true
}
oracledb.queueTimeout = 30000;
const poolPromiseOracleTasy = oracledb.createPool(tasy1Config)
  .then((pool) => {
    console.log('Connected to Oracle (Tasy DB)')
    return pool
  })
  .catch((err) => {
    console.log('Oracle Connection', err)
    return
  })

/*module.exports = {
  sql, poolPromise, poolPromiseOracle, poolPromiseOracleTasy
}*/


module.exports = {
 poolPromiseOracleTasy
}