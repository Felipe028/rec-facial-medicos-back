//const guiaDAO = require('../DAO/guiaDAO')
const FormData = require('form-data')
var base64Img = require('base64-img')
const axios = require('axios')
const fs = require('fs')
const clinicDAO = require('../DAO/clinicDAO')

async function getClinicBenner(req, res, next){	
	
	const clinicBenner = await clinicDAO.getClinicBanner()
	return res.status(200).send({"status": "sucess", "message": "Lista de clinicas Benner", "data": clinicBenner })

}

async function getClinic(req, res, next){

	const clinic = await clinicDAO.getClinic()
	return res.status(200).send({"status": "sucess", "message": "Lista de clinicas no reconhecimento facial", "data": clinic})

}

async function integrateClinic(req, res, next){

	var clinicBenner = await clinicDAO.getClinicBanner()
	var clinicSamel = await clinicDAO.getClinic()
	
	let clinicIntegrate = clinicBenner

	let a = []
   
   	
   	
	let aaa = await clinicBenner.map(function(clinicB, index, array){	
		clinicSamel.filter(function (clinn){
			
			if ( clinn.ID == clinicB.HANDLE ){
				a.push(index)
		
			}
		})	
	})
	
	await a.reverse()
	await a.map(function(val, index, array){
		clinicIntegrate.splice(val, 1)
	})
	
	//console.log(clinicIntegrate.length)
	// await a.map(function (val, index, array){
	// 	if (clinicIntegrate.splice(val, 1))
	// 		console.log("certo")
	// 	else
	// 		console.log("erro")
	 	
	// })
	// await clinicIntegrate.splice(134,1)

	// console.log(clinicIntegrate.length)
	
	//console.log(clinicBenner.length)
	
	// clinicIntegrate.map(function(clinic, index, array){
		
	// 		const tt = clinicDAO.craeteClinic({
	// 			"ID": clinic.HANDLE.toString(), 
	// 			"USERNAME": clinic.HANDLE.toString(),
	// 			"PASS": "123",
	// 			"STATUS": "S"
	// 		})
	// 		.then(function (result){
	// 			if (result.rowsAffected == 1){
	// 			 	console.log("Sucess",  clinic.HANDLE.toString())
	// 			}
	// 			else 
	// 				console.log("Atenção",  clinic.HANDLE.toString())
	// 		})
	// 		.catch(function(err){
	// 			console.log("erro", clinic.HANDLE.toString())
	// 		})
			
	// 	}
		
		//console.log(clinic)
	//)


	return res.status(200).send({"status": "sucess", "message": "Lista de clinicas do Benner não cadastradas no reconhecimento facial", "data": clinicIntegrate})
} 

module.exports = { getClinic, getClinicBenner, integrateClinic }

