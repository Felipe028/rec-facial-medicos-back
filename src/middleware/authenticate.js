const dotenv = require('dotenv')
const jwt = require('jsonwebtoken')

dotenv.config()

async function authenticate(req, res, next) {
    const token = req.headers['token']
    const token_key = req.headers['token_key']

    if(token){
        jwt.verify(token, process.env.SECRET, function(err, decoded) {
            if(err){
                return res.status(500).send({ auth: false, message: 'Falha na autenticação do token.' })
            }else{
                next()
                return false
            }
        })
    }
    else if(token_key){
        jwt.verify(token_key, process.env.SECRET_KEY, function(err, decoded) {
            if(err){
                return res.status(500).send({ auth: false, message: 'Falha na autenticação do token.' })
            }else{
                next()
                return false
            }
        })
    }
    else{
        return res.status(500).send({ auth: false, message: 'Falha na autenticação do token.' })
    }

}

module.exports = {
    authenticate
}