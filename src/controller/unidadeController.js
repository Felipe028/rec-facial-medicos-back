const unidadeDAO = require('../DAO/unidadeDAO')


async function getUnidade( req, res ) {
    
    return res.status(200).send({
        "status": "sucess",
        "dados": await unidadeDAO.getUnidades()
    })
}

async function getSetores( req, res ) {
    console.log(req.params.sigla_unidade)
    
    return res.status(200).send({
        "status": "sucesss",
        "dados": await unidadeDAO.getSetores(req.params.sigla_unidade)
    })
}


module.exports  = {
    getUnidade,
    getSetores
}

