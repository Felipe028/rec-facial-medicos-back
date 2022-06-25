const daoUtils = require('./DAOUtils')
const sql = require('mssql')
const oracledb = require('oracledb')
const enderecoClinicaDAO = require('./enderecoBennerDAO')


async function getClinicBanner( handleClinic = null )
{	
	if (!daoUtils.poolPromise){
	//	console.log('Nao existe o Poll')
		return
	}

	try {
		const request = new daoUtils.sql.Request(await daoUtils.poolPromise)
		let result = ''

		if (  Number.isInteger( handleClinic )) {
			request.input('handleClinic', sql.Int, handleClinic)
			result = await request.query`
				SELECT
				T1.HANDLE,
				T1.NOME,
				T1.CPFCNPJ,
				T1.EMAIL,
				T2.DESCRICAO AS CONSELHOREGIONAL,
				--T3.LOGRADOURO,
				--T3.NUMERO,
				--T3.PONTOREFERENCIA,
				--T3.BAIRRO,
				--T4.NOME AS UFCR,
				--T5.NOME AS MUNICIPIO,
				--'(' + T3.DDD1 + ') ' +  T3.NUMERO1 + '-' +  T3.PREFIXO1 as TELEFONE1,
				--'(' + T3.DDD2 + ') ' +  T3.NUMERO2 + '-' +  T3.PREFIXO3 as TELEFONE2,
				--'(' + T3.DDD3 + ') ' +  T3.NUMERO2 + '-' +  T3.PREFIXO3 as TELEFONE3,
				-- CONCAT('(',T3.DDD1,') ', T3.NUMERO1,'-', T3.PREFIXO1 ) as TELEFONE1 ,
				-- CONCAT('(',T3.DDD2,') ', T3.NUMERO2,'-', T3.PREFIXO3 ) as TELEFONE2 ,
				-- CONCAT('(',T3.DDD3,') ', T3.NUMERO2,'-', T3.PREFIXO3 ) as TELEFONE3 ,
				T1.INSCRICAOCR,
				CONVERT(VARCHAR,T1.DATAINSCRICAOCR,103) AS DATA_INSCRICAOCR
			FROM
				SAM_PRESTADOR T1
				LEFT JOIN SAM_CONSELHO T2 ON (T1.CONSELHOREGIONAL = T2.HANDLE)
				--LEFT JOIN SAM_PRESTADOR_ENDERECO T3 ON (T3.PRESTADOR = T1.HANDLE)
				--LEFT JOIN ESTADOS T4 ON (T3.ESTADO = T4.HANDLE)
				--LEFT JOIN MUNICIPIOS T5 ON (T3.MUNICIPIO = T5.HANDLE)
				
			WHERE
				1 = 1
				and t1.DATADESCREDENCIAMENTO is null
				AND T1.TIPOPRESTADOR in (2,12)
				AND T1.HANDLE = @handleClinic
			ORDER BY	
				1 ;
			`
		}
		else {
			result = await request.query`
				SELECT
					T1.HANDLE,
					T1.NOME,
					T1.CPFCNPJ,
					T1.EMAIL,
					T2.DESCRICAO AS CONSELHOREGIONAL,
					--T3.LOGRADOURO,
					--T3.NUMERO,
					--T3.PONTOREFERENCIA,
					--T3.BAIRRO,
					--T4.NOME AS UFCR,
					--T5.NOME AS MUNICIPIO,
					--CONCAT('(',T3.DDD1,') ', T3.NUMERO1,'-', T3.PREFIXO1 ) as TELEFONE1 ,
					--CONCAT('(',T3.DDD2,') ', T3.NUMERO2,'-', T3.PREFIXO3 ) as TELEFONE2 ,
					--CONCAT('(',T3.DDD3,') ', T3.NUMERO2,'-', T3.PREFIXO3 ) as TELEFONE3 ,
					T1.INSCRICAOCR,
					CONVERT(VARCHAR,T1.DATAINSCRICAOCR,103) AS DATA_INSCRICAOCR
				FROM
					SAM_PRESTADOR T1
					LEFT JOIN SAM_CONSELHO T2 ON (T1.CONSELHOREGIONAL = T2.HANDLE)
					--LEFT JOIN SAM_PRESTADOR_ENDERECO T3 ON (T3.PRESTADOR = T1.HANDLE)
					--LEFT JOIN ESTADOS T4 ON (T3.ESTADO = T4.HANDLE)
					--LEFT JOIN MUNICIPIOS T5 ON (T3.MUNICIPIO = T5.HANDLE)
					
				WHERE
					1 = 1
					and t1.DATADESCREDENCIAMENTO is null
					AND T1.TIPOPRESTADOR in (2,12)
				ORDER BY	
					1 ;
				`
		}  

		if ( result.recordset && result.recordset.length == 1){
			
			result.recordset[0].ENDERECOS = await enderecoClinicaDAO.getEnderecos( result.recordset[0].HANDLE ).then((result) => {
				return result
			})
		}
		
		return result.recordset
       
	} catch(e) {
		console.log(e);
		return
	}
}

async function getClinic( data = {} ){
	const conn = await oracledb.getConnection()

	return await conn.execute(`
			select * from samel.clinica_rec_facial
		`,
		{},
		{
			outFormat: oracledb.OBJECT
		})
		.then(function (result){
			return result.rows
		})
		.finally(function(){
			conn.close()
		})
		.catch(function(err){
			console.log("ClinicDAO", err)
			return
		})
}

async function craeteClinic(data= {}){
	const conn = await oracledb.getConnection()

	if (!data.ID || !data.USERNAME || !data.PASS || !data.STATUS)
		return

	return conn.execute(`insert into samel.clinica_rec_facial values (:v_id, :v_username, :v_pass, :v_status)`, 
		{ 
			"v_id": 		{"dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": data.ID },
			"v_username": 	{"dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": data.USERNAME },
			"v_pass":  		{"dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": data.PASS},
			"v_status":  	{"dir": oracledb.BIND_IN, "type": oracledb.CHAR, "val": data.STATUS}
		}, 
		{
			autoCommit: true
		})
		.then(function(result){
			if ( result.rowsAffected == 1)
				return result
			else
				return

		})
		.finally(function() {
			conn.close()
		})
		.catch(function(err){
			console.log(`${data.ID}`, err)
			return
		})
}
async function getClinicSamelLogin(data = {}){
	
	if (!data.USERNAME || !data.PASS)
		return

	const conn = await oracledb.getConnection()

	let authClinic = await conn.execute(`select ID, USERNAME, STATUS from samel.clinica_rec_facial 
		where 
			USERNAME = :v_username 
			AND PASS = :v_pass 
			AND STATUS = 'S'`,
		{ 
			"v_username": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": data.USERNAME },
			"v_pass": 	  { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": data.PASS}
		},
		{
			outFormat: oracledb.OBJECT
		})
	.then(function(result){
		return result.rows
	})
	.finally(function(){
		conn.close()
	})
	.catch(function(err){
		console.log("Error", err)
	})

	let  clinicFormated = new Object
	if ( Object.entries(authClinic).length === 1  ){	
		clinicFormated = await Promise.all( 
			authClinic.map( async (result) => {
				const clinicBanner =  await this.getClinicBanner(result.ID)
				
				let clinic = new Object
				if ( clinicBanner.length === 1 ){
					clinic.ID 				 = result.ID
					clinic.USERNAME 		 = result.ID
					clinic.STATUS 			 = result.STATUS
					clinic.NOME 			 = clinicBanner[0].NOME 
					clinic.CNPJ 			 = clinicBanner[0].CPFCNPJ 
					clinic.EMAIL 			 = clinicBanner[0].EMAIL
					clinic.CONSELHOREGIONAL  = clinicBanner[0].CONSELHOREGIONAL
					clinic.ENDERECOS		 = clinicBanner[0].ENDERECOS 
				}
				return clinic
			})
		)
	}
	return clinicFormated
}

module.exports = {
	getClinicBanner,
	getClinic,
	craeteClinic,
	getClinicSamelLogin
} 