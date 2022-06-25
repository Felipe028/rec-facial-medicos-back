const jwt = require('jsonwebtoken')


async function getIdToken(inToken){
	const token = inToken
	return jwt.verify(token, process.env.SECRET, function(err, decoded) {
            if (err) 
            	return
            else
            	return decoded
        })
}


module.exports = {
	getIdToken
}