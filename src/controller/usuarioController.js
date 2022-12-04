const usuarioDAO = require('../DAO/usuarioDAO');


const login = async (req, res) => {
    const { cpf, password } = req.body;

    if (!cpf) {
        return res.status(404).send({
            status: 'false',
            msg: 'Faltam parametros',
        });
    }

    if(!password){
        const retorno = await usuarioDAO.login(cpf);
        if(retorno.status){
            return res.status(200).send(retorno);
        }else{
            return res.status(500).send(retorno);
        }
    }else{
        const retorno = await usuarioDAO.loginAdm(cpf, password);
        if(retorno.status){
            return res.status(200).send(retorno);
        }else{
            return res.status(500).send(retorno);
        }
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

    // verificar a quantidade de horas do turno
    var verificarQtdHorasTurno = await usuarioDAO.verificarQtdHorasTurno(id_turno);
    let limite_do_turno = parseInt(verificarQtdHorasTurno.QTD_HORAS) + 2;

    if(verificarSeusuarioBateuPonto.length == 0){//Se não tiver batido nenhum ponto no turno/setor/dia
        // verificar se exite ponto no dia anterior, cujo a diferença entre a entrada/hora atual, esta dentro do limite do turno + 2h
        var verificarSeusuarioBateuPontoLimiteTurno = await usuarioDAO.verificarSeusuarioBateuPontoLimiteTurno(id_setor, id_turno, cod, limite_do_turno);
        if(verificarSeusuarioBateuPontoLimiteTurno.length == 0){//Não existe ponto no dia anterior com saida pendente
            //verificar quantas vagas tem p esse turno/setor
            var vagasTurnoSetor = await usuarioDAO.verificarVagasTurnoSetor(id_setor, id_turno);
            var pontosBatidos = await usuarioDAO.verificarPontosBatidos(id_setor, id_turno);

            if(vagasTurnoSetor.dados.length == 0){
                return res.status(200).send({"status": false, "msg": "Não existe escala para você nesse turno e nesse setor de atendimento!", "dados": []});
            }

            if(pontosBatidos < vagasTurnoSetor.dados[0].QTD_VAGAS){
                //bater ponto entrada
                const retorno = await usuarioDAO.registrarPontoEntrada(cod, id_setor, id_turno, latitude, longitude, cpf);
                if(retorno.status){
                    return res.status(200).send(retorno);
                }else{
                    return res.status(500).send(retorno);
                }
            }else{
                return res.status(200).send({"status": false, "msg": "Limite máximo de registros, definido para o turno, já foi atingido!", "dados": []});
            }
        }else{//Existe um ponto, dentro do limite do turno, com uma saída pendente
            //bater ponto saída
            const retorno = await usuarioDAO.registrarPontoSaida(verificarSeusuarioBateuPontoLimiteTurno[0].ID_REGISTRO_PONTO);
            if(retorno.status){
                return res.status(200).send(retorno);
            }else{
                return res.status(500).send(retorno);
            }
        }
    }

    else if(verificarQtdHorasTurno.QTD_HORAS == 6 && verificarSeusuarioBateuPonto.length > 0 && verificarSeusuarioBateuPonto.length <= 3 ){// se for 6h, permitir, no máximo, 3 entradas por turno/setor/dia
        if(verificarSeusuarioBateuPonto.length == 3 && verificarSeusuarioBateuPonto[0].HORA_SAIDA){
            return res.status(200).send({"status": false, "msg": "Limite máximo de registros, definido para o turno, já foi atingido! Quatidade de horas do turno: " + verificarQtdHorasTurno.QTD_HORAS, "dados": []});
        }
        if(verificarSeusuarioBateuPonto[0].HORA_SAIDA){//Se a ultima batida do usuário tem uma saída
            //bater ponto entrada
            const retorno = await usuarioDAO.registrarPontoEntrada(cod, id_setor, id_turno, latitude, longitude, cpf);
            if(retorno.status){
                return res.status(200).send(retorno);
            }else{
                return res.status(500).send(retorno);
            }
        }else{//Se a ultima batida do usuário NÃO tem uma saída
            if( verificarSeusuarioBateuPonto[0].HORA_DIFERENCA <= limite_do_turno){//Se tiver DENTRO do limite do turno
                //bater ponto saída
                const retorno = await usuarioDAO.registrarPontoSaida(verificarSeusuarioBateuPonto[0].ID_REGISTRO_PONTO);
                if(retorno.status){
                    return res.status(200).send(retorno);
                }else{
                    return res.status(500).send(retorno);
                }
            }else{//Se tiver FORA do limite do turno
                //bater ponto entrada
                const retorno = await usuarioDAO.registrarPontoEntrada(cod, id_setor, id_turno, latitude, longitude, cpf);
                if(retorno.status){
                    return res.status(200).send(retorno);
                }else{
                    return res.status(500).send(retorno);
                }
            }
        }
    }
 
    else if(verificarQtdHorasTurno.QTD_HORAS == 12 && verificarSeusuarioBateuPonto.length > 0 && verificarSeusuarioBateuPonto.length <= 2  ){// se for 12h, permitir, no máximo, 2 entradas por turno/setor/dia
        if(verificarSeusuarioBateuPonto.length == 2 && verificarSeusuarioBateuPonto[0].HORA_SAIDA){
            return res.status(200).send({"status": false, "msg": "Limite máximo de registros, definido para o turno, já foi atingido! Quatidade de horas do turno: " + verificarQtdHorasTurno.QTD_HORAS, "dados": []});
        }
        if(verificarSeusuarioBateuPonto[0].HORA_SAIDA){//Se a ultima batida do usuário tem uma saída
            //bater ponto entrada
            const retorno = await usuarioDAO.registrarPontoEntrada(cod, id_setor, id_turno, latitude, longitude, cpf);
            if(retorno.status){
                return res.status(200).send(retorno);
            }else{
                return res.status(500).send(retorno);
            }
        }else{//Se a ultima batida do usuário NÃO tem uma saída
            if( verificarSeusuarioBateuPonto[0].HORA_DIFERENCA <= limite_do_turno){//Se tiver DENTRO do limite do turno
                //bater ponto saída
                const retorno = await usuarioDAO.registrarPontoSaida(verificarSeusuarioBateuPonto[0].ID_REGISTRO_PONTO);
                if(retorno.status){
                    return res.status(200).send(retorno);
                }else{
                    return res.status(500).send(retorno);
                }
            }else{//Se tiver FORA do limite do turno
                //bater ponto entrada
                const retorno = await usuarioDAO.registrarPontoEntrada(cod, id_setor, id_turno, latitude, longitude, cpf);
                if(retorno.status){
                    return res.status(200).send(retorno);
                }else{
                    return res.status(500).send(retorno);
                }
            }
        }
    }else{
        return res.status(200).send({"status": false, "msg": "Limite máximo de registros, definido para o turno, já foi atingido! Quatidade de horas do turno: " + verificarQtdHorasTurno.QTD_HORAS, "dados": []});    
    }
};



const setUsuario = async (req, res) => {
    const { nome_profissional, cpf, data_nascimento, crm, especialidade, ano_formatura, password } = req.body;

    if ( !nome_profissional || !cpf ) {
        return res.status(404).send({
            status: 'false',
            msg: 'Faltam parametros',
        });
    }

    const retorno = await usuarioDAO.setUsuario( nome_profissional, cpf, data_nascimento, crm, especialidade, ano_formatura, password );
    
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
    const { id_profissional } = req.body;
    

    if ( !id_profissional ) {
        return res.status(404).send({
            status: 'false',
            msg: 'Faltam parametros',
        });
    }

    const retorno = await usuarioDAO.getUsuario(id_profissional);
    
    if(retorno.status){
        return res.status(200).send(retorno);
    }else{
        return res.status(500).send(retorno);
    }
};



const getUsuarios = async (req, res) => {

    const retorno = await usuarioDAO.getUsuarios();
    
    if(retorno.status){
        return res.status(200).send(retorno);
    }else{
        return res.status(200).send(retorno);
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



const getFolhaPonto = async (req, res) => {
    const { mes, ano } = req.body;

    const retorno = await usuarioDAO.getFolhaPonto(req.params.id, mes, ano);
    
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
    getUsuarios,
    deleteUsuario,
    getFolhaPonto
};
