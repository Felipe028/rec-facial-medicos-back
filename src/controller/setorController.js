const setorDAO = require('../DAO/setorDAO');

const setSetor = async (req, res) => {
    const { nome_setor, sigla_setor } = req.body;

    if ( !nome_setor || !sigla_setor ) {
        return res.status(404).send({
            status: 'false',
            msg: 'Faltam parametros',
        });
    }

    const retorno = await setorDAO.setSetor(nome_setor, sigla_setor);
    
    if(retorno.status){
        return res.status(200).send(retorno);
    }else{
        return res.status(500).send(retorno);
    }
};



const updateSetor = async (req, res) => {
    const { nome_setor, sigla_setor } = req.body;

    if ( !nome_setor || !sigla_setor ) {
        return res.status(404).send({
            status: 'false',
            msg: 'Faltam parametros',
        });
    }

    const retorno = await setorDAO.updateSetor(req.params.id, nome_setor, sigla_setor);
    
    if(retorno.status){
        return res.status(200).send(retorno);
    }else{
        return res.status(500).send(retorno);
    }
};



const getSetores = async (req, res) => {

    const retorno = await setorDAO.getSetores();
    
    if(retorno.status){
        return res.status(200).send(retorno);
    }else{
        return res.status(500).send(retorno);
    }
};



const deleteSetor = async (req, res) => {

    const retorno = await setorDAO.deleteSetor(req.params.id);
    
    if(retorno.status){
        return res.status(200).send(retorno);
    }else{
        return res.status(500).send(retorno);
    }
};



module.exports = {
    setSetor,
    updateSetor,
    getSetores,
    deleteSetor,
};
