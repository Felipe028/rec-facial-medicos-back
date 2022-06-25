const usuarioDAO = require('../DAO/usuarioDAO');

const login = async (req, res) => {
    const { cpf } = req.body;

    if (!cpf) {
        return res.status(404).send({
            status: 'false',
            msg: 'Faltam parametros',
        });
    }

    const retorno = await usuarioDAO.login(cpf);
    
    if(retorno.status){
        return res.status(200).send(retorno);
    }else{
        return res.status(500).send(retorno);
    }
};



const getSetores = async (req, res) => {

    const retorno = await usuarioDAO.getSetores();
    
    if(retorno.status){
        return res.status(200).send(retorno);
    }else{
        return res.status(500).send(retorno);
    }
};



const getTurnos = async (req, res) => {

    const retorno = await usuarioDAO.getTurnos();
    
    if(retorno.status){
        return res.status(200).send(retorno);
    }else{
        return res.status(500).send(retorno);
    }
};



const registrarPonto = async (req, res) => {
    const { cod, id_setor, id_turno, latitude, longitude, cpf } = req.body;

    if ( !cod || !id_setor || !id_turno || !latitude || !longitude || !cpf) {
        return res.status(404).send({
            status: 'false',
            msg: 'Faltam parametros',
        });
    }

    const retorno = await usuarioDAO.registrarPonto(cod, id_setor, id_turno, latitude, longitude, cpf);
    
    if(retorno.status){
        return res.status(200).send(retorno);
    }else{
        return res.status(500).send(retorno);
    }
};





module.exports = {
    login,
    getSetores,
    getTurnos,
    registrarPonto,
};
