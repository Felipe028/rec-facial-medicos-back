const guiaDAO = require('../DAO/guiaDAO')
const clinicDAO = require('../DAO/clinicDAO')
const utilsJWT  = require('../utils/utilsJWT')
const eventoDAO = require('../DAO/eventoDAO')
const tokenDAO = require('../DAO/tokenDAO')
var sendSMS = require('../utils/sendSMS.js')
//const Math = require('Math')


async function genarateToken( req, res, cb ){
    

    const tokenUser = await utilsJWT.getIdToken(req.headers['token']) // get ID clinic from client token -> tokenUser.id

    // conferir campos obrigatorios.
    if ( !req.params.idGuia ){
        return res.status(400).send({
            "status": "fail",
            "message": "Dados incompletos"
        })
    }

    const listProcedimentos = req.body.idProcedimentos // lista de procedimentos solicitados    
    const guia = await guiaDAO.getGuia( req.params.idGuia, tokenUser.id ) // obterndo dados do banco para evitar dados falsos.

    let listProcedimentosFiltrados = await listProcedimentos.map(function(idProcedimento, index, array){
        let leva = []
        let bb = guia.filter( swapGuia => {
            /**
             * apenas os procedimentos com quantidade realizada abaxo de quantidade autorizada.
             * apenas os procedimentos que nao foram realizados no dia solicitado.
             */
            if (  swapGuia.ESTRUTURA == idProcedimento && swapGuia.QTDREALIZADA < swapGuia.QTDAUTORIZADA && swapGuia.REALIZADOHOJE == "N" ){    
                leva = swapGuia
                return swapGuia
            }        
        })    
        return leva
    })
    
    // removerndo objetos nulos
    let ret = []
    await listProcedimentosFiltrados.forEach(swapRemoveNull => {
        if (  Object.entries(swapRemoveNull).length > 0  ){
            ret.push( swapRemoveNull )
        }
    });
    
    /**
     * Interrompendo o envio de tokem em casos que não há procedimentos com saldo.
     */
    if ( ret.length == 0 ){
        return res.status(400).send({ "status": "fail", "message": "Procedimento (s) sem saldo para liberação" })
    }

    // Gerando um numero aleatorio para vincular a guia/procedimento do paciente
    const tokenNumber = genarateNumberToken( 100000, 999999 ) 

    /**
     * Inserindo token, guia, procedimento e token.
     * retorno:
     * [{ ID_CLINICA: 263,
     * AUTORIZACAO: 54925657,
     * BENEFICIARIO: '009238760300',
     * NR_TOKEN: 281767,
      *ESTRUTURA: '5.00.00.470' } }]
     */
    const tokenCriado = await tokenDAO.create( ret, tokenNumber,  tokenUser.id )
    
    /**
     * Checando se todos os procedimentos retornados tem status success.
     * Isso garanete que todos os procedimentos na lista estão aguardando confirmação do token via SMS. 
     * Nesse ponto o SMS ainda não foi enviado.
     */
    let statusAllOK = true
    tokenCriado.map( confirmacoes => {
        if ( confirmacoes.status == 'fail' ){
            statusAllok = false
        }
        return
    })
    
    // Interrompendo operaçao caso ocorra falha em algum procedimento
    if ( statusAllOK === false ){
        return res.status(200).send({"status": "fail", "message": "entrar em contato com equipe de dev. Samel",  "dados": tokenCriado })
    }
    
    /**
     * Iniciando o envio de SMS para confirmacao.
     */
    const sms = new sendSMS('samel', '102030');
    const bodyMessage = `Olá! seu token para confirmação de procedimentos externos é: ${tokenNumber} `
    sms.invoque_method(  "092991754763", "Samel - Liberação de procedimentos ", bodyMessage );

    /**
     * salvando os logs de envio de SMS.
     */
    if ( sms.status == "success" ){
        const up = tokenCriado.map( async (token, index, cb) => {
            return await tokenDAO.updateLogSMS( token.dados.CD_TOKEN, sms.status, sms.cause, sms.id_SMS )
            .then( result => {
                if ( result.rowsAffected == 1 )
                    result.rowsAffected = 1
                    return result
            } )
         })
        const saveLogsSMS = await Promise.all( up )
    }

    
    return res.status(200).send({
        "status": "success",
        "message": "Token enviado para paciente. Aguardando confirmação."
    })
}

//\async function sendMessage( numeroGuia, procedimento, celNumber, tokenNumber )

async function conferenceTokenGuia( req,res, cb ){
    
    const tokenUser = await utilsJWT.getIdToken(req.headers['token']) // get ID clinic from client token -> tokenUser.id
    const getGuiaToken = await tokenDAO.getTokenGuia( req.params.idGuia, req.params.token )
    
    if( getGuiaToken.length ===  0 ){
        return res.status(400).send( { "status": "fail", "message": "Token invalido" } )
    }

    /**
     * Iniciando a autorização dos procedimos.
     * futuro criar clase p unificar cod.
     * esse trecho esta copiado em validationProcedureByImageController
     */
    const regAutorizacaoGuiasProcedimentos = getGuiaToken.map( async ( singleGuia, index, cb ) => {
        const guia = await guiaDAO.getGuia( singleGuia.CD_GUIA, tokenUser.id )
        
        if ( guia.length == 0 ){
            return {
                "status": "fail", 
                "message": "erro ao obter dados da guia.", 
                "dados": { 
                    "idGuia": singleGuia.CD_GUIA, 
                    "procedimento": singleGuia.PROCEDIMENTO 
                } 
            }
        }

        const evento = await eventoDAO.create({
            "ID_CLINICA": tokenUser.id,
            "NUMERO_GUIA": singleGuia.CD_GUIA,
            "PROCEDIMENTO": singleGuia.PROCEDIMENTO,
            "CPF_PACIENTE": guia[0].CPF, //se chegar nesse ponto, a guia pode voltar com mais de uma elemento no array. mas o CPF será sempre o mesmo.
            "CD_TOKEN" : singleGuia.CD_TOKEN
        })
        
        if ( evento.rowsAffected === 1 ){
            return {
                "status":       "success",
                "numeroGuia":   singleGuia.CD_GUIA,
                "procedimento": singleGuia.PROCEDIMENTO,
                "cd_token" : singleGuia.CD_TOKEN
            }
        }
        else{
            return {
                "status":       "fail",
                "numeroGuia":   singleGuia.CD_GUIA,
                "procedimento": singleGuia.PROCEDIMENTO
            }
        }
    })
    const guiasProcedimentosAutorizados = await Promise.all(regAutorizacaoGuiasProcedimentos)
    
    /**
     * atualizando dt_confirmacao na tabela de token
     */
    const regConfirmacaoDeLiberacao = guiasProcedimentosAutorizados.map( async  ( guiaAutorizada, index, cb ) => {
        
        const guiaToken1 = await tokenDAO.updateDTConfirmacaoToken( guiaAutorizada.cd_token )

        if ( guiaToken1.rowsAffected == 1 ){
            return {
                "status": "success",
                "message": "Confirmacao atualizada com sucesso",
                "dados": {
                    "numeroGuia":   guiaAutorizada.numeroGuia,
                    "procedimento": guiaAutorizada.procedimento,
                    "cd_token":     guiaAutorizada.cd_token 
                } 
            }
        }

        return guiaToken1

    })

    const resolveRegConfirmacaoDeLiberacao = await Promise.all(regConfirmacaoDeLiberacao)

    return res.status(200).send( { "status": "sucess", "message": "Procedimentos confirmados com sucesso", "dados": resolveRegConfirmacaoDeLiberacao } )

}

function genarateNumberToken( high, low ){
    low = Math.ceil( low )
    high = Math.floor( high )
    return Math.floor( Math.random() * (high - low +1 )) + low
}

module.exports = { 
    genarateToken,
    conferenceTokenGuia
}
