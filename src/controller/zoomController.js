const { getFips } = require('crypto')
const zoomDAO = require('../DAO/zoomDAO')
const telemedicinaDAO = require('../DAO/telemedicinaDAO');

async function postZoom(req, res){
    const { email, cdPessoaFisica, nr_atendimento, APIKey, APISecret, myToken, nome, origem_requisicao } = req.body

    console.log({email, cdPessoaFisica, nr_atendimento, APIKey, APISecret, myToken, nome, origem_requisicao});

    if (!email || !cdPessoaFisica || !nr_atendimento || !APIKey || !APISecret || !myToken || !nome){
        return res .status(200).send({
            "status": "fail",
            "message": "Dados incompletos"
        })
    }

    const origem_requisicao_v = origem_requisicao ? origem_requisicao : 'OUTRO';

    if (origem_requisicao_v === "TELEMEDICINA_PS") {
        console.log('ATENDIMENTO PS TELE');
        let zoomTempTelemedicinaPS = new Array();
        let tempFirebaseTelemedicinaPSWEB = new Array();
        const zoomTelemedicinaPS = await zoomDAO.postZoom(email, APIKey, APISecret)
        zoomTempTelemedicinaPS.push(zoomTelemedicinaPS)

        const tokenFireBaseChatbot = await telemedicinaDAO.buscarTokenFirebaseChatbot(nr_atendimento);

        let lkSala = 'https://call-samel-001.samel.com.br/paciente@samel.com.br/'+zoomTempTelemedicinaPS[0].pmi+'/'+zoomTempTelemedicinaPS[0].personal_meeting_url.substr(41, 32);
        let idSala = zoomTempTelemedicinaPS[0].pmi;
        let pwSala = zoomTempTelemedicinaPS[0].personal_meeting_url.substr(41, 32);
        let chave = tokenFireBaseChatbot.dados.TOKEN_FIREBASE;

        console.table({idSala, pwSala, chave, lkSala});

        const firebaseTelemedicinaPSWEB = await zoomDAO.firebaseWEB(idSala, pwSala, chave, lkSala);
        tempFirebaseTelemedicinaPSWEB.push(firebaseTelemedicinaPSWEB);
        return res.status(200).json({
            "status": "success",
            "message": "Chamada realizada com sucesso.",
            "dados": zoomTempTelemedicinaPS[0],
            "idsala": zoomTempTelemedicinaPS[0].pmi,
            "pwSala": zoomTempTelemedicinaPS[0].personal_meeting_url.substr(41, 32)
        })
    }

    const notificacao = await zoomDAO.notificacao(cdPessoaFisica, nr_atendimento)
    
    if(notificacao.dados != null || notificacao == []){
        let zoomTemp = []
        let firebaseIOSTemp = []
        let firebaseANDROIDTemp = []
        let firebaseWEBTemp = []

        const zoom = await zoomDAO.postZoom(email, APIKey, APISecret)
        zoomTemp.push(zoom)
        
        for(let item of notificacao.dados){
            if(item.plataformaDispositivo == 'IOS'){
                if ( zoomTemp != null ){
                    let idSala = zoomTemp[0].pmi
                    let pwSala = zoomTemp[0].personal_meeting_url.substr(41, 32)
                    let chave = item.chaveNotificacao
            
                    const firebaseIOS = await zoomDAO.firebaseIOS(idSala, pwSala, chave)
                    firebaseIOSTemp.push(firebaseIOS)
                }
            }else if(item.plataformaDispositivo == 'ANDROID'){
                if ( zoomTemp != null ){
                    let idSala = zoomTemp[0].pmi
                    let pwSala = zoomTemp[0].personal_meeting_url.substr(41, 32)
                    let chave = item.chaveNotificacao
            
                    const firebaseANDROID = await zoomDAO.firebaseAndroid(idSala, pwSala, chave, myToken, nome)
                    firebaseANDROIDTemp.push(firebaseANDROID)
                } 
            }else if(item.plataformaDispositivo == 'BROWSER'){
                if ( zoomTemp != null ){
                    let lkSala = 'https://call-samel-001.samel.com.br/paciente@samel.com.br/'+zoomTemp[0].pmi+'/'+zoomTemp[0].personal_meeting_url.substr(41, 32)
                    let idSala = zoomTemp[0].pmi
                    let pwSala = zoomTemp[0].personal_meeting_url.substr(41, 32)
                    let chave = item.chaveNotificacao
            
                    const firebaseWEB = await zoomDAO.firebaseWEB(idSala, pwSala, chave, lkSala)
                    firebaseWEBTemp.push(firebaseWEB)
                }
            }
        }

        const android = firebaseANDROIDTemp.length > 0 ? firebaseANDROIDTemp[0].sucesso : false
        const ios = firebaseIOSTemp.length > 0 ? firebaseIOSTemp[0].sucesso : false 
        const web = firebaseWEBTemp.length > 0 ? firebaseWEBTemp[0].sucesso : false
  
        if(android || ios || web){
            return res.status(200).send( {
                "status": "success",
                "message": "Chamada realizada com sucesso.",
                "dados": zoomTemp[0],
                "idsala": zoomTemp[0].pmi,
                "pwSala": zoomTemp[0].personal_meeting_url.substr(41, 32)
            })
        }
        else{
            return res.status(200).send({
                "status": "fail",
                "message": "Não foi possivel realizar a chamada.",
                "dados": {}
            })
        }
    }else{
        return res.status(200).send({
            "status": "fail",
            "message": "Não foi possivel realzar a chamada, não existem chaves de notificação.",
            "dados": {}
        })
    }
}

async function clearZoom(req, res){
    if ( !req.params.dsEmailZoom){
        return res .status(200).send({
            "status": "fail",
            "message": "Dados incompletos"
        })
    }

    const clear = await zoomDAO.clearZoom(req.params.dsEmailZoom)

    if(clear.retorno == true){
        return res.status(200).send({
            "status": "Sucesso"
        })
    }
}

async function getToken(req, res){
    if (!req.body.cdPessoaFisica){
        return res .status(400).send({
            "status": "fail",
            "message": "Dados incompletos"
        })
    }

    const dados = await zoomDAO.getToken(req.body.cdPessoaFisica)

    if(dados.sucesso == true){
        return res.status(200).send({
            "status" : "Sucesso",
            "dados"  : dados
        })
    }
    else{
        return res.status(200).send({
            "status": "fail",
            "message": "Dados não encontrados"
        })
    }
}

module.exports  = {
    postZoom,
    clearZoom,
    getToken
}