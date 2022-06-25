const oracledb = require('oracledb')

async function getUnidades(){
    
        const getSetores = await oracledb.getConnection();
        return await getSetores.execute(`
        SELECT NM_UNIDADE, IE_SIGLA, CD_UNIDADE
            FROM appv2.tb_unidade  
            WHERE IE_SIGLA is not null
        `,
        {},
        {
            outFormat: oracledb.OBJECT
        })
        .then((result) => {
            return result.rows
        })
        .finally(()=>getSetores.close())
        .catch((err) => {
            console.log('Erro ao obter setores', err)
            return
        })
 
}


async function getSetores( sigla_unidade = null){
    
    if ( !sigla_unidade ){
       // console.log("getSetores Dao");
        return;
    }

    const getSetores = await oracledb.getConnection();
    return await getSetores.execute(`
        select  distinct cd_Setor_Atendimento, 
                         ds_setor_atendimento
        from 
            TASY.setor_atendimento tsa
            join appv2.tb_unidade_setor atus on ( atus.cd_setor = tsa.cd_setor_atendimento )
            join appv2.tb_unidade atu on ( atu.cd_unidade = atus.cd_unidade )
        where 
            cd_setor_atendimento in (3, 14, 33, 43, 49, 58, 81, 82, 135, 151, 152, 153, 154, 155, 156, 157, 162, 253, 255, 279) and
            atu.ie_sigla = :SIGLA_UNIDADE
            and tsa.IE_SITUACAO = 'A'
    `,
    {
         "SIGLA_UNIDADE": { "bind": oracledb.BIND_IN, "type": oracledb.STRING, "val": sigla_unidade }
    },
    {
        outFormat: oracledb.OBJECT
    })
    .then((result) => {
        return result.rows
    })
    .finally(()=>getSetores.close())
    .catch((err) => {
        console.log('Erro ao obter setores', err)
        return
    })



// async function getSetores( sigla_unidade = null){
    
//     if ( !sigla_unidade ){
//         console.log("getSetores Dao");
//         return;
//     }

//     const getSetores = await oracledb.getConnection();
//     return await getSetores.execute(`
//         select  cd_Setor_Atendimento, 
//                 ds_setor_atendimento,
//         case cd_Setor_Atendimento 
//             when  3 then 'PSA'
//             when  33 then 'PSI'
//             when  49 then 'MAT'
//             else ''
//         end as siglaSetor
//         from 
//             TASY.setor_atendimento tsa
//             join appv2.tb_unidade_setor atus on ( atus.cd_setor = tsa.cd_setor_atendimento )
//             join appv2.tb_unidade atu on ( atu.cd_unidade = atus.cd_unidade )
//         where 
//             cd_setor_atendimento in (3, 33, 49, 159, 160, 161) and
//             atu.ie_sigla = :SIGLA_UNIDADE
//     `,
//     {
//          "SIGLA_UNIDADE": { "bind": oracledb.BIND_IN, "type": oracledb.STRING, "val": sigla_unidade }
//     },
//     {
//         outFormat: oracledb.OBJECT
//     })
//     .then((result) => {
//         return result.rows
//     })
//     .finally(()=>getSetores.close())
//     .catch((err) => {
//         console.log('Erro ao obter setores', err)
//         return
//     })

}

module.exports = { 
    getUnidades,
    getSetores
}