const turnoDAO = require('../DAO/turnoDAO');


const setTurnos = async (req, res) => {
    const { nome_turno, entrada, saida } = req.body;

    if ( !nome_turno || !entrada || !saida ) {
        return res.status(404).send({
            status: 'false',
            msg: 'Faltam parametros',
        });
    }

    const retorno = await turnoDAO.setTurnos(nome_turno, entrada, saida);
    
    if(retorno.status){
        return res.status(200).send(retorno);
    }else{
        return res.status(500).send(retorno);
    }
};



const updateTurnos = async (req, res) => {
    const { nome_turno, entrada, saida } = req.body;

    if ( !nome_turno || !entrada || !saida ) {
        return res.status(404).send({
            status: 'false',
            msg: 'Faltam parametros',
        });
    }

    const retorno = await turnoDAO.updateTurnos(req.params.id, nome_turno, entrada, saida);
    
    if(retorno.status){
        return res.status(200).send(retorno);
    }else{
        return res.status(500).send(retorno);
    }
};



const getTurnos = async (req, res) => {

    const retorno = await turnoDAO.getTurnos();
    
    if(retorno.status){
        return res.status(200).send(retorno);
    }else{
        return res.status(500).send(retorno);
    }
};



const deleteTurno = async (req, res) => {

    const retorno = await turnoDAO.deleteTurno(req.params.id);
    
    if(retorno.status){
        return res.status(200).send(retorno);
    }else{
        return res.status(500).send(retorno);
    }
};



module.exports = {
    setTurnos,
    updateTurnos,
    getTurnos,
    deleteTurno,
};
