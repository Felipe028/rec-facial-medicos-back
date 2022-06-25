
const axios = require('axios')
const oracledb = require('oracledb')
const FormData = require('form-data')
const moment = require('moment');

const conveniosSamel = JSON.parse(process.env.CONVENIOS_SAMEL)
const urlElegibilidade = process.env.API_ELEGIBILIDADE
const usuarioAgendamentoTasy = process.env.USUARIO_AGENDAMENTO_TASY
const qtdDiasPrimeiraNotificacao = process.env.QTD_DIAS_PRIMEIRA_NOTIFICACAO
const qtdDiasSegundaNotificacao = process.env.QTD_DIAS_SEGUNDA_NOTIFICACAO
const urlCarencia = process.env.API_CARENCIA
const qtdDiasLembreteProcedimento = process.env.QTD_DIAS_LEMBRETE_PROCEDIMENTO

async function confirmarConsulta(idCliente, idConvenio, codigoCarteirinha, idAgenda, dataAgenda, idEmpresa, procedimentos, tipoAgendamento,
    tipo, dadosLog){
       
    let dados ={
        status: false,
        msg: "",
        situacao: null,
        carencias: [],
        idHorario: "" //idhorario que retorna da procedure
    }

    //obj padrao de carencia
    // let carencia = {
    //     procedimento: {
    //         id: null
    //     },
    //     quantidadeDiasRestantes: null
    // }

    //let idEmpresa = null
    // let elegibilidadeValidada = true
    // let limiteAgendamentosAtingido= false
    let retornoConfirmacaoAgendamento = {
        status: false
    }

    //continua somente se o cliente existir
    //verifica se é da samel
    // let existeConvenioSamel = conveniosSamel.find((item, index) => item==idConvenio ? true :false )
    
    //Caso o agendamento esteja sendo realizado para algum dos convênios Samel, validar a elegibilidade
    //do cliente e a carência
    // if(existeConvenioSamel){
    // let dadosElegibilidadeValidada = await verificarElegibilidade(codigoCarteirinha)
    // elegibilidadeValidada = dadosElegibilidadeValidada.sucesso
    // }

    //Verifica se a elegibilidade e a carência foram validadas com sucesso
    //Caso o convênio não seja um convênio Samel, entende-se que a elegibilidade e a carência estão validadas
    //Por padrão.
    // if(!elegibilidadeValidada){
    //     dados.situacao = 4 //ClienteInativoNoConvenio
    //     dados.msg = "Cliente inativo no convenio"
    //     dados.status = false
    // }else{
    if(tipo ==1){
            retornoConfirmacaoAgendamento = await agendarConsultaProcedure(idAgenda, dataAgenda, usuarioAgendamentoTasy, idCliente, 
                codigoCarteirinha,idConvenio,idEmpresa, dadosLog)
        }else{
            //agendamento especial de consulta
            retornoConfirmacaoAgendamento = await agendarConsultaEspecialProcedure(idAgenda, dataAgenda, usuarioAgendamentoTasy, idCliente, 
            codigoCarteirinha,idConvenio,idEmpresa, horarioAgenda, nomeCliente, idMedico)
        }

    //melhorar retorno pois se mudar aqui o procedimento pode bugar
    if(retornoConfirmacaoAgendamento.status){
        dados.situacao = 0 //Agendado
        dados.msg = "Agendamento criado com sucesso"
        dados.status = true
        dados.idHorario = retornoConfirmacaoAgendamento.nr_seq_horario_o ?  retornoConfirmacaoAgendamento.nr_seq_horario_o : 0

        let inicioMonitoramento=  moment(dataAgenda, 'YYYY/MM/DD HH:mm:ss').format('YYYY/MM/DD HH:mm:ss') 
        let fimMonitoramento=  moment(dataAgenda, 'YYYY/MM/DD HH:mm:ss').add(10, 'days').format('YYYY/MM/DD HH:mm:ss') //adiciona mais 10 dias 
        let dataPrimeiraNotificacao = moment(dataAgenda, 'YYYY/MM/DD HH:mm:ss').add(-qtdDiasPrimeiraNotificacao, 'days').format('YYYY/MM/DD HH:mm:ss')
        let dataSegundaNotificacao = moment(dataAgenda, 'YYYY/MM/DD HH:mm:ss').add(-qtdDiasSegundaNotificacao, 'days').format('YYYY/MM/DD HH:mm:ss')
        
        await criarControlePesquisaSatisfacao(retornoConfirmacaoAgendamento.nr_seq_horario_o, tipoAgendamento, inicioMonitoramento, fimMonitoramento)
        await criarControleEnvioConfirmacaoAgendamento(retornoConfirmacaoAgendamento.nr_seq_horario_o, tipoAgendamento, dataPrimeiraNotificacao, dataSegundaNotificacao)
    }else{
        dados.situacao = 2 //HorarioIndisponivel
        dados.msg = retornoConfirmacaoAgendamento.msg //"Agendamento com horário indisponível"
        dados.status = false
    }
    // }
    return dados
}

async function verificarElegibilidade(codigoCarteirinha){
    let retorno = {
        codigo: 1,
        sucesso: false,
        mensagem: "",
        dados : {}
    }

    if(!codigoCarteirinha) // checar essa função
    return retorno.dados

    const formData = new FormData()
    formData.append('carteirinha', codigoCarteirinha+"")
    
    await  axios.post(urlElegibilidade+`/verificarElegibilidade`, formData, {
        headers: {
            "Content-Type": `multipart/form-data; boundary=${formData._boundary}`
        }
    })
    .then(response => {
        if(response.data.resposta == 'S'){
            retorno.codigo = 0
            retorno.sucesso = true
        }else{
            retorno.codigo = 1
            retorno.sucesso = false
        }        
        retorno.mensagem = "Sucesso ao verificar elegibilidade"
        retorno.dados = response.data                   
        
    })
    .catch(error => {
        console.log("Erro ao verificar elegibilidade", error);
        retorno.sucesso = false
        retorno.mensagem = "Erro ao verificar elegibilidade"
        retorno.dados = ""
    });  

    return retorno
}

async function agendarConsultaProcedure(idAgenda, dataAgenda, usuarioAgendamentoTasy, idCliente, codigoCarteirinha, idConvenio, idEmpresa, dadosLog){
    let retorno = {
        status: false,
        msg: '',
        nr_seq_horario_o: null
    }

    let queryPrincipal = ``
    let bindQuery = null
    let db =null

    /**tratando quando o cliente nao for samel */
    let sqlCodCarteirinha = ``
    let sqlIdEmpresa = ``

    if(codigoCarteirinha != null && codigoCarteirinha.length > 0){
        sqlCodCarteirinha = ` cd_carteirinha_p => '${codigoCarteirinha}', `
    }else{
        sqlCodCarteirinha =` cd_carteirinha_p => '', `
    }

    if(idEmpresa != null && idEmpresa.length > 0 && idEmpresa != "N/A"){
        sqlIdEmpresa = ` cd_empresa_ref_p => '${idEmpresa}', `
    }else{
        sqlIdEmpresa =` cd_empresa_ref_p => '', `
    } 

    queryPrincipal = `
        BEGIN         
                samel.agendar_consulta2(cd_agenda_p => :cd_agenda_pp,
                                        dt_agenda_p => to_date(:dt_agenda_pp, 'yyyy/mm/dd hh24:mi:ss'), 
                                        nm_usuario_p => :nm_usuario_pp,
                                        cd_pessoa_fisica_p => :cd_pessoa_fisica_pp,
                                        ${sqlCodCarteirinha}
                                        cd_convenio_p => :cd_convenio_pp,
                                        ${sqlIdEmpresa}
                                        ie_online => 'N',
                                        agendou_o => :agendou_oo,
                                        motivo_o => :motivo_oo,
                                        nr_seq_horario_o => :nr_seq_horario_oo);

                --insert into appv2.log_agendamento_telemedicina values(:nr_seq_horario_oo, :idCLienteLog, :idDependenteLog, sysdate);
                commit;
        END;`

    bindQuery = {
        ":cd_agenda_pp": {"dir": oracledb.BIND_IN, "type": oracledb.NUMBER, "val":  Number(idAgenda)},
        ":dt_agenda_pp": {"dir": oracledb.BIND_IN, "type": oracledb.STRING, "val":  dataAgenda.toString()},
        ":nm_usuario_pp": {"dir": oracledb.BIND_IN, "type": oracledb.STRING, "val":  usuarioAgendamentoTasy},
        ":cd_pessoa_fisica_pp": {"dir": oracledb.BIND_IN, "type": oracledb.NUMBER, "val":  Number(idCliente)},
        ":cd_convenio_pp": {"dir": oracledb.BIND_IN, "type": oracledb.NUMBER, "val":  Number(idConvenio)},
        //":idCLienteLog" : {"dir": oracledb.BIND_IN, "type": oracledb.NUMBER, "val":  Number(dadosLog.idClienteLogdadosLog.idClienteLog)},
        //":idDependenteLog" : {"dir": oracledb.BIND_IN, "type": oracledb.NUMBER, "val":  Number(dadosLog.idDependenteLog)},
        ":agendou_oo": {"dir": oracledb.BIND_OUT, "type": oracledb.STRING},
        ":motivo_oo": {"dir": oracledb.BIND_OUT, "type": oracledb.STRING, maxSize: 4000},
        ":nr_seq_horario_oo": {"dir": oracledb.BIND_OUT, "type": oracledb.NUMBER}
    }

    db = await oracledb.getConnection();
    await db.execute(queryPrincipal,bindQuery,
    {
        autoCommit: true
    })
    .then(async (result) =>{
        const statusAgendamento = result.outBinds[':agendou_oo']
        const nrSeqHorario = result.outBinds[':nr_seq_horario_oo']

        if(statusAgendamento == 'S'){
            const resultLog = await salvarLogTelemedicina(nrSeqHorario, dadosLog.idClienteLog, dadosLog.idDependenteLog)

            retorno.status = true
            retorno.msg = "Agendamento de consulta realizada com sucesso"
            retorno.nr_seq_horario_o = result.outBinds[':nr_seq_horario_oo']
        }else{
            retorno.status = false
            retorno.msg = result.outBinds[':motivo_oo']
        }
    })
    .finally(() => db.close())
    .catch((err) => {
        console.log("Erro na Operação: Procedure agendar Consulta", err)
        retorno.status = false
        retorno.msg = "Erro na Operação: Agendar Consulta"
    })
    return retorno         
}

async function salvarLogTelemedicina(nrSeqHorario, idCliente, idDependente){
    let retorno = {
        status: false,
        msg: '',
        nr_seq_horario_o: null
    } 

    queryPrincipal = `insert into appv2.log_agendamento_telemedicina values(:nr_seq_horario, :idCliente, :idDependente, sysdate)`

    bindQuery = {
        ":nr_seq_horario": {"dir": oracledb.BIND_IN, "type": oracledb.NUMBER, "val":  Number(nrSeqHorario)},
        ":idCliente": {"dir": oracledb.BIND_IN, "type": oracledb.NUMBER, "val":  Number(idCliente)},
        ":idDependente": {"dir": oracledb.BIND_IN, "type": oracledb.NUMBER, "val":  Number(idDependente)}
    }

    db = await oracledb.getConnection();
    await db.execute(queryPrincipal,bindQuery,
    {
        autoCommit: true
    })
    .then((result) =>{
        if(result.rowsAffected){
            retorno = true
            //retorno.msg = "Agendamento de consulta realizada com sucesso"
            //retorno.nr_seq_horario_o = result.outBinds[':nr_seq_horario_oo']
        }else{
            retorno.status = false
            //retorno.msg = result.outBinds[':motivo_oo']
        }
    })
    .finally(() => db.close())
    .catch((err) => {
        console.log("Erro na Operação: Salvar Log Telemedicina", err)
        retorno = false
    })
    return retorno
}

async function criarControlePesquisaSatisfacao(idAgendamento, tipoAgendamento, inicioMonitoramento, fimMonitoramento){
    let status = false

    let queryPrincipal = `INSERT INTO appv2.TB_CTL_PESQUISA_SATISFACAO 
     VALUES (NULL,  
            :NR_SEQUENCIA, 
            ${ tipoAgendamento==0 ? '\'C\'' : '\'E\''}, 
            'N', 
            to_date(:DT_INICIO_MONITORAMENTO, 'yyyy/mm/dd hh24:mi:ss'), 
            to_date(:DT_FIM_MONITORAMENTO, 'yyyy/mm/dd hh24:mi:ss'), 
            SYSDATE)`

    let db = await oracledb.getConnection();
    await db.execute(queryPrincipal,
        {
            "NR_SEQUENCIA": {"dir": oracledb.BIND_IN, "type": oracledb.NUMBER, "val":  Number(idAgendamento)},
            "DT_INICIO_MONITORAMENTO": {"dir": oracledb.BIND_IN, "type": oracledb.STRING, "val":  inicioMonitoramento+""},
            "DT_FIM_MONITORAMENTO": {"dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": fimMonitoramento+""}
        },
        {
            autoCommit: true
        })
        .then((result) =>{
            status = true
        })
        .finally(() => db.close())
        .catch((err) => {
            console.log("Erro na Operação: criar controle pesquisa de satisfacao", err)
            status = false
        })
    
    return status
}

async function criarControleEnvioConfirmacaoAgendamento(idAgendamento, tipoAgendamento, dataPrimeiraNotificacao, dataSegundaNotificacao){
    let status = false

    let queryPrincipal = `INSERT INTO APPV2.TB_CTL_CONFIRMACAO_AGENDAMENTO 
                            VALUES(NULL, 
                                    :NR_SEQUENCIA, 
                                    ${tipoAgendamento == 0 ? '\'C\'' : '\'E\''},  
                                    to_date(:DT_NOTIFICACAO_1, 'yyyy/mm/dd hh24:mi:ss'), 
                                    'N', 
                                    to_date(:DT_NOTIFICACAO_2, 'yyyy/mm/dd hh24:mi:ss'), 
                                    'N', 
                                    'N', 
                                    SYSDATE)`
    
    let db = await oracledb.getConnection();
    await db.execute(queryPrincipal,
        {
            "NR_SEQUENCIA": {"dir": oracledb.BIND_IN, "type": oracledb.NUMBER, "val":  Number(idAgendamento)},
            "DT_NOTIFICACAO_1": {"dir": oracledb.BIND_IN, "type": oracledb.STRING, "val":  dataPrimeiraNotificacao+""},
            "DT_NOTIFICACAO_2": {"dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": dataSegundaNotificacao+""}
        },
        {
            autoCommit: true
        })
        .then((result) =>{
            status = true
        })
        .finally(() => db.close())
        .catch((err) => {
            console.log("Erro na Operação: criar controle de envio de confirmacaode agendamento", err)
            status = false
        })
    
    return status
}

//Agendar retorno exames
async function confirmarExame(idCliente, idConvenio, codigoCarteirinha, idAgenda, dataAgenda, idEmpresa, idMedico, procedimentos, tipoAgendamento){

    console.log({idCliente, idConvenio, codigoCarteirinha, idAgenda, dataAgenda, idEmpresa, idMedico, procedimentos, tipoAgendamento})

    let dados ={
        status: false,
        msg: "",
        situacao: null,
        carencias: [],
        idHorario: 0
    }

    //obj padrao de carencia
    // let carencia = {
    //     procedimento: {
    //         id: null
    //     },
    //     quantidadeDiasRestantes: null
    // }

    //let idEmpresa = null
    // let elegibilidadeValidada = true
    // let limiteAgendamentosAtingido= false
    let retornoConfirmacaoAgendamento = {
        status: false
    }

    let cliente = await obterPorIdCliente(idCliente)
    
    //senao encontrou o cliente, entao procura dependentes
    if(!cliente){
        cliente = await obterDependentePorIdCliente(idCliente)
    }

    if(!cliente){
        dados.status = false
        dados.msg = "Cliente não localizado"
        dados.situacao = 3 //Cliente Nao Localizado 
        return  dados
     }
     //continua somente se o cliente existir
     //verifica se é da samel
    //  let existeConvenioSamel = conveniosSamel.find((item, index) => item==idConvenio ? true :false )
     //Caso o agendamento esteja sendo realizado para algum dos convênios Samel, validar a elegibilidade
     //do cliente e a carência

    //  if(existeConvenioSamel){
    //     let dadosElegibilidadeValidada = await verificarElegibilidade(codigoCarteirinha)

    //     elegibilidadeValidada = dadosElegibilidadeValidada.sucesso

    //     if(elegibilidadeValidada){

    //         for(let idProcedimento of procedimentos ){
    //             let qtdCarencia = await obterQuantidadeDiasCarencia(codigoCarteirinha, idProcedimento)

    //             if(qtdCarencia.dados >0 ){
    //                 //cria um obj e insere na lista
    //                 carencia.quantidadeDiasRestantes =qtdCarencia.dados
    //                 carencia.procedimento.id = idProcedimento
    //                     dados.carencias.push(carencia)
    //                 //limpa depois
    //                 carencia.quantidadeDiasRestantes =null
    //                 carencia.procedimento.id = null
    //             }
    //         }
    //     } 
    //  }

     //Verifica se a elegibilidade e a carência foram validadas com sucesso
    //Caso o convênio não seja um convênio Samel, entende-se que a elegibilidade e a carência estão validadas
    //Por padrão.
    //  if(!elegibilidadeValidada){
    //      dados.situacao = 4 //ClienteInativoNoConvenio
    //      dados.msg = "Cliente inativo no convenio"
    //      dados.status = false
    //  } else if(dados.carencias.length >0){
    //     dados.situacao = 5 //ClienteEmCarenciaParaProcedimento
    //     dados.msg = "Cliente em carencia para procedimento"
    //     dados.status = false
    //  }else{
        retornoConfirmacaoAgendamento = await agendarExameProcedure(idAgenda, dataAgenda, usuarioAgendamentoTasy, idCliente, codigoCarteirinha, idConvenio, idEmpresa, idMedico, procedimentos, 1)                               
        //melhorar retorno depois
        if(retornoConfirmacaoAgendamento.status){
            dados.situacao = 0 //Agendado
            dados.msg = "Agendamento de Exame criado com sucesso"
            dados.status = true
            dados.idHorario = retornoConfirmacaoAgendamento.nr_sequencia_p

            let inicioMonitoramento=  moment(dataAgenda, 'YYYY/MM/DD HH:mm:ss').format('YYYY/MM/DD HH:mm:ss') 
            let fimMonitoramento=  moment(dataAgenda, 'YYYY/MM/DD HH:mm:ss').add(10, 'days').format('YYYY/MM/DD HH:mm:ss') //adiciona mais 10 dias 
            let dataPrimeiraNotificacao = moment(dataAgenda, 'YYYY/MM/DD HH:mm:ss').add(-qtdDiasPrimeiraNotificacao, 'days').format('YYYY/MM/DD HH:mm:ss')
            let dataSegundaNotificacao = moment(dataAgenda, 'YYYY/MM/DD HH:mm:ss').add(-qtdDiasSegundaNotificacao, 'days').format('YYYY/MM/DD HH:mm:ss')

            //esse retono de nr_sequencia_p so existe no exame , la em agendamento é assim: nr_seq_horario_o
            await criarControlePesquisaSatisfacao(retornoConfirmacaoAgendamento.nr_sequencia_p, tipoAgendamento, inicioMonitoramento, fimMonitoramento)
            await criarControleEnvioConfirmacaoAgendamento(retornoConfirmacaoAgendamento.nr_sequencia_p, tipoAgendamento, dataPrimeiraNotificacao, dataSegundaNotificacao)

            let dataLiberacaoEnvio = moment(dataAgenda, 'YYYY/MM/DD HH:mm:ss').add(-qtdDiasLembreteProcedimento, 'days').format('YYYY/MM/DD HH:mm:ss')                    
            await criarControleEnvioLembretePreparoProcedimento(retornoConfirmacaoAgendamento.nr_sequencia_p, dataLiberacaoEnvio)
            
            //finalizou com sucesso
        }else{
            dados.situacao = 2 //HorarioIndisponivel //tratar essa situacao de acordo com a procedure
            dados.msg = retornoConfirmacaoAgendamento.msg
            dados.status = false
        }
    //  }
     return dados
}

async function obterPorIdCliente(idCliente){  
    let cliente = null
    //volta nulo pois nao tem cpf
    if(!idCliente){
        return cliente
    }
    
    const db = await oracledb.getConnection();
    //valida usuario e senha no banco de dados

    let sql_padrao = `select * from appv2.vw_pessoa_fisica WHERE CD_PESSOA_FISICA = :idCliente`;
    await db.execute(sql_padrao,
    {
        "idCliente": {"dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": idCliente+"" }
    },
    {
        outFormat: oracledb.OBJECT
    })
    .then((result) => {
        //se encontrou algo entao pega a primeira posicao
        if(result.rows.length > 0){            
            cliente = result.rows[0]

            cliente =  {idade:                  cliente.IDADE ? cliente.IDADE : '',
                        cpf:                    cliente.NR_CPF ? cliente.NR_CPF : '',
                        estadoCivil:            cliente.IE_ESTADO_CIVIL ? cliente.IE_ESTADO_CIVIL : '1',
                        rg:                     cliente.NR_IDENTIDADE ? cliente.NR_IDENTIDADE : '',
                        sexo:                   cliente.IE_SEXO ? cliente.IE_SEXO : '',
                        uf:                     cliente.SG_ESTADO ? cliente.SG_ESTADO : '',
                        municipio:              cliente.DS_MUNICIPIO ? cliente.DS_MUNICIPIO : '',
                        bairro:                 cliente.DS_BAIRRO ? cliente.DS_BAIRRO : '',
                        logradouroResidencial:  cliente.DS_ENDERECO ? cliente.DS_ENDERECO : '',
                        cepResidencial:         cliente.CD_CEP ? cliente.CD_CEP : '',
                        numeroResidencial:      cliente.NR_ENDERECO ? cliente.NR_ENDERECO : '',
                        complementoResidencial: cliente.DS_COMPLEMENTO ? cliente.DS_COMPLEMENTO : '',
                        id:                     cliente.CD_PESSOA_FISICA ? Number(cliente.CD_PESSOA_FISICA) : '',
                        numeroTelefone:         cliente.NR_TELEFONE ? cliente.NR_TELEFONE : '',
                        dddTelefone:            cliente.NR_DDD_TELEFONE ? cliente.NR_DDD_TELEFONE : '',
                        nome:                   cliente.NM_PESSOA_FISICA ? cliente.NM_PESSOA_FISICA : '',
                        dataNascimento:         cliente.DT_NASCIMENTO ? cliente.DT_NASCIMENTO : '',
                        status:                 cliente.STATUS ? cliente.STATUS : 'false',
                        qtd:                    cliente.QTD_ENVIO_EMAIL ? cliente.QTD_ENVIO_EMAIL : 0,
                        usuario:{
                            id:                 cliente.CD_USUARIO ? cliente.CD_USUARIO : '',
                            email:              cliente.DS_EMAIL ? cliente.DS_EMAIL : ''
                        }}
        
        }else{
            cliente = null
        }
    })
    .finally(()=>db.close())
    .catch((err) => {
        console.log('Erro ao listar cliente por id', err)     
        cliente = null
    })
    return cliente
}

async function obterDependentePorIdCliente(idCliente){
    let dependente = null
    //volta nulo pois nao tem cpf
    if(!idCliente){
        return dependente
    }
    
    const db = await oracledb.getConnection();
    //valida usuario e senha no banco de dados
    await db.execute(`SELECT a.*, b.NR_CPF FROM APPV2.VW_PESSOA_FISICA_DEPENDENTE a
    INNER join TASY.PESSOA_FISICA b on b.CD_PESSOA_FISICA = a.CD_PESSOA_FISICA 
     WHERE a.CD_PESSOA_FISICA = :idCliente`,
    {
        "idCliente": {"dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": idCliente+"" }
    },
    {
        outFormat: oracledb.OBJECT
    })
    .then((result) => {
        //se encontrou algo entao pega a primeira posicao
        if(result.rows.length > 0){            
            dependente = result.rows[0]
        }else{
            dependente = null
        }
    })
    .finally(()=>db.close())
    .catch((err) => {
        console.log('Erro ao obter dependente por idCliente', err)     
        dependente = null
    })
    
    return dependente
}

async function obterQuantidadeDiasCarencia(codigoCarteirinha, idProcedimento){
    console.log({codigoCarteirinha, idProcedimento})

    let retorno = {
        codigo: 1,
        sucesso: false,
        mensagem: "",
        dados : {}
    }

    let qtd = 0

    if(!codigoCarteirinha)
        return dados
        
    let urlgetCarencia = urlCarencia+`/API/Carencia/${codigoCarteirinha}?estruturas=${idProcedimento}`
    
    await  axios.get(urlgetCarencia)
    .then(async response => {

        retorno.codigo = 0
        retorno.sucesso = true              
        retorno.mensagem = "Sucesso ao obter quantidade de dias de carencia"        
        
        let carencias = response.data.carencias
        qtd = 0

        await carencias.map((item, index) => {
            
            if(item.carencia){
                qtd = qtd+ Number(item.carencia.dias)
            }
        })

        retorno.dados = qtd 
        
    })
    .catch(error => {
        console.log("Erro ao obter quantidade de dias de carencia", error);
        retorno.sucesso = false
        retorno.mensagem = "Erro ao obter quantidade de dias de carencia"
        retorno.dados = qtd
    });  
    return retorno
}

async function agendarExameProcedure(idAgenda, dataAgenda, usuarioAgendamentoTasy, idCliente, codigoCarteirinha, idConvenio, idEmpresa, idMedico, procedimentos, tipoAgendamento){
    let retorno = {
        status: false,
        msg: '',
        nr_seq_horario_o: null
    }

    let queryPrincipal = ``
    let db =null

    if(procedimentos.length <=0){
        retorno.status= false
        retorno.msg= 'Não foi possível identificar os Exames selecionados'
        retorno.nr_seq_horario_o= null

        return retorno
    }

    /**tratando quando o cliente nao for samel */
    let sqlCodCarteirinha = ``
    let sqlIdEmpresa = ``

    if(idEmpresa != null && idEmpresa.length > 0){
        sqlIdEmpresa = ` cd_empresa_ref_p => '${idEmpresa}', `
    }else{
        sqlIdEmpresa =` cd_empresa_ref_p => '', `
    }  

    if(codigoCarteirinha != null && codigoCarteirinha.length > 0){
        sqlCodCarteirinha = ` cd_carteirinha_p => '${codigoCarteirinha}', `
    }else{
        sqlCodCarteirinha =` cd_carteirinha_p => '', `
    }

    //OBS: ids exames precisam vim como string nesse formato como a procedure espera, por exemplo: '123,456'  
    let idExames =  `${procedimentos.map((item, index) => `${item.id}`).join(",")}`

    if(tipoAgendamento == 1){
        queryPrincipal = `
            BEGIN         
                samel.agendar_exame(cd_agenda_p => :cd_agenda_p,
                                    hr_agenda_p => to_date(:hr_agenda_p, 'yyyy/mm/dd hh24:mi:ss'), 
                                    nm_usuario_p => :nm_usuario_p,
                                    cd_pessoa_fisica_p => :cd_pessoa_fisica_p,
                                    ${sqlCodCarteirinha}
                                    cd_convenio_p => :cd_convenio_p,
                                    ${sqlIdEmpresa}
                                    cd_exames_p => :cd_exames_p,
                                    cd_medico_req => :cd_medico_req,
                                    agendou_o => :agendou_o,
                                    motivo_o => :motivo_o,
                                    nr_sequencia_p => :nr_sequencia_p);
            END;`

        db = await oracledb.getConnection();
        await db.execute(queryPrincipal,
            {
                "cd_agenda_p": {"dir": oracledb.BIND_IN, "type": oracledb.NUMBER, "val":  Number(idAgenda)},
                "hr_agenda_p": {"dir": oracledb.BIND_IN, "type": oracledb.STRING, "val":  dataAgenda+""},
                "nm_usuario_p": {"dir": oracledb.BIND_IN, "type": oracledb.STRING, "val":  usuarioAgendamentoTasy},
                "cd_pessoa_fisica_p": {"dir": oracledb.BIND_IN, "type": oracledb.NUMBER, "val":  Number(idCliente)},
                //"cd_carteirinha_p": {"dir": oracledb.BIND_IN, "type": oracledb.STRING, "val":  codigoCarteirinha+""},
                "cd_convenio_p": {"dir": oracledb.BIND_IN, "type": oracledb.NUMBER, "val":  Number(idConvenio)},
               // "cd_empresa_ref_p": {"dir": oracledb.BIND_IN, "type": oracledb.NUMBER, "val":  Number(idEmpresa)},
                "cd_medico_req": {"dir": oracledb.BIND_IN, "type": oracledb.NUMBER, "val":  Number(idMedico)},
                "cd_exames_p": {"dir": oracledb.BIND_IN, "type": oracledb.STRING, "val":  idExames.toString()},    
                "agendou_o": {"dir": oracledb.BIND_OUT, "type": oracledb.STRING},
                "motivo_o": {"dir": oracledb.BIND_OUT, "type": oracledb.STRING, maxSize: 4000},
                "nr_sequencia_p": {"dir": oracledb.BIND_OUT, "type": oracledb.NUMBER}
            },
            {
                autoCommit: true
            })
            .then((result) =>{
                console.log("retorno procedure ",result)

                if(result.outBinds.agendou_o == 'S'){
                    retorno.status = true
                    retorno.msg = "Agendamento de exame realizado com sucesso"
                    retorno.nr_sequencia_p = result.outBinds.nr_sequencia_p
                }else{
                    retorno.status = false
                    retorno.msg = result.outBinds.motivo_o
                }
            })
            .finally(() => db.close())
            .catch((err) => {
                console.log("Erro na Operação: Procedure agendar Consulta", err)

                retorno.status = false
                retorno.msg = "Erro na Operação: Agendar Consulta"
            })
    }    
    return retorno          
}

async function criarControleEnvioLembretePreparoProcedimento(idHorarioAgenda, dataLiberacaoEnvio){
    let status = false

    let db = await oracledb.getConnection();
    let queryPrincipal = `INSERT INTO APPV2.TB_CTL_LEMBRETE_PREPARO 
                            VALUES 
                                (NULL, 
                                    :NR_SEQUENCIA , 
                                    to_date(:DT_LIBERACAO_ENVIO, 'yyyy/mm/dd hh24:mi:ss'), 
                                    'N', 
                                    SYSDATE)`

    await db.execute(queryPrincipal,
        {
            "NR_SEQUENCIA": {"dir": oracledb.BIND_IN, "type": oracledb.NUMBER, "val":  Number(idHorarioAgenda)},
            "DT_LIBERACAO_ENVIO": {"dir": oracledb.BIND_IN, "type": oracledb.STRING, "val":  dataLiberacaoEnvio+""}
        },
        {
            autoCommit: true
        })
        .then((result) =>{
            status = true
        })
        .finally(() => db.close())
        .catch((err) => {
            console.log("Erro na Operação: criar controle de envio de confirmacaode agendamento", err)
            status = false
        })
    return status
}

module.exports = {
    confirmarConsulta,
    confirmarExame
}
