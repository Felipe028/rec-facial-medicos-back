const daoUtils 		= require('./DAOUtils')
const oracledb 		= require('oracledb')
const sql 			= require('mssql')
const eventoDAO 	= require('./eventoDAO')
const tokenDAO 		= require('./tokenDAO')
const telefoneDAO 	= require('./telefoneDAO')
const recFacial 	= require('../DAOUtils/recFacial') 

async function getGuia(numberGuia, idClinic, cpfUser = '' )
{	
	//console.log( 'numero guia', numberGuia )
	//console.log('idClinica', idClinic)
	//console.log('cpf', cpfUser)
	if (!daoUtils.poolPromise){
		//console.log('Nao existe o Poll')
		return
	}

	if (!numberGuia || !idClinic)
		return

	
	try {
		let result = ''
		if (cpfUser == ''){
			const request = new daoUtils.sql.Request(await daoUtils.poolPromise)
			request.input('numberGuia', sql.VarChar, numberGuia)
			request.input('idClinica', sql.VarChar, idClinic)
			
		    result = await request.query`
				SELECT
					T4.BENEFICIARIO,
					T10.CPF,
					T4.NOME,
					T5.DESCRICAO,
					T3.QTDAUTORIZADA,
					T5.ESTRUTURA,
					CONVERT(VARCHAR,T3.DATAATENDIMENTO,103) AS DATAATENDIMENTO,
					T1.AUTORIZACAO,
					T7.NOME AS SOLICITANTE,
					T8.NOME AS EXECUTOR,
					T8.HANDLE AS HANDLEEXECUTOR,
					T9.NOME AS LOC_EXECUCAO,
					CONVERT(VARCHAR, T10.DATANASCIMENTO,103) as DATANASCIMENTO
				FROM
					SAM_AUTORIZ T1
					LEFT JOIN SAM_AUTORIZ_EVENTOSOLICIT T2 ON (T2.AUTORIZACAO = T1.HANDLE)
					LEFT JOIN SAM_AUTORIZ_EVENTOGERADO T3 ON (T3.EVENTOSOLICITADO = T2.HANDLE)
					LEFT JOIN SAM_BENEFICIARIO T4 ON (T1.BENEFICIARIO = T4.HANDLE)
					LEFT JOIN SAM_TGE T5 ON (T3.EVENTOGERADO = T5.HANDLE)
					LEFT JOIN SAM_CONTRATO T6 ON (T4.CONTRATO = T6.HANDLE)
					LEFT JOIN SAM_PRESTADOR T7 ON (T2.SOLICITANTE = T7.HANDLE)
					LEFT JOIN SAM_PRESTADOR T8 ON (T2.EXECUTOR = T8.HANDLE)
					LEFT JOIN SAM_PRESTADOR T9 ON (T2.LOCALEXECUCAO = T9.HANDLE)
					LEFT JOIN SAM_MATRICULA T10 ON T10.HANDLE = T4.MATRICULA
				WHERE	
					T3.SITUACAO IN ('A','L')
					AND T1.AUTORIZACAO = @numberGuia
					AND T8.HANDLE = @idClinica
				ORDER BY
					1;
				`
		    
	    }
	    else {
	    	const request = new daoUtils.sql.Request(await daoUtils.poolPromise)
			request.input('numberGuia', sql.VarChar, numberGuia)
			request.input('idClinica', sql.VarChar, idClinic)
			request.input('cpfUser', sql.VarChar, cpfUser)
		    result = await request.query`
				SELECT
					T4.BENEFICIARIO,
					T10.CPF,
					T4.NOME,
					T5.DESCRICAO,
					T3.QTDAUTORIZADA,
					T5.ESTRUTURA,
					CONVERT(VARCHAR,T3.DATAATENDIMENTO,103) AS DATAATENDIMENTO,
					T1.AUTORIZACAO,
					T7.NOME AS SOLICITANTE,
					T8.NOME AS EXECUTOR,
					T8.HANDLE AS HANDLEEXECUTOR,
					T9.NOME AS LOC_EXECUCAO,
					CONVERT(VARCHAR,T10.DATANASCIMENTO,103) as DATANASCIMENTO
				FROM
					SAM_AUTORIZ T1
					LEFT JOIN SAM_AUTORIZ_EVENTOSOLICIT T2 ON (T2.AUTORIZACAO = T1.HANDLE)
					LEFT JOIN SAM_AUTORIZ_EVENTOGERADO T3 ON (T3.EVENTOSOLICITADO = T2.HANDLE)
					LEFT JOIN SAM_BENEFICIARIO T4 ON (T1.BENEFICIARIO = T4.HANDLE)
					LEFT JOIN SAM_TGE T5 ON (T3.EVENTOGERADO = T5.HANDLE)
					LEFT JOIN SAM_CONTRATO T6 ON (T4.CONTRATO = T6.HANDLE)
					LEFT JOIN SAM_PRESTADOR T7 ON (T2.SOLICITANTE = T7.HANDLE)
					LEFT JOIN SAM_PRESTADOR T8 ON (T2.EXECUTOR = T8.HANDLE)
					LEFT JOIN SAM_PRESTADOR T9 ON (T2.LOCALEXECUCAO = T9.HANDLE)
					LEFT JOIN SAM_MATRICULA T10 ON T10.HANDLE = T4.MATRICULA
				WHERE
					
					 T3.SITUACAO IN ('A','L')
					AND T1.AUTORIZACAO = @numberGuia
					AND T8.HANDLE = @idClinica
					AND T10.CPF = @cpfUser
				ORDER BY
					1;
				`	    
		}

		/**
		 * Atencao para o bloco abaixo.
		 * Temos duas promises. uma para percorremos a lista de guias e outra para buscar a quantidade de procedimentos realizados da guia. 
		 * Usada a tecnica Promise.all()
		 */
		/* const guia = new Object
		if  ( result.recordset.length() > 0 ){
			guia.BENEFICIARIO = result.recordset[0].BENEFICIARIO
		} */
		
		let formatGuia = new Object;
		if ( result.recordset.length > 0 ){
			formatGuia.BENEFICIARIO 		= result.recordset[0].BENEFICIARIO;
			formatGuia.CPF 					= result.recordset[0].CPF;
			formatGuia.NOME 				= result.recordset[0].NOME;
			formatGuia.DATANASCIMENTO		= result.recordset[0].DATANASCIMENTO;
			formatGuia.DATAATENDIMENTO 		= result.recordset[0].DATAATENDIMENTO;
			formatGuia.AUTORIZACAO			= result.recordset[0].AUTORIZACAO;
			formatGuia.SOLICITANTE 			= result.recordset[0].SOLICITANTE;
			formatGuia.EXECUTOR				= result.recordset[0].EXECUTOR;
			formatGuia.HANDLEEXECUTOR		= result.recordset[0].HANDLEEXECUTOR;
			formatGuia.LOC_EXECUCAO			= result.recordset[0].LOC_EXECUCAO;
			formatGuia.TELEFONES			= await telefoneDAO.telefonesByNrCarteirinha(result.recordset[0].BENEFICIARIO);
			if ( await  recFacial.getRecFacial(result.recordset[0].CPF) ){
				formatGuia.RECFACIALCADASTRADO = "S"
				formatGuia.IMAGEMPACIENTE = await recFacial.getImg(result.recordset[0].CPF)
				
			}
			else{
				formatGuia.RECFACIALCADASTRADO = "N"
				formatGuia.IMAGEMPACIENTE = null
				
			}

		}

		const aaa = result.recordset.map(async (singleGuia, index, array) => {
			return await this.getContExaRealizado({
				"NUMERO_GUIA": 	singleGuia.AUTORIZACAO.toString(),
				"PROCEDIMENTO": singleGuia.ESTRUTURA.toString()
			})
			.then(async function(result1) {
				
				// get singleGuiaUpdated = singleGuia
				let singleProcedimento = new  Object
				singleProcedimento.ESTRUTURA 	 = singleGuia.ESTRUTURA;
				singleProcedimento.DESCRICAO 	 = singleGuia.DESCRICAO;
				singleProcedimento.QTDAUTORIZADA = singleGuia.QTDAUTORIZADA;
				singleProcedimento.QTDRESTANTES  = singleGuia.QTDAUTORIZADA - result1.QUANTIDADE
				singleProcedimento.QTDREALIZADA  = result1.QUANTIDADE
				
				/**
				 * verificando se o procedimento ja foi realizado hoje.
				 */
				const procedureMakedToday = await eventoDAO.getEventoToday( singleGuia.AUTORIZACAO, singleGuia.ESTRUTURA )
				singleProcedimento.QTDREALIZADOHOJE = procedureMakedToday.length
				if ( procedureMakedToday.length > 0 ){
					singleProcedimento.REALIZADOHOJE = 'S'
				}
				else{
					singleProcedimento.REALIZADOHOJE = 'N'
				}
					
				
				/**
				 * verifricando se procedimento tem solicitacao de liberacao de procedimento pendente
				 */
				const getConfirmPending = await tokenDAO.getConfirmPendingToday( singleGuia.AUTORIZACAO, singleGuia.ESTRUTURA )
				if ( getConfirmPending.length > 0 )
					singleProcedimento.AGUARDANDOCONFIRMACAODIAATUAL = "S"
				else
					singleProcedimento.AGUARDANDOCONFIRMACAODIAATUAL = "N"
				

				/**
				 * Verificando quantas vezes o procedimento pode ser realizado no mesmo dia.  
				 */
				const getQtdEventToday = await eventoDAO.getQtdRepeatToday(singleGuia.ESTRUTURA)
				singleProcedimento.QTDDIARIADEEVENTO = getQtdEventToday.QTD_DIARIA 

				return singleProcedimento
			})
			.catch( err => {
				console.log(err)
				return
			}) 
		})
		/**
		 * resolvendo o Promise.all() como informado anteriomente.
		 */
		const listProcediemtos = await Promise.all(aaa)
		
		if ( listProcediemtos.length > 0 )
			formatGuia.PROCEDIMENTOS = listProcediemtos
		return formatGuia
		
	} catch(e) {
		console.log(e)
		return
	}
}

async function getGuiasPorClinica( cdClinica ){
	if (!daoUtils.poolPromise){
		console.log('Nao existe o Poll')
		return
	}
	const request = new daoUtils.sql.Request(await daoUtils.poolPromise)
	

	request.input( 'cdClinica', sql.VarChar, cdClinica )
	try{
	
	const result = await request.query`
	with result as (
		SELECT
			ROW_NUMBER() over (order by T3.DATAATENDIMENTO desc ) as linha,
			T4.BENEFICIARIO,
			T10.CPF,
			T4.NOME,
			T5.DESCRICAO,
			T3.QTDAUTORIZADA,
			T5.ESTRUTURA,
			CONVERT(VARCHAR,T3.DATAATENDIMENTO,103) AS DATAATENDIMENTO,
			T1.AUTORIZACAO,
			T7.NOME AS SOLICITANTE,
			T8.NOME AS EXECUTOR,
			T8.HANDLE AS HANDLEEXECUTOR,
			T9.NOME AS LOC_EXECUCAO,
			T10.DATANASCIMENTO as DATANASCIMENTO
		FROM
			SAM_AUTORIZ T1
			LEFT JOIN SAM_AUTORIZ_EVENTOSOLICIT T2 ON (T2.AUTORIZACAO = T1.HANDLE)
			LEFT JOIN SAM_AUTORIZ_EVENTOGERADO T3 ON (T3.EVENTOSOLICITADO = T2.HANDLE)
			LEFT JOIN SAM_BENEFICIARIO T4 ON (T1.BENEFICIARIO = T4.HANDLE)
			LEFT JOIN SAM_TGE T5 ON (T3.EVENTOGERADO = T5.HANDLE)
			LEFT JOIN SAM_CONTRATO T6 ON (T4.CONTRATO = T6.HANDLE)
			LEFT JOIN SAM_PRESTADOR T7 ON (T2.SOLICITANTE = T7.HANDLE)
			LEFT JOIN SAM_PRESTADOR T8 ON (T2.EXECUTOR = T8.HANDLE)
			LEFT JOIN SAM_PRESTADOR T9 ON (T2.LOCALEXECUCAO = T9.HANDLE)
			LEFT JOIN SAM_MATRICULA T10 ON T10.HANDLE = T4.MATRICULA
		WHERE
	
			T3.SITUACAO IN ('A','L')
			--AND T10.CPF = '91882605268'
			AND T8.HANDLE = @cdClinica
			--ORDER BY
			--	T3.DATAATENDIMENTO desc	
				)
	select 
		BENEFICIARIO,
		CPF,
		NOME,
		DESCRICAO,
		QTDAUTORIZADA,
		ESTRUTURA,
		DATAATENDIMENTO AS DATAATENDIMENTO,
		AUTORIZACAO,
		SOLICITANTE,
		EXECUTOR,
		HANDLEEXECUTOR,
		LOC_EXECUCAO,
		DATANASCIMENTO
	from result where linha between 0 and 50; 
	`
	return result.recordset
	}
	catch($err){
		console.log($err)	
	}
}

async function  getGuiasPorCPF( nrCPF ){
	if ( !nrCPF ){
		return
	}


}

async function getContExaRealizado(data){
	
	if(!data.NUMERO_GUIA && !data.PROCEDIMENTO)
		return
	
	const conn = await oracledb.getConnection()
	return conn.execute(`select count(*) as quantidade 
		from 
			consumo_guias_exames_externos 
		where 
			NUMERO_GUIA = :v_numeroGuia 
			AND PROCEDIMENTO = :v_procedimento`,
		{
			"v_numeroGuia": 	{"dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": data.NUMERO_GUIA},
			"v_procedimento": 	{"dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": data.PROCEDIMENTO}
		},
		{
			outFormat: oracledb.OBJECT
		})
		.then(function(result){
			//console.log(result.rows[0])
			return result.rows[0]
		})
		.finally(function(){
			conn.close()
		})
		.catch(function(err){
			console.log(err)
			return
		})
}

async function getHistoric(data){
	if (!data.NUMERO_GUIA && !data.ID_PROCEDIMENTO)
		return

	const conn = await oracledb.getConnection()
	return conn.execute(`
			select 
				ID, ID_CLINICA, NUMERO_GUIA, PROCEDIMENTO, CPF_PACIENTE, to_char(DATA, 'dd/mm/yyyy') DATA, 
				to_char(DATA, 'hh24:mi') HORA
			from samel.consumo_guias_exames_externos 
    		where 
    			NUMERO_GUIA =  :w_numeroGuia
    			AND PROCEDIMENTO = :w_idProcedimento
    		order by samel.consumo_guias_exames_externos.DATA desc
		`, 
		{ 
			"w_numeroGuia": 	{ "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": data.NUMERO_GUIA },
			"w_idProcedimento": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": data.ID_PROCEDIMENTO }
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
			console.log(err)
		})
}


module.exports = {
	getGuia,
	getContExaRealizado,
	getHistoric,
 	getGuiasPorClinica

} 