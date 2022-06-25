const daoUtils = require('./DAOUtils')
const oracledb = require('oracledb')


async function getTokenGuia( idGuia, tokenNumber ){

    const tokenGuia = await oracledb.getConnection()

    return await tokenGuia.execute(
        `select * from samel.token_clinica_externa 
        where
            DT_CONFIRMACAO IS NULL 
            AND trunc(DT_CRIACAO) = trunc(sysdate)
            AND CD_GUIA = :id_guia
            AND NR_TOKEN = :nr_token
        `,
        {
            "id_guia":      {"dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": idGuia },
            "nr_token":     {"dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": tokenNumber}
        },
        {
            outFormat: oracledb.OBJECT
        }
    )
    .then( result => {
        return result.rows
    })
    .finally(() => {
        tokenGuia.close()
    })
    .catch( err => {
        console.log( "Erro ao obter token", err )
        return
    } )

}

async function create( procedimentos, tokenNumber, cd_clinica ){
    // Atencao com a validacao do procedimento. Por ora ainda dependo da informacao exata oriunda do controller.
    
    if ( !procedimentos || !tokenNumber || !cd_clinica ){
      //  console.log('falta dados')
        return { "status": "fail", "message": "dados incompletos" }
    }

    const insertGuiasProcedimentos = procedimentos.map( async ( procedimento, index, cb ) => {
        
        return  await insertProcedimento({
                ID_CLINICA:     cd_clinica, 
                AUTORIZACAO:    procedimento.AUTORIZACAO,
                BENEFICIARIO:   procedimento.BENEFICIARIO, 
                NR_TOKEN:       tokenNumber, 
                ESTRUTURA:      procedimento.ESTRUTURA
        })
        .then( result =>  {
            if ( result.rowsAffected == 1 ){
                return { "status": "success", "message": "Confirmação de procedimento realizada com sucesso", "dados": {
                    "ID_CLINICA":     cd_clinica, 
                    "AUTORIZACAO":    procedimento.AUTORIZACAO,
                    "BENEFICIARIO":   procedimento.BENEFICIARIO, 
                    "NR_TOKEN":       tokenNumber, 
                    "ESTRUTURA":      procedimento.ESTRUTURA,
                    "CD_TOKEN":       result.outBinds.outNum[0]
                } }
            }
            else {
                return { "status": "fail", "message": "Confirmação de procedimento não realizada com sucess", "dados": {
                    "ID_CLINICA":     cd_clinica, 
                    "AUTORIZACAO":    procedimento.AUTORIZACAO,
                    "BENEFICIARIO":   procedimento.BENEFICIARIO, 
                    "NR_TOKEN":       tokenNumber, 
                    "ESTRUTURA":      procedimento.ESTRUTURA
                } }
            }
        })
        .catch( err => { 
            console.log( 'Erro ao inserir', err )
            return { "status": "fail", "message": "Confirmação de procedimento não realizada com sucess", "dados": {
                "ID_CLINICA":     cd_clinica, 
                "AUTORIZACAO":    procedimento.AUTORIZACAO,
                "BENEFICIARIO":   procedimento.BENEFICIARIO, 
                "NR_TOKEN":       tokenNumber, 
                "ESTRUTURA":      procedimento.ESTRUTURA
            }}
        })
    })
    
    const resolveAllPromises = await Promise.all( insertGuiasProcedimentos )
    return resolveAllPromises
}

async function insertProcedimento( singleProcedimento ){
    const insert = await oracledb.getConnection()

    return await insert.execute(`
    
    insert into samel.token_clinica_externa values(
        SEQ_TOKEN_CLINICA_EXTERNA.nextval,
        :cd_clinica,
        :cd_guia,
        :cd_carteirinha,
        :nr_token,
        sysdate,
        null,
        sysdate + 2,
        :procedimento,
        null,
        null,
        null
    ) 
    returning cd_token into :outNum
    `,
        {
            "outNum":           {"dir": oracledb.BIND_OUT,"type": oracledb.NUMBER },
            "cd_clinica": 		{"dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": singleProcedimento.ID_CLINICA.toString()},
            "cd_guia": 		    {"dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": singleProcedimento.AUTORIZACAO.toString()},
            "cd_carteirinha": 	{"dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": singleProcedimento.BENEFICIARIO.toString()},
            "nr_token": 		{"dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": singleProcedimento.NR_TOKEN.toString()},
            "procedimento": 	{"dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": singleProcedimento.ESTRUTURA.toString()},
        },
        {
            autoCommit: true
        }
    )
    .then(result => {
        return result
    })
    .finally( () => {
        insert.close()
    })
    .catch( err => {
        console.log( err )
        return 
    })
}

async function updateLogSMS( cdToken, statusApiSMS, causeApiSMS, idApiSMS ){
    
    const update = await  oracledb.getConnection()

    return await update.execute(`update samel.token_clinica_externa 
    set
        STATUS_API_SMS = :status_api_sms,
        COUSE_API_SMS  = :couse_api_sms,
        ID_API_SMS     = :id_api_sms
    where
        CD_TOKEN = :cdToken
    `,
    {
        "status_api_sms":   {"dir": oracledb.BIND_IN, "type": oracledb.BIND_STRING, "val": statusApiSMS},
        "couse_api_sms":    {"dir": oracledb.BIND_IN, "type": oracledb.BIND_STRING, "val": causeApiSMS},
        "id_api_sms":       {"dir": oracledb.BIND_IN, "type": oracledb.BIND_STRING, "val": idApiSMS},
        "cdToken":          {"dir": oracledb.BIND_IN, "type": oracledb.BIND_STRING, "val": cdToken}
    },
    {
        autoCommit: true
    })
    .then( result => {
        return result
    })
    .finally(() => {
        update.close()
    })
    .catch( err => {
        console.log( err )
        return
    })

}

async function updateDTConfirmacaoToken( cd_token ){
    if ( !cd_token ) {
        return { "status": "fail", "message": "dados incompletos para atualizacao" } 
    }

    const update = await oracledb.getConnection()
    return await update.execute(
        `
            update samel.token_clinica_externa
            set
                DT_CONFIRMACAO = SYSDATE
            where
                CD_TOKEN = :cd_token
        `,
        {
            "cd_token": {"dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": cd_token.toString() }
        },
        {
            outFormat: oracledb.OBJECT,
            autoCommit: true
        }
    )
    .then( result => {
        return result
    })
    .finally( () => {
        update.close()
    })
    .catch( err => {
        console.log( err )
        return
    })
}

async function getConfirmPendingToday( numeroGuia, procedimento ){
    const getPendingToday = await oracledb.getConnection()
    return await getPendingToday.execute(
        `
        select * 
            from samel.token_clinica_externa
        where
            DT_CRIACAO between trunc( sysdate ) and trunc( sysdate ) + 0.9999
            AND DT_CONFIRMACAO is null
            AND CD_GUIA = :numero_guia
            AND PROCEDIMENTO = :procedimento
        `,
        {
            "numero_guia":  { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": numeroGuia.toString()  },
            "procedimento": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": procedimento.toString() }
        },
        {
            outFormat: oracledb.OBJECT
        }
    )
    .then( result => {
        return result.rows
    })
    .finally(() => {
        getPendingToday.close()
    })
    .catch( err => {
        console.error("Erro ao obter procedimento pendentes de confirmacao. (today)", err )
        return
    })
}

module.exports = { 
    getTokenGuia,
    create,
    updateLogSMS,
    updateDTConfirmacaoToken,
    getConfirmPendingToday
}