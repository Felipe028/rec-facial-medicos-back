const escalaDAO = require('../DAO/escalaDAO');


const setEscalas = async (req, res) => {
    const { id_setor, id_profissional, id_turno, data_inicio, data_fim } = req.body;

    if ( !id_setor || !id_profissional || !id_turno || !data_inicio || !data_fim ) {
        return res.status(404).send({
            status: 'false',
            msg: 'Faltam parametros',
        });
    }

    const retorno = await escalaDAO.setEscalas( id_setor, id_profissional, id_turno, data_inicio, data_fim );
    
    if(retorno.status){
        return res.status(200).send(retorno);
    }else{
        return res.status(500).send(retorno);
    }
};



const updateEscalas = async (req, res) => {
    const { id_setor, id_profissional, id_turno, data_inicio, data_fim } = req.body;

    if ( !id_setor || !id_profissional || !id_turno || !data_inicio || !data_fim ) {
        return res.status(404).send({
            status: 'false',
            msg: 'Faltam parametros',
        });
    }

    const retorno = await escalaDAO.updateEscalas(req.params.id, id_setor, id_profissional, id_turno, data_inicio, data_fim );
    
    if(retorno.status){
        return res.status(200).send(retorno);
    }else{
        return res.status(500).send(retorno);
    }
};



const getEscalas = async (req, res) => {

    const retorno = await escalaDAO.getEscalas();
    
    if(retorno.status){
        return res.status(200).send(retorno);
    }else{
        return res.status(500).send(retorno);
    }
};



const deleteEscalas = async (req, res) => {

    const retorno = await escalaDAO.deleteEscalas(req.params.id);
    
    if(retorno.status){
        return res.status(200).send(retorno);
    }else{
        return res.status(500).send(retorno);
    }
};



module.exports = {
    setEscalas,
    updateEscalas,
    getEscalas,
    deleteEscalas,
};
