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



const registrarPonto = async (req, res) => {
    const { cod, id_setor, id_turno, latitude, longitude, cpf } = req.body;

    if ( !cod || !id_setor || !id_turno || !cpf) {
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
        if(verificarSeusuarioBateuPonto >= 2){
            return res.status(200).send({"status": false, "msg": "Você já atingiu o limite máximo de registro de pontos, para esse turno/setor, hoje", "dados": []});
        }
        //verificar quantas vagas tem p esse turno/setor
        var vagasTurnoSetor = await usuarioDAO.verificarVagasTurnoSetor(id_setor, id_turno);
        var pontosBatidos = await usuarioDAO.verificarPontosBatidos(id_setor, id_turno);

        if(vagasTurnoSetor.dados.length == 0){
            return res.status(200).send({"status": false, "msg": "Não existe escala para você nesse turno e nesse setor de atendimento!", "dados": []});
        }

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



const setUsuario = async (req, res) => {
    const { nome_profissional, cpf, data_nascimento, crm, especialidade, ano_formatura } = req.body;

    if ( !nome_profissional || !cpf ) {
        return res.status(404).send({
            status: 'false',
            msg: 'Faltam parametros',
        });
    }

    const retorno = await usuarioDAO.setUsuario( nome_profissional, cpf, data_nascimento, crm, especialidade, ano_formatura );
    
    if(retorno.status){
        return res.status(200).send(retorno);
    }else{
        return res.status(500).send(retorno);
    }
};



const updateUsuario = async (req, res) => {
    const { nome_profissional, cpf, data_nascimento, crm, especialidade, ano_formatura } = req.body;

    if ( !nome_profissional || !cpf ) {
        return res.status(404).send({
            status: 'false',
            msg: 'Faltam parametros',
        });
    }

    const retorno = await usuarioDAO.updateUsuario(req.params.id, nome_profissional, cpf, data_nascimento, crm, especialidade, ano_formatura);
    
    if(retorno.status){
        return res.status(200).send(retorno);
    }else{
        return res.status(500).send(retorno);
    }
};



const getUsuario = async (req, res) => {

    const retorno = await usuarioDAO.getUsuario();
    
    if(retorno.status){
        return res.status(200).send(retorno);
    }else{
        return res.status(500).send(retorno);
    }
};



const deleteUsuario = async (req, res) => {

    const retorno = await usuarioDAO.deleteUsuario(req.params.id);
    
    if(retorno.status){
        return res.status(200).send(retorno);
    }else{
        return res.status(500).send(retorno);
    }
};


module.exports = {
    login,
    registrarPonto,
    setUsuario,
    updateUsuario,
    getUsuario,
    deleteUsuario,
};
