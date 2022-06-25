const dotenv = require('dotenv')
const jwt = require('jsonwebtoken')

dotenv.config()

async function authenticate(req, res, next) {
    const token = req.headers['token']
        jwt.verify(token, process.env.SECRET, function(err, decoded) {
            if (err) return res.status(500).send({ auth: false, message: 'Falha na autenticação do token.' })
        })
        next()
        return false 
}

module.exports = {
    authenticate
}