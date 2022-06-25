const guiaDAO = require('../DAO/guiaDAO')
const FormData = require('form-data')
const axios = require('axios')
const fs = require('fs')
const clinicDAO = require('../DAO/clinicDAO')
const utilsJWT  = require('../utils/utilsJWT')
const eventoDAO = require('../DAO/eventoDAO')
var base64Img = require('base64-img')

var sendSMS = require('../utils/sendSMS.js')

async function getGuia(req, res){

	const tokenUser = await utilsJWT.getIdToken(req.headers['token']) // get ID clinic from client token -> tokenUser.id

	if ( !req.params.idGuia || isNaN(req.params.idGuia)){
		return res.status(200).send({"status": "fail", "message": "Dados incompletos"})
	}
	
	
	let guia = await guiaDAO.getGuia( req.params.idGuia, tokenUser.id )
	
	if (  Object.entries(guia).length > 0  ){
		return res.status(200).send({"status": 'OK', "message": "Guia  encontrada em nosso banco de dados",'dados': guia })
	}
	else{
		return res.status(200).send({"status": 'fail', "message": "Número da guia não encontrada em nosso banco de dados", 'dados': null})		
	}
} 

async function getGuiaPorClinica(req, res, next){

	let listGuias = await guiaDAO.getGuiasPorClinica('263')

	return res.status(200).send({
		"status": "sucess",
		"message": "consulta realizada com sucesso",
		"dados": listGuias
	})

}

async function getGuiaDetail(req, res, cb){

	if (!req.params.idGuia || !req.params.idProcedimento) 
		return res.status(200).send({"status": "fail", "message": "dados incompletos"})

	const guia = await guiaDAO.getHistoric({ "NUMERO_GUIA": req.params.idGuia, "ID_PROCEDIMENTO": req.params.idProcedimento})
	return res.status(200).send({"status": "fail", "message": "consulta realizada com sucesso", "dados": guia}) 

}	

async function confirmProcedure(req, res){

	console.log('file req', req.file)

	if ( !req.params.idGuia || !req.params.estruturaProcedure || !req.params.cpfClient ){
		return res.status(200).send({"status": "fail", "message": "Necessário informar Procedimento, CPF e número da guia"})
	}	

	// if ( checkImagemInserted(req.params.cpfClient) ){
	// 	return res.status(200).send({"status": "fail", "message": "Cliente não tem cadastro no banco de imagens"})
	// }
	const tokenUser = await utilsJWT.getIdToken(req.headers['token']) // get ID clinic from client token -> tokenUser.id
	

	base64Img.base64( req.file.path , function(err, data){
		if (err){
			console.log(err)
			return res.status(200).status({"status": "fail", "message": "Erro ao converter imagem em base64"})
		}

		let imageSemType = data.replace(/^data:image\/[a-z]+;base64,/, "") // Removendo strigs de identificação de imagem

 		let bodyFormData = new FormData() // iniciando obj para montar formData
 		bodyFormData.append('nrCpf', req.params.cpfClient) // add nrCpf ao formulário
 		bodyFormData.append('image', imageSemType) // add image ao formulario
	

		const a = axios.post('http://192.168.2.57:5003/classify', bodyFormData, { // iniciando consumo da API de reconhecimento facial
 		headers: bodyFormData.getHeaders() // add hearder http ao axios
	 	})
	 	.then(function(result){
	 		if ( result.data.default_face_matching_classification === true ){ // teste de autorização de face
	 			fs.unlink(req.file.path , (error) => {console.log(error)}); // removendo a imagem salva.
	 			const guia = guiaDAO.getGuia(req.params.idGuia, tokenUser.id, req.params.cpfClient)
	 			.then(function(result){
	 				if (result.length == 1){ 
	 					const a = eventoDAO.create({
	 						"ID_CLINICA": tokenUser.id,
	 						"NUMERO_GUIA": req.params.idGuia,
	 						"PROCEDIMENTO": req.params.estruturaProcedure,
	 						"CPF_PACIENTE": parseInt(req.params.cpfClient)
	 					}).then(function(result){
	 						if (result.rowsAffected == 1)
	 							return res.status(200).send({"status": "sucess", "message": "Cliente autorizado para procedimento"})
	 						else
	 							return res.status(200).send({"status": "fail", "message": "Falha ao registrar atendimento"})
	 					})
	 				}
	 			}) 
	 		}
	 		else{
	 			return res.status(200).send({"status": "fail", "message": "Cliente não autorizado para procedimento"})
			 }
			 
	 		return result
	 	})
	 	.catch(function(err){
	 		if (err.response.data.error_code == 2)
	 			return res.status(200).send({"status": "fail", "message": "Não existe face na imagem enviada."})
	 		console.log(err)
	 	})
	})
	return 
}

async function getAllCinic(req, res, next){	
	
	//const clinic = await clinicDAO.getClinicBanner()
	const clinic = await clinicDAO.getClinic()
	console.log(clinic)

	const clinicBenner = await clinicDAO.getClinicBanner()
	console.log(clinicBenner)

	

	return res.status(200).send({"status": "sucess", "message": "OK ok ok"})
}

async function checkImagemInserted(nrCpf){

	if (!nrCpf)
		return
	
	const bodyFormData01 = new FormData() // iniciando obj para montar formulário
	bodyFormData01.append('nrCpf', nrCpf) // add nrCpf ao formularo

	let b = axios.post('http://192.168.2.57:5003/getFoto', bodyFormData01,  { //inicia consumo da API de reconhecimento facial para checar se CPF conta no banco de daodos.
		headers: bodyFormData01.getHeaders()
	})
	.then(function(result){
		console.log(result.data)
		if (result){
			return true
		}
		else
			return
	})
	.catch(function(err){
		if ( err.response.data.error_code == 3)
			return
	})

	return
}

async function teste0101(req, res, next ){
	console.log('teste');

	const sms = new sendSMS('samel', '102030');
	
	//console.log(sms.getUserBase64())

	sms.invoque_method();
	return res.status(200).send({"status":"OK", "message": "OK OK "})
	
}

async function teste0102(req, res, next){
	console.log(res); 
}

module.exports = { 
	getGuia, 
	confirmProcedure, 
	getAllCinic,
	getGuiaDetail,
	getGuiaPorClinica,
	teste0101,
	teste0102
}

