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

    if(verificarSeusuarioBateuPonto.length > 0){
        if(verificarSeusuarioBateuPonto[0].HORA_SAIDA){
            return res.status(200).send({"status": false, "msg": "Você já atingiu o limite máximo de registro de pontos, para esse turno/setor, hoje", "dados": []});
        }else{
            //calcular a diferença da batida anterior para a atual
            var diferencaHorasBatidaAnteriorAtual = await usuarioDAO.diferencaHorasBatidaAnteriorAtualDia(id_setor, id_turno, cod);
            difAtualAnterior = parseInt(diferencaHorasBatidaAnteriorAtual.DIFERENCA.substr(11, 2))

            if(difAtualAnterior < 7){//Se limite de tempo da batida tiver dentro do limite do turno
                //bater ponto saída
                const retorno = await usuarioDAO.registrarPontoSaida(verificarSeusuarioBateuPonto[0].ID_REGISTRO_PONTO);
                if(retorno.status){
                    return res.status(200).send(retorno);
                }else{
                    return res.status(500).send(retorno);
                }
            }else{//bater entrada no proximo turno
                //verificar quantas vagas tem p esse turno/setor
                var vagasTurnoSetor = await usuarioDAO.verificarVagasTurnoSetor(id_setor, id_turno);
                var pontosBatidos = await usuarioDAO.verificarPontosBatidos(id_setor, id_turno);

                if(vagasTurnoSetor.dados.length == 0){
                    return res.status(200).send({"status": false, "msg": "Não existe escala para você nesse turno e nesse setor de atendimento!", "dados": []});
                }

                if(pontosBatidos < vagasTurnoSetor.dados[0].QTD_VAGAS){//realizar batida
                    const retorno = await usuarioDAO.registrarPontoEntrada(cod, id_setor, id_turno, latitude, longitude, cpf);
                    if(retorno.status){
                        return res.status(200).send(retorno);
                    }else{
                        return res.status(500).send(retorno);
                    }
                }else{
                    return res.status(200).send({"status": false, "msg": "Limite máximo de registros, definido para o turno, já foi atingido!", "dados": []});
                }
            }
        }
    }else{
        // verificação do turno noturno
        var verificarTurnoNoturno = await usuarioDAO.verificarTurnoNoturno(id_setor, id_turno, cod);
        console.log("aaa", verificarTurnoNoturno)
        if(verificarTurnoNoturno.length > 0 && verificarTurnoNoturno.HORA_SAIDA != null){//Se o médico bateu algum ponto no turno/setor do dia anterior
            //verificar o limite maximo de horas em um determinado turno
            var verificarLimiteHorasTurnos = await usuarioDAO.verificarLimiteHorasTurnos(id_turno);
            let temp = verificarLimiteHorasTurnos.HORAS.substr(11, 2)
            let limiteMaxTurno = parseInt(temp) + 1;

            //calcular a diferença da batida anterior para a atual
            var diferencaHorasBatidaAnteriorAtual = await usuarioDAO.diferencaHorasBatidaAnteriorAtual(id_setor, id_turno, cod);
            let difAtualAnterior = parseInt(diferencaHorasBatidaAnteriorAtual.DIFERENCA.substr(11, 2))

            //verificar se a diferença para o dia anterior esta dentro do limite maximo estabelecido
            console.log("limiteMaxTurno", limiteMaxTurno)// pode ser substituido por 7
            console.log("difAtualAnterior", difAtualAnterior)

            if(difAtualAnterior < limiteMaxTurno){//Se limite de tempo da batida tiver dentro do limite do turno
                //bater ponto saída
                const retorno = await usuarioDAO.registrarPontoSaida(verificarTurnoNoturno[0].ID_REGISTRO_PONTO);
                if(retorno.status){
                    return res.status(200).send(retorno);
                }else{
                    return res.status(500).send(retorno);
                }
            }else{//bater entrada no proximo turno
                //verificar quantas vagas tem p esse turno/setor
                var vagasTurnoSetor = await usuarioDAO.verificarVagasTurnoSetor(id_setor, id_turno);
                var pontosBatidos = await usuarioDAO.verificarPontosBatidos(id_setor, id_turno);

                if(vagasTurnoSetor.dados.length == 0){
                    return res.status(200).send({"status": false, "msg": "Não existe escala para você nesse turno e nesse setor de atendimento!", "dados": []});
                }

                if(pontosBatidos < vagasTurnoSetor.dados[0].QTD_VAGAS){//realizar batida
                    const retorno = await usuarioDAO.registrarPontoEntrada(cod, id_setor, id_turno, latitude, longitude, cpf);
                    if(retorno.status){
                        return res.status(200).send(retorno);
                    }else{
                        return res.status(500).send(retorno);
                    }
                }else{
                    return res.status(200).send({"status": false, "msg": "Limite máximo de registros, definido para o turno, já foi atingido!", "dados": []});
                }
            }
        }else{
            //verificar quantas vagas tem p esse turno/setor
            var vagasTurnoSetor = await usuarioDAO.verificarVagasTurnoSetor(id_setor, id_turno);
            var pontosBatidos = await usuarioDAO.verificarPontosBatidos(id_setor, id_turno);

            if(vagasTurnoSetor.dados.length == 0){
                return res.status(200).send({"status": false, "msg": "Não existe escala para você nesse turno e nesse setor de atendimento!", "dados": []});
            }

            if(pontosBatidos < vagasTurnoSetor.dados[0].QTD_VAGAS){//realizar batida
                const retorno = await usuarioDAO.registrarPontoEntrada(cod, id_setor, id_turno, latitude, longitude, cpf);
                if(retorno.status){
                    return res.status(200).send(retorno);
                }else{
                    return res.status(500).send(retorno);
                }
            }else{
                return res.status(200).send({"status": false, "msg": "Limite máximo de registros, definido para o turno, já foi atingido!", "dados": []});
            }
        }
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


module.exports = {
    login,
    registrarPonto,
    setUsuario,
    updateUsuario,
    getUsuario,
    getUsuarios,
    deleteUsuario,
};
