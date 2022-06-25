const mssql = require('mssql')
const daoUtils = require('./DAOUtils')

const getEnderecos = async ( handleClinic ) => {
    if (!handleClinic)
        return
    

    const request = new daoUtils.sql.Request(await daoUtils.poolPromise)

    request.input( 'handlePrestador', mssql.Int, handleClinic )
    result = await request.query`
        SELECT
            T3.LOGRADOURO,
            T3.NUMERO,
            T3.PONTOREFERENCIA,
            T3.BAIRRO,
            T4.NOME AS UFCR,
            T5.NOME AS MUNICIPIO,
            '(' + T3.DDD1 + ') ' +  T3.NUMERO1 + '-' +  T3.PREFIXO1 as TELEFONE1,
            '(' + T3.DDD2 + ') ' +  T3.NUMERO2 + '-' +  T3.PREFIXO3 as TELEFONE2,
            '(' + T3.DDD3 + ') ' +  T3.NUMERO2 + '-' +  T3.PREFIXO3 as TELEFONE3
        FROM
            SAM_PRESTADOR_ENDERECO T3      
            LEFT JOIN ESTADOS T4 ON (T3.ESTADO = T4.HANDLE)
            LEFT JOIN MUNICIPIOS T5 ON (T3.MUNICIPIO = T5.HANDLE)
            
        WHERE
            1 = 1
            AND T3.PRESTADOR = @handlePrestador
        ORDER BY	
            1 ;
    ` ;
    
    return result.recordset
    
}

module.exports = {
    getEnderecos
}