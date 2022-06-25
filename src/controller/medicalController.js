const medicalDAO = require('../DAO/medicalDAO')
const zoomDAO = require('../DAO/zoomDAO')
const fs = require('fs')

async function getAgenda( req, res ) {
    
    return res.status(200).send({
        "status": "sucess",
        "dados": await medicalDAO.getScheduleByMedic(req.params.crm, req.params.cdConselho)
    })
}


//controller para pegar as agendas de consulta e exames
async function getAgendaPendente( req, res ){
    if ( !req.params.crm || !req.params.cdConselho || !req.params.tipo){
        console.log("informe crm, conselho e tipo controller")
        console.log(req.params.crm, req.params.cdConselho, req.params.tipo )
        return
    }
    return res.status(200).send({
        "status": "success",
        "dados": await medicalDAO.getScheduleByMedicPendent(req.params.crm,  req.params.cdConselho, req.params.tipo)
    })  
}

async function getAgendaExecutada(req, res){
    // to implement
    if ( !req.params.crm || !req.params.cdConselho)
        return

    //const getAgendaExecutada = await
}

async function callPatient( req, res ){
    /**
     *  TASY.CHAMAR_SENHA_PAC_AVULSA(
                            nr_seq_senha_p => :NR_SEQUENCIA,
                            nm_maquina_atual_p => :NM_MAQUINA,
                            nr_seq_fila_p => :nr_seq_fila,
                            cd_senha_p => :CD_SENHA_GERADO,
                            nm_usuario_p => :NM_USUARIO_NREC,
                            nr_seq_local_p => :NR_SEQ_LOCAL);
     */
    

      let dataCall = {
        'nr_seq_senha_p':       req.params.nr_seq_senha_p.toString().trim(), 
        'nm_maquina_atual_p':   req.params.nm_maquina_atual_p.toString().trim(),
        'nr_seq_fila_p':         req.params.nr_seq_fila_p.toString().trim(),
        'cd_senha_p':           req.params.cd_senha_p.toString().trim(),
        'nm_usuario_p':         req.params.nm_usuario_p.toString().trim(),
        'cd_agenda_p':          req.params.cd_agenda_p.toString().trim(),
        'nr_atendimento_p':     req.params.nr_atendimento_p.toString().trim()
     } 
    
    const ret =   await  medicalDAO.callPatient( dataCall )
    .then((result) => {
        
        if ( result.status == 'fail' ){
            return {
                "status": 'fail',
                "message": 'Erro ao chamar paciente',
                "dados":   `${result.err}`
            }
        }
        else {
            return {
                "status": 'success',
                "message": 'Paciente chamado com sucesso',
                "dados":   {}
            }
        }
    }) 
    .catch(
        (err) => {
            console.log('Error', err)
        }
    )
    
    return res.status(200).send( ret )

}

async function getMachines(req, res, cb ){
    const listmachines = await medicalDAO.getMachines();
    
    if ( listmachines.length > 0 )
        return res.status(200).send(listmachines)
    else 
        return res.status(200).send({})
}

async function getMachine(req, res, cb ){
    if ( !req.params.nmMachine ){ 
        return res.status(200).send({
            "stataus": "fail",
            "message": "Dados incompletos"
        })
    }

    const machine = await medicalDAO.getMachine( req.params.nmMachine )
    
    if ( machine.length > 0  ){
        return res.status(200).send({
            "status": "success",
            "message": "Dados da maquina obtidos com sucesso",
            "dados": machine
        })
    }
    else {
        return res.status(200).send({
            "status": "fail",
            "message": "Não foi possível obter os dados",
            "dados": {}
        })
    }
}

async function createAuthRecFace( req, res, cb ){
    /**
     * checking obligatory fields
     * field database:
     * NR_ATENDIMENTO          NOT NULL NUMBER(10) 
     * CD_PESSOA_FISICA_MEDICO NOT NULL NUMBER(10) 
     * CREATED                 NOT NULL DATE       
     * IE_STATUS_REC_FACE      NOT NULL NUMBER(1)  
     */
    
    if ( 
           !req.body.nr_atendimento  
        || !req.body.cd_pessoa_fisica_medico
        || !req.body.ie_status_rec_face
        ){
            return res.status(200).send({
                "status": "fail",
                "message": "Dados incompletos"
            })
        }

        medicalDAO.createLogAuthRecFace({
            "nr_atendimento":           req.body.nr_atendimento,
            "cd_pessoa_fisica_medico":   req.body.cd_pessoa_fisica_medico,
            "ie_status_rec_face":       req.body.ie_status_rec_face
        })

    return res.status(200).send({'ok': 'asd'})
    
}

async function getDoctor(req, res, cb){
    const { crm, cdConselho, tipoAgenda, password } = req.params

    if (!crm || !cdConselho || !tipoAgenda) {
        return res.status(200).send({
            "status": "fail",
            "message": "Dados incompletos"
        })
    }

    let zoom = []
    
    if(tipoAgenda == "Telemedicina" || tipoAgenda == "TelemedicinaPS"){
        const dadosZoom = await zoomDAO.consultaZoomDisponivel()
        if(dadosZoom.dados.length > 0){
            zoom = dadosZoom.dados[0]
        }else{
            return res.status(200).send( {
                "status": "false",
                "message": "Sem usuário zoo disponivel",
            } )
        }
        //const dadosZoomUp = await zoomDAO.updadeZoomDisponivel(dadosZoom.dados[0].email_zoom)
    }

	// console.log('password > ', password);
    
    const doctor = await medicalDAO.getDoctor(crm, cdConselho, password)

	// console.log('doctor result ok')

    if (doctor){
        return res.status(200).send( {
        "status": "success",
        "message": "Dados obtidos com sucesso",
        "dados": doctor,
        "zoom": zoom
        } )
    }else {
        return res.status(200).send({
            "status": "fail",
            "message": "Não encontrado em nossa  base de dados.",
            "dados": {}
        })
    }
}

async function getCount(req, res, cd){
    
    if ( !req.params.crm || ( !req.params.cdConselho || req.params.cdConselho == undefined ) )
        return

    //let agendaCompleta =  new Object
    const agendaCompleta  = await medicalDAO.getScheduleByMedic( req.params.crm, req.params.cdConselho )
    const agendaPendente  = await medicalDAO.getScheduleByMedicPendent( req.params.crm, req.params.cdConselho, req.params.tipo )
    const agendaExecutada = await medicalDAO.getScheduleByMedicExecuted( req.params.crm, req.params.cdConselho )

    console.log()

    
    return res.status(200).send({
        "status": "success",
        "message": "Requisicao realizada com sucesso",
        "dados": {
            "agendado":         agendaCompleta  ? agendaCompleta.length     : 0,
            "agendaPendente":   agendaPendente  ? agendaPendente.length     : 0,
            "agendaExecutada":  agendaExecutada ? agendaExecutada.length    : 0
        }
    })
}

async function regAlertCpf(req, res, cd){
    if ( !req.params.nrAtendimento || !req.params.obs )
        return

    const regAlert = await medicalDAO.regAlertCpf( req.params.nrAtendimento, req.params.obs )
    if ( regAlert ){
        return res.status(200).send({
            "status": "success",
            "message": "Registro realizado com sucesso",
            "dados": {}
        }) 
    }
    else {
        return res.status(200).send({
            "status": "fail",
            "message": "Registro não realizado.",
            "dados": {}
        })
    }
}

async function getClinic(req, res, cd){


    if ( !req.params.cdAgenda && !req.params.diaSemana && !req.params.tipo )
        return res.status(200).send({
            "status": "fail",
            "message": "Dados incompletos: (cd_agenda)"
        })
    
    const clinic = await medicalDAO.getClinic( req.params.cdAgenda, req.params.diaSemana, req.params.tipo )
    
    if ( clinic ){
        return res.status(200).send({
            "status": "success",
            "message": "Sucesso ao obter consultório",
            "dados": clinic
        })
    }
    else {
        return res.status(200).send({
            "status": "fail",
            "message": "Não foi possível obter consultório",
            "dados": {}
        })
    }

}

async function getQueueMachine(req, res, cb){
    if ( !res.params.nmMachine ){
        return res.status(200).send({
            "status": "fail",
            "message": "dados incompletos",
            "dados": {}
        })
    }

    const queueMachine = await  medicalDAO.getQueueOfMachine(nmMachine)
        
}

const getConselho = async  (req, res, cb) => {
    const listConselho = await medicalDAO.getConselho();
    return res.status(200).send({
        "status":   "success",
        "message":  "consulta realizada com sucesso",
        "dados":    listConselho
    })
}

const getMachinesSingleUnit = async (req, res, cb) => { 
    
    if ( !req.params.siglaUnidade  )
        return res.status(200).send({
            "satatus": "faill",
            "message": "Dados incompletos para consulta"
        })
        
    const listmachines  = await medicalDAO.getMachines(req.params.siglaUnidade)
    return res.status(200).send({
        "status":   "success",
        "message":  "consulta realizada com sucesso",
        "dados":    listmachines
    })
}
//
const getSalas = async (req, res) => {
    if(!req.params.cd_setor)
        return res.status(200).send({
            "status": "erro",
            "message": "Dados incompletos, informe o setor"
        })
    
    const listSalas  = await medicalDAO.getSalas(req.params.cd_setor)
    if(!listSalas){
        return res.status(200).send({
            "status": "erro",
            "erro": "Erro ao obter salas"
        })
    }
    return res.status(200).send({
        "status":   "success",
        "message":  "Consulta realizadas com sucesso",
        "dados":    listSalas
    })
}

const getSalasPs = async (req, res) => {
    if(!req.params.cd_setor)
        return res.status(200).send({
            "status": "erro",
            "message": "Dados incompletos, informe o setor"
        })
    
    const listSalas  = await medicalDAO.getSalasPs(req.params.cd_setor)
    if(!listSalas){
        return res.status(200).send({
            "status": "erro",
            "erro": "Erro ao obter salas"
        })
    }
    return res.status(200).send({
        "status":   "success",
        "message":  "Consulta realizadas com sucesso",
        "dados":    listSalas
    })
}

const buscaAtendimeto = async (req, res) => {
    //console.log("chamou a funcao")
    //console.log(req.params.nrAtendimento)
    if(!req.params.nrAtendimento)
        return res.status(200).send({
            "status"    : "erro",
            "message"   : "Dados incompletos, informe o numero do atendimento"
    })
    
    const dadosAtendimento  = await medicalDAO.buscaAtendimeto(req.params.nrAtendimento)
    if(!dadosAtendimento){
        return res.status(200).send({
            "status"    : "erro",
            "erro"      : "Erro ao obter atendimento"
        })
    }
    return res.status(200).send({
        "status"    :   "success",
        "message"   :  "Consulta realizadas com sucesso",
        "dados"     :    dadosAtendimento
    })
}

const logPrescricao = async (req, res) => {
    //console.log("funcao log prescricao!")
    //console.log(req.params.cdPessoaFisica, req.params.idPrescricao, req.params.tokenMed , req.params.nrAtendimento)

    if(!req.params.cdPessoaFisica || !req.params.idPrescricao || !req.params.tokenMed || !req.params.nrAtendimento)
        return res.status(200).send({
            "status"    : "erro",
            "message"   : "Dados incompletos"
        })
    
    const dadosLog = await medicalDAO.logPrescricao(req.params.cdPessoaFisica, req.params.idPrescricao, req.params.tokenMed , req.params.nrAtendimento)
    if(!dadosLog || dadosLog == '' || dadosLog == []){
        return res.status(200).send({
            "status"    : "erro",
            "erro"      : "Erro ao obter paciente"
        })
    }
    return res.status(200).send({
        "status"    :   "success",
        "message"   :   "Consulta realizadas com sucesso",
        "dados"     :   dadosLog
    })
}

const salvaPrescricao = async (req, res) =>{
    //console.log("entrada na salvar prescricao", req.body)

    if(!req.body.nr_atendimento || !req.body.cdPessoaFisica || !req.body.html || !req.body.cd_medico)
    return res.status(200).send({
        "status"    : "fail",
        "message"   : "Dados incompletos"
    })

    const dadosPrescricao = await medicalDAO.insertPrecricao(req.body.nr_atendimento, req.body.cdPessoaFisica, req.body.html , req.body.cd_medico)
    if(!dadosPrescricao || dadosPrescricao == '' || dadosPrescricao == []){
        return res.status(200).send({
            "status"    : "fail",
            "erro"      : "Erro ao obter paciente"
        })
    }
    return res.status(200).send({
        "status"    :   "success",
        "message"   :   "Consulta realizadas com sucesso",
        "dados"     :   dadosPrescricao
    })

}


const recuperaReceita = async(req, res) => {
    
    if(!req.headers['identificador'])
    return res.status(401).send({
        "status"    : "fail",
        "message"   : "Falta identificador"
    })

    const dadosLog = await medicalDAO.buscaLogReceita()
    if(dadosLog.status == 'fail'){
        return res.status(200).send({
            "status"    : "success",
            "erro"      : "Não existe presricoes para recuperar"
        })
    }
    if(dadosLog.status == 'false'){
        return res.status(200).send({
            "status"    : "fail",
            "erro"      : "Erro ao obter log das prescricoes"
        })
    }
    else{
        let data = dadosLog.dados
        let cont = 0
        for(let itens of data){
            //console.log("itens:", itens)
            const obtendoPrescricoes = await medicalDAO.obtendoPrescricoesMemed(itens)
            if(obtendoPrescricoes.status == 'success'){
                const prescricaoHtml = await criaPrescricaoHtml(obtendoPrescricoes.dados.attributes)
                //await salvaLogtxt(prescricaoHtml)
                const logInsertPrescricao = await medicalDAO.insertPrecricao(itens, prescricaoHtml)
                if(logInsertPrescricao.status == 'success'){
                    const updadePrescricao = await medicalDAO.updateLogPrescricao(itens)
                    if(updadePrescricao.status == 'success'){
                        cont++
                    }
                    else{
                        console.log("Não foi possivel fazer o update na prescrição", itens.ID_PRESCRICAO)
                    }
                }
                else{
                    console.log("Não foi possivel fazer o insert na prescrição", itens.ID_PRESCRICAO)
                }
            }
            else{
                console.log("Não foi possivel obter a prescricao do site do memed", itens.ID_PRESCRICAO)
            }
        }
        if(data.length == cont){
            return res.status(200).send({
                "status"    :   "success",
                "message"   :   "Prescricoes salvas sucesso",
                "dados"     :   dadosLog.dados
            })
        }
        else{
            return res.status(200).send({
                "status"    :   "fail",
                "message"   :   "Erro ao salvar algumas prescricoes",
                "dados"     :   dadosLog.dados
            })
        }
    }


/*     return res.status(200).send({
        "status"    :   "success",
        "message"   :   "Consulta realizadas com sucesso",
        "dados"     :   dadosLog.dados
    }) */

}

async function criaPrescricaoHtml(prescricaoJson){
    //console.log(prescricaoJson)
    let html    =   '<html tasy="html5" lang="pt-br"><body style="margin: 0;padding: 0;display:flex; justify-content:center;">'
        //html    +=  '<h2 style="text-align: center;"><label>Receita</label></h3>'
        //html    +=  '<h3 style="text-align: center;"><label>Médico: </label>'+prescricaoJson.medicos.nome_completo+'</h3>'
        //html    +=  '<h3 style="text-align: center;"><label>Nome: </label>'+prescricaoJson.paciente.nome+'</h3>'
        //html    +=  '<div style="text-align: center;"><label> Data da Prescrição: </label>'+prescricaoJson.created_at+'</div><br>'
        html    +=  '<div style="padding: 1%;margin-top: 10px;margin-bottom: 10px;border-radius: 3px;box-shadow: 0 0 1em rgb(196, 195, 195);"><div style="height: 60px;width: 100%;display: flex;justify-content: center;border-radius: 3px;border-style: solid;border-width: 1px;border-color: rgb(56, 55, 55);">'
        html    +=  '<h3 style="font-family: Verdana, Geneva, Tahoma, sans-serif;'+
                    'font-size: 20px;"><label>Medicamentos </label></h3>'+
                    '</div>'+
                    '<div style="width: 100%; border-radius: 3px; padding-top: 20px; margin-top: 8px; border-style: solid; border-width: 1px; border-color: rgb(56, 55, 55); height: 84%; ">'

        prescricaoJson.medicamentos.map(itens =>{
                html    +=  '<ul><li><p style="font-family: Verdana, Geneva, Tahoma, sans-serif; font-size: 13px;"><strong>'+itens.nome+'</strong>'+'  '+itens.quantidade+' '+itens.unit+'</p>'
                html    +=  '<p style="font-family: Verdana, Geneva, Tahoma, sans-serif; font-size: 13px;"><label> Descrição: </label>'+itens.descricao+'</p>'
                html    +=  '<p style="font-family: Verdana, Geneva, Tahoma, sans-serif; font-size: 13px;"><label> Posologia: </label>'+itens.sanitized_posology+'</p>'
                html    +=  '<p style="font-family: Verdana, Geneva, Tahoma, sans-serif; font-size: 13px;"><label> Composição: </label>'+itens.composicao+'</p>'
                html    +=  '<p style="font-family: Verdana, Geneva, Tahoma, sans-serif; font-size: 13px;"><label> Fabricante: </label>'+itens.fabricante+'</p>'
                html    +=  '<p style="font-family: Verdana, Geneva, Tahoma, sans-serif; font-size: 13px;"><label> Titularidade: </label>'+itens.titularidade+'</p></li></ul>'

        })
        html    +=  '</div></div></body></html>'

    return html
}

async function salvaLogtxt(dados){
    //console.log("funcao salva log", dados)
      let esrito = dados
   
      fs.appendFileSync('./dados.html', esrito, (erro) => {
        if(erro) {
          throw erro
        }else{
        console.log("Arquivo salvo")
        }
      })
   
    return true
} 

const getExecComRecFacial = async (req, res) => {
    const {  cd_pf_medico } = req.params;

    if( !cd_pf_medico ) {
        return res.status(400).json({
            "status": "fail",
            "message": "Dados insuficientes para consulta"
        })
    }

    const results = await medicalDAO.getExecComRecFacial(cd_pf_medico);

    if (results) {
        return res.status(200).json({
            "status": "success",
            "message": "Consulta feita com êxito",
            "results": results[0] 
        })

    } else {
        return res.status(404).json({
            "status": "fail",
            "message": "Erro ao fazer a consulta no banco"
        })
    }

}

const getExecSemRecFacial = async (req, res) => {
    const { cd_pf_medico } = req.params;

    if ( !cd_pf_medico ) {
        return res.status(400).json({
            "status": "fail",
            "message": "Dados insuficientes para consulta"
        });
    }

    const results = await medicalDAO.getExecSemRecFacial(cd_pf_medico);

    

    if ( results ) {
        return res.status(200).json({
            "status": "success",
            "message": "Consulta feita com êxito",
            "results": results[0]
        })
    } else {
        return res.status(400).json({
            "status": "fail",
            "message": "Erro ao fazer a consulta no banco"
        })
    }


}

const getTodosAgendados = async (req, res) => {
    const { cd_agenda } = req.params;

    if ( !cd_agenda ) {
        return res.status(400).json({
            "status": "fail",
            "message": "cd_agenda não informado"
        })
    }

    const results = await medicalDAO.getTodosAgendados(cd_agenda);

    if ( results ) {
        return res.status(200).json({
            "status": "success",
            "message": "Consulta feita com êxito",
            "results": results
        })
    } else {
        return res.status(400).json({
            "status": "fail",
            "message": "Erro ao fazer a consulta no banco"
        })
    }
}




const getSchedulesFromMedic = async (req, res) => {
    const { cd_medico } = req.params;

    if ( !cd_medico ) {
        return res.status(400).json({
            "status": "fail",
            "message": "cd_agenda não informado"
        })
    }

    const results = await medicalDAO.getSchedulesFromMedic(cd_medico);

    if (results.sucesso) {
        return res.status(200).json({ 
            status:'success',
            sucesso:true,
            mensagem:'Busca de agendas realizada com sucesso',
            dados: results.dados
        })
    } else {
        return res.status(400).json({ 
            status:'fail',
            sucesso:false,
            mensagem: results.mensagem,
            dados: []
        })
    }
}



const listMedicalProduction = async (req, res) => {
    const { cd_agenda, dt_inicial, dt_final, status_agenda } = req.params;

    if ( !cd_agenda|| !dt_inicial || !dt_final || !status_agenda ) {
        return res.status(400).json({
            "status": "fail",
            "message": "faltam paramentros obrigatórios"
        })
    }

    const results = await medicalDAO.listMedicalProduction(cd_agenda, dt_inicial, dt_final, status_agenda);

    if (results.sucesso) {
        return res.status(200).json({ 
            status:'success',
            sucesso:true,
            mensagem:'Sucesso ao listar produção médica',
            dados: results.dados
        })
    } else {
        return res.status(400).json({ 
            status:'fail',
            sucesso:false,
            mensagem: results.mensagem,
            dados: []
        })
    }
}


module.exports  = {
    getAgenda,
    getAgendaPendente,
    callPatient,
    getMachines,
    getQueueMachine,
    getMachine,
    createAuthRecFace,
    getAgendaExecutada, 
    getDoctor,
    getCount,
    regAlertCpf,
    getClinic,
    getConselho,
    getMachinesSingleUnit, 
    getSalas,
    getSalasPs,
    buscaAtendimeto,
    logPrescricao,
    recuperaReceita,
    salvaPrescricao,
    getExecComRecFacial,
    getExecSemRecFacial,
    getTodosAgendados,
    getSchedulesFromMedic,
    listMedicalProduction
    
}

