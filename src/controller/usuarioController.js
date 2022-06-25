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

    //verificar quantas batidas o usuario realizou no dia/setor/turno
    var verificarSeusuarioBateuPonto = await usuarioDAO.verificarSeusuarioBateuPonto(id_setor, id_turno, cod);
    if(verificarSeusuarioBateuPonto == 1){// realizar batida
        const retorno = await usuarioDAO.registrarPonto(cod, id_setor, id_turno, latitude, longitude, cpf);
        if(retorno.status){
            return res.status(200).send(retorno);
        }else{
            return res.status(500).send(retorno);
        }
    }else{
        //verificar quantas vagas tem p esse turno/setor
        var vagasTurnoSetor = await usuarioDAO.verificarVagasTurnoSetor(id_setor, id_turno);
        var pontosBatidos = await usuarioDAO.verificarPontosBatidos(id_setor, id_turno);

        if(pontosBatidos < vagasTurnoSetor.dados[0].QTD_VAGAS){//realizar batida
            const retorno = await usuarioDAO.registrarPonto(cod, id_setor, id_turno, latitude, longitude, cpf);
            if(retorno.status){
                return res.status(200).send(retorno);
            }else{
                return res.status(500).send(retorno);
            }
        }else{
            return res.status(200).send({"status": false, "msg": "Limite máximo de registros, definido para o turno, já foi atingido!", "dados": []});
        }

    }

};





module.exports = {
    login,
    getSetores,
    getTurnos,
    verificarVagasTurnoSetor,
    registrarPonto,
};
