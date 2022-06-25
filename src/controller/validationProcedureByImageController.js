const guiaDAO = require('../DAO/guiaDAO')
const FormData = require('form-data')
const axios = require('axios')
const fs = require('fs')
const clinicDAO = require('../DAO/clinicDAO')
const utilsJWT  = require('../utils/utilsJWT')
const eventoDAO = require('../DAO/eventoDAO')
var base64Img = require('base64-img')

/**
 * 
 * @param { params.idGuia, body.cpfClient ,body.idPorocedimentos[], body.imgPaciente  } req 
 * @param {*} res 
 * @param {*} cb 
 */
async function confirmProceduresByImages(req, res, cb){

    if ( !req.body.imgPaciente || !req.params.idGuia || !req.body.cpfClient || ( !req.body.idProcedimentos || req.body.idProcedimentos.length == 0) ){
        return res.status(200).send({
            "status": "fail",
            "message": "Necessário informar Procedimento, CPF e número da guia"
        })
    }
  

    const tokenUser = await utilsJWT.getIdToken(req.headers['token']) // get ID clinic from client token -> tokenUser.id

    /**
     * A imagem deve vir em base 64
     */
    let imageSemType = req.body.imgPaciente.replace(/^data:image\/[a-z]+;base64,/, "") // Removendo strigs de identificação de imagem.

    let bodyFormData = new FormData() // iniciando obj para montar formData
 		bodyFormData.append('nrCpf', req.body.cpfClient) // add nrCpf ao formulário
 		bodyFormData.append('image', imageSemType) // add image ao formulario
	
        
		const a = await axios.post('http://192.168.2.57:5003/classify', bodyFormData, { // iniciando consumo da API de reconhecimento facial
 		headers: bodyFormData.getHeaders() // add hearder http ao axios
	 	})
	 	.then(async function(result){
            
	 		if ( result.data.default_face_matching_classification === true ){ // teste de autorização de face    
                
                /**
                 * Add array de procediementos
                 */
                const listProcedures = req.body.idProcedimentos

                /**
                 * percorrendo lista de procedimentos e registrando como procedimento executato
                 */
                return listProcedures.map( async (singleProcedure, index, cb) => {
                    console.log( "percorrendo array procedure", singleProcedure )

                    const evento = await eventoDAO.create({
                        "ID_CLINICA": tokenUser.id,
                        "NUMERO_GUIA": req.params.idGuia,
                        "PROCEDIMENTO": singleProcedure,
                        "CPF_PACIENTE": req.body.cpfClient, //se chegar nesse ponto, a guia pode voltar com mais de uma elemento no array. mas o CPF será sempre o mesmo.
                        //"CD_TOKEN" : singleGuia.CD_TOKEN
                    })

                    if ( evento.rowsAffected === 1 ){
                        return {
                            "status":       "success",
                            "numeroGuia":   req.params.idGuia,
                            "procedimento": singleProcedure,
                            //"cd_token" : singleGuia.CD_TOKEN
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
                
	 		}
	 		else{
	 			return res.status(200).send({"status": "fail", "message": "Cliente não autorizado para procedimento"})
			 }
			 
	 		return 
	 	})
	 	.catch(function(err){
	 		if (err.response.data.error_code == 2)
	 			return res.status(200).send({"status": "fail", "message": "Não existe face na imagem enviada."})
         })
        
        
        const resulveAllPromiseA = await Promise.all( a )
        
        
        return res.status(200).send({
                "status": "success",
                "message": "Procedimento(s) autorizado(s) com sucesso. Segue detalhes de autorização",
                "dados": resulveAllPromiseA  ? resulveAllPromiseA : {}
            })
        
}

module.exports = { 
    confirmProceduresByImages 
}