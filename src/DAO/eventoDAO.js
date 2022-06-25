const daoUtils = require('./DAOUtils')
const oracledb = require('oracledb')


async function create(data){
	
	if (!data.ID_CLINICA && !data.NUMERO_GUIA && !data.PROCEDIMENTO  && !data.CPF_PACIENTE)
		return

	const insert = await oracledb.getConnection()
//insert into consumo_guias_exames_externos values (SEQ_CONS_EXA_EX.nextval, 1622, '54790328', '2.01.03.662','91882605268' , sysdate )

	return insert.execute(`insert into consumo_guias_exames_externos 
			values
			(
				SEQ_CONS_EXA_EX.nextval,
				:v_idClinica,
				:v_numeroGuia,
				:v_procedimento,
				:v_cpf_paciente,
				sysdate
			)`,
		{
			"v_idClinica": 		{"dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": data.ID_CLINICA.toString()},
			"v_numeroGuia": 	{"dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": data.NUMERO_GUIA.toString()},
			"v_procedimento": 	{"dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": data.PROCEDIMENTO.toString()},
			"v_cpf_paciente":  	{"dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": data.CPF_PACIENTE.toString()}
		},
		{
			autoCommit: true
		})
		.then(function(result){
			return result
		})
		.finally(function(){
			insert.close()
		})
		.catch(function(err){
			console.log("Erro ao inserir", err )
			return
		})
	
}
/**
 * 
 * @param {numegoGuia|cd_guia} numeroGuia 
 * @param {procedimento|estrutura} procedimento 
 */
 async function getEventoToday( numeroGuia, procedimento ){
	
	const getEvento = await oracledb.getConnection()
	return await getEvento.execute(
		`
			select * 
				from 
					consumo_guias_exames_externos CS
				where
					CS.DATA between trunc(sysdate) and trunc(sysdate) + 0.9999
					AND NUMERO_GUIA = :numeroGuia
					AND PROCEDIMENTO = :procedimento
		`,
		{
			"numeroGuia": 	{ "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": numeroGuia.toString() 	},
			"procedimento": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": procedimento.toString()	}
		},
		{
			outFormat: oracledb.OBJECT
		}
	)
	.then( result => {
		return result.rows
	})
	.finally(() => {
		getEvento.close()
	})
	.catch( err => {
		console.error( "Erro ao obter evento diario", err )
		return
	})

}


async function getQtdRepeatToday( procedimento ){

	const getProcedimento = await oracledb.getConnection();
	
	return await getProcedimento.execute(
		`select * from samel.detalhe_procedimentos where cd_tuss = :cd_tuss `,
		{ 
			'cd_tuss': { 'dir': oracledb.BIND_IN, 'type': oracledb.STRING, 'val': procedimento } 
		},
		{
			outFormat: oracledb.OBJECT
		}
	)
	.then( result => {
		
		if ( result.rows.length > 0 )
			return { 
				'CD_TUSS': procedimento, 
				'QTD_DIARIA': result.rows[0].QTD_DIARIA 
			}
		else
			return { 
				'CD_TUSS': procedimento, 
				'QTD_DIARIA': 1 
			}
		
	})
	.finally(() => getProcedimento.close())
	.catch(error => {
		console.error("Erro ao  obter qtd de eventos diarios", error)
		return 
	}) 
	;
}
module.exports = {
	create,
	getEventoToday,
	getQtdRepeatToday
}