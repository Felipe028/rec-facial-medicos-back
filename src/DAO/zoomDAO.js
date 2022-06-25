//include required modules
const jwt = require('jsonwebtoken');
const config = require('./zoomConfigDAO');
const rp = require('request-promise');
const oracledb = require('oracledb')
const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
//var email, userid, resp;
const port = 3000;

//Use the ApiKey and APISecret from config.js



//get the form 
app.get('/', (req,res) => res.send(req.body));

///////////////////////////////////////////////////////


async function clearZoom(emailZoom){

    let retorno = {
        retorno: ''
    }

    const update = await oracledb.getConnection()

    await update.execute(`
                UPDATE  samel.telemedicina_zoom_users
                SET ie_status = 'D'
                where ds_email = :email  
    `,
    {
        "email": {"dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": emailZoom.toString().trim() }
    },
    {
        outFormat:oracledb.OBJECT,
        autoCommit: true
    }).then(result =>{
        console.log("result up",result)
        retorno.retorno = true
    }).finally( () => {
        update.close()
    }).catch( err => {
        console.log( "erro up",err )
        retorno.retorno = null
    })

    return retorno
    

}

async function postZoom( email, APIKey, APISecret ){
    if (!email)
        return false

        const payload = {
            iss: APIKey,
            exp: ((new Date()).getTime() + 5000)
        };
        const token = jwt.sign(payload, APISecret);

    let dados = []

    var options = {
        //You can use a different uri if you're making an API call to a different Zoom endpoint.
        uri: "https://api.zoom.us/v2/users/"+email, 
        qs: {
            status: 'active' 
        },
        auth: {
            'bearer': token
        },
        headers: {
            'User-Agent': 'Zoom-api-Jwt-Request',
            'content-type': 'application/json'
        },
        json: true //Parse the JSON string in the response
    };

    //Use request-promise module's .then() method to make request calls.
    await rp(options)
    .then(async (response) => {
    //printing the response on the console
        if(response != null){
            dados = response
        }
        else{
            dados = null
        }
    })
    .catch((err) => {
        // API call failed...
        console.log('API call failed, reason ', err)
        dados = null
    })
    return dados

}

async function firebaseAndroid(idSala, pwSala, ds_chave_notificacao, myToken, nome){
    let retorno = {
        codigo: 1,
        sucesso: true,
        mensagem: "",
        dados : {}
    }

    let data = {
        //to: id do usuario que vai ser feito a chamada 
        "to": ds_chave_notificacao,
        "data":{
            "idsala": idSala,
            pwSala,
            "tipo": "Telemedicina",
            nome,
            myToken            
        }
    }
        
    await axios.post(`https://fcm.googleapis.com/fcm/send`, data, {
        headers:{
            "Authorization": "key=AAAAkV_RCAE:APA91bHHaeiqJQZffKAUWcoNASfMMcghjX7-mYHNJns4TBi9vlErzSuwyzqlRYHGyAbkGYYX-gSxkt7KtUXL-WAygSs4s_nnJE4KHS9eCY35mb3qye2bFRTqjS0yr-ppThXwr8B9s3UH",
            "Content-Type": "application/json"
        }
    }).then(response =>{
        retorno.dados = response.data
    }).catch(err =>{
        console.log("resultado do erro firebase", err)
        retorno.dados = null
    })

    return retorno
}

async function firebaseIOS( idSala, pwSala, ds_chave_notificacao ){

    let retorno = {
        codigo: 1,
        sucesso: true,
        mensagem: "",
        dados : {}
    }
    let data = {
        //to: id do usuario que vai ser feito a chamada 
        "to": ds_chave_notificacao, 
         "notification":{
            "idsala": idSala,
            "pwSala": pwSala,
            "tipo":"Telemedicina",
            "content_available": true,
            "priority": "high",
            "nome":"teste"
        }, 
    }

    await axios.post(`https://fcm.googleapis.com/fcm/send`, data, {
        headers:{
            "Authorization": "key=AAAAkV_RCAE:APA91bHHaeiqJQZffKAUWcoNASfMMcghjX7-mYHNJns4TBi9vlErzSuwyzqlRYHGyAbkGYYX-gSxkt7KtUXL-WAygSs4s_nnJE4KHS9eCY35mb3qye2bFRTqjS0yr-ppThXwr8B9s3UH",
            "Content-Type": "application/json"
        }
    }).then(response =>{
        //console.log("resutado do firebase IOS: ", response)
        retorno.dados = response
    }).catch(err =>{
        console.log("resultado do erro firebase", err)
        retorno.dados = null
    })
    return retorno
}

async function firebaseWEB( idSala, pwSala, ds_chave_notificacao, lkSala ){

    console.log('HEREEEEE');
    //console.log(lkSala)

    let retorno = {
        codigo: 1,
        sucesso: true,
        mensagem: "",
        dados : {}
    }
    let data = {
        //to: id do usuario que vai ser feito a chamada 
        "to": ds_chave_notificacao,
        "notification": {
            "idsala": idSala,
            "pwSala": pwSala,
            "linkSala": lkSala,
            "tipo":"Telemedicina",
            "title": "Atenção sua consulta ja vai começar!",
            "body": "Entre no portal do paciente pelo app ou navegador!",
            "click_action": lkSala
        },
      "webpush": {
            "fcm_options": {
        "link": "https://dummypage.com"
            }
        }
    }

    console.log(data);

    await axios.post(`https://fcm.googleapis.com/fcm/send`, data, {
        headers:{
            "Authorization": "key=AAAAkV_RCAE:APA91bHHaeiqJQZffKAUWcoNASfMMcghjX7-mYHNJns4TBi9vlErzSuwyzqlRYHGyAbkGYYX-gSxkt7KtUXL-WAygSs4s_nnJE4KHS9eCY35mb3qye2bFRTqjS0yr-ppThXwr8B9s3UH",
            "Content-Type": "application/json"
        }
    }).then(response =>{
        //console.log("resutado do firebase: ", response)
        retorno.dados = response
    }).catch(err =>{
        console.log("resultado do erro firebase WEB", err)
        retorno.dados = null
    })
    return retorno
}


async function getToken(cdPessoaFisica){
    let retorno = {
        codigo: 1,
        sucesso: true,
        mensagem: "",
        dados: []
    }

    const conn = await oracledb.getConnection()

	await conn.execute(`select * from appv2.tb_usuario u 
    join (
        select
            aa.cd_usuario,
            aa.cd_sessao,
            aa.ds_chave,
            aa.ds_chave_notificacao,
            aa.cd_plataforma_dispositivo
            from APPV2.TB_SESSAO aa
            join appv2.tb_usuario ab on ( aa.cd_usuario = ab.cd_usuario )
            where (aa.cd_usuario, aa.dt_criacao, aa.cd_plataforma_dispositivo) in (
                        select 
                        a.cd_usuario,
                        max(b.dt_criacao) as dt_criacao,
                        b.cd_plataforma_dispositivo
                    from appv2.tb_usuario a
                    join APPV2.TB_SESSAO b on a.cd_usuario = b.cd_usuario
                    where 
                            a.cd_usuario = aa.cd_usuario
                            and b.cd_plataforma_dispositivo in ('ANDROID', 'IOS')
                    group by a.cd_usuario,b.cd_plataforma_dispositivo 
            ) ) tt on tt.cd_usuario = u.cd_usuario
            where 
                u.cd_pessoa_fisica in ( select a.cd_pessoa_fisica_titular
                                        from appv2.log_agendamento_telemedicina a
                                        join tasy.agenda_consulta b on a.nr_sequencia_agenda = b.nr_sequencia
                                        where a.cd_pessoa_fisica_titular = :cdPessoaFisica
                                        union all 
                                        select a.cd_pessoa_fisica_titular
                                        from appv2.log_agendamento_telemedicina a
                                        join tasy.agenda_consulta b on a.nr_sequencia_agenda = b.nr_sequencia
                                        where a.cd_pessoa_fisica_dependente = :cdPessoaFisica)`, 
		{ 
			"cdPessoaFisica": {"dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": cdPessoaFisica.toString() },

		}, 
		{
			outFormat: oracledb.OBJECT
	})
    .then((response) =>{
        if(response.rows.length > 0){       
            
            for(let item of response.rows){
                let data = { 
                                    chaveNotificacao:           item.DS_CHAVE_NOTIFICACAO ? item.DS_CHAVE_NOTIFICACAO : '',
                                    plataformaDispositivo:      item.CD_PLATAFORMA_DISPOSITIVO ? item.CD_PLATAFORMA_DISPOSITIVO : '',        
                                } 
                retorno.dados.push(data)
            }
              
        }
        else{
            retorno.sucesso = false
            retorno.dados = null
        }

    })
    .finally(()=>conn.close())
    .catch(err =>{
        console.log("resultado do erro firebase", err)
        retorno.dados = null
        retorno.sucesso = false
    })
    return retorno

}


async function notificacao(cdPessoaFisica, nr_atendimento){

    let retorno = {
        codigo: 1,
        sucesso: true,
        mensagem: "",
        dados: []
    }

    const conn = await oracledb.getConnection()

	await conn.execute(`select * from appv2.tb_usuario u 
    join (
        select
            aa.cd_usuario,
            aa.cd_sessao,
            aa.ds_chave,
            aa.ds_chave_notificacao,
            aa.cd_plataforma_dispositivo
            from APPV2.TB_SESSAO aa
            join appv2.tb_usuario ab on ( aa.cd_usuario = ab.cd_usuario )
            where (aa.cd_usuario, aa.dt_criacao, aa.cd_plataforma_dispositivo) in (
                        select 
                        a.cd_usuario,
                        max(b.dt_criacao) as dt_criacao,
                        b.cd_plataforma_dispositivo
                    from appv2.tb_usuario a
                    join APPV2.TB_SESSAO b on a.cd_usuario = b.cd_usuario
                    where 
                            a.cd_usuario = aa.cd_usuario
                            and b.cd_plataforma_dispositivo in ('ANDROID', 'IOS', 'BROWSER')
                    group by a.cd_usuario,b.cd_plataforma_dispositivo 
            ) ) tt on tt.cd_usuario = u.cd_usuario
            where 
                u.cd_pessoa_fisica in ( select a.cd_pessoa_fisica_titular
                                        from appv2.log_agendamento_telemedicina a
                                        join tasy.agenda_consulta b on a.nr_sequencia_agenda = b.nr_sequencia
                                        and b.nr_atendimento = :nr_atendimento
                                        where a.cd_pessoa_fisica_titular = :cdPessoaFisica
                                        union all 
                                        select a.cd_pessoa_fisica_titular
                                        from appv2.log_agendamento_telemedicina a
                                        join tasy.agenda_consulta b on a.nr_sequencia_agenda = b.nr_sequencia
                                        and b.nr_atendimento = :nr_atendimento
                                        where a.cd_pessoa_fisica_dependente = :cdPessoaFisica)`, 
		{ 
			"cdPessoaFisica": {"dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": cdPessoaFisica.toString() },
			"nr_atendimento": {"dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": nr_atendimento.toString() },
		}, 
		{
			outFormat: oracledb.OBJECT
	})
    .then((response) =>{
        if(response.rows.length > 0){       
            
            for(let item of response.rows){
                let data = { 
                                    chaveNotificacao:           item.DS_CHAVE_NOTIFICACAO ? item.DS_CHAVE_NOTIFICACAO : '',
                                    plataformaDispositivo:      item.CD_PLATAFORMA_DISPOSITIVO ? item.CD_PLATAFORMA_DISPOSITIVO : '',        
                                } 
                retorno.dados.push(data)
            }
              
        }
        else{
            retorno.dados = null
        }

    })
    .finally(()=>conn.close())
    .catch(err =>{
        console.log("resultado do erro firebase", err)
        retorno.dados = null
    })
    return retorno
}



async function consultaZoomDisponivel(){
    let retorno = {
        dados: []
    }

    const selec = await oracledb.getConnection()
	await selec.execute(`
                        select * from samel.telemedicina_zoom_users 
                        where ie_status = 'D' 
                        order by ds_email FETCH FIRST 1 ROWS ONLY 
                        `,
    {},
    {
        outFormat:oracledb.OBJECT
    }
    ).then(result =>{
        if(result.rows.length > 0){       
            for(let item of result.rows){
                let data = { 
                                email_zoom:                      item.DS_EMAIL ? item.DS_EMAIL : '',
                                api_key_zoom:                    item.DS_API_KEY ? item.DS_API_KEY : '',  
                                api_secret_zoom:                 item.DS_API_SECRET ? item.DS_API_SECRET : '',      
                            } 
                retorno.dados.push(data)
            }      
        }
    }).finally( () => {
        selec.close()
    })
    .catch( err => {
        console.log( err )
        return
    })
    return retorno
}


async function updadeZoomDisponivel(email){
    let retorno = {
        dados: []
    }

    const update = await oracledb.getConnection()

    await update.execute(`UPDATE  samel.telemedicina_zoom_users
                            SET ie_status = 'I'
                        where ds_email = :email`,
                {
                    "email": {"dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": email.toString().trim() }
                },
                {
                    outFormat:oracledb.OBJECT,
                    autoCommit: true
                }
                ).then(result =>{
                    retorno.dados = true
                }).finally( () => {
                update.close()
                })
                .catch( err => {
                console.log( "erro up",err )
                retorno.dados = null
                })

                return retorno
}

module.exports = {
    postZoom,
    firebaseIOS,
    firebaseAndroid,
    firebaseWEB,
    notificacao,
    consultaZoomDisponivel,
    updadeZoomDisponivel, 
    clearZoom,
    getToken
}
