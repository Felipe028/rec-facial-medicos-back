const oracledb = require('oracledb')


const telefonesByNrCarteirinha = async ( nr_carteirinha ) => {
    if ( !nr_carteirinha )
        return

   // console.log(nr_carteirinha)
    const recort = await oracledb.getConnection()

    return recort.execute(`
        select distinct 
            CPS.nr_telefone_celular,  
            CPS.nr_ddd_celular, 
            CPS.nr_ddd_telefone, 
            CPS.nr_telefone
        from tasy.atend_categoria_convenio ACC 
            inner join tasy.atendimento_paciente AP on AP.nr_atendimento = ACC.nr_atendimento
            inner join tasy.compl_pessoa_fisica CPS on CPS.cd_pessoa_fisica = AP.cd_pessoa_fisica
        where 
            ACC.cd_usuario_convenio = :nr_carteirinha
            AND ( CPS.nr_telefone_celular is not null or CPS.nr_telefone is not null )
        `,
    {
        "nr_carteirinha": {"dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": nr_carteirinha}
    },
    {
        outFormat: oracledb.OBJECT
    })
    .then((result) => {

        if ( result.rows.length > 0 ){
            
            return result.rows.map((result1) => {
                if ( result1.NR_TELEFONE_CELULAR && result1.NR_TELEFONE ){
                    return { 
                            "telefone": result1.NR_TELEFONE_CELULAR,
                            "telefone": result1.NR_TELEFONE 
                        }
                }
                else if ( result1.NR_TELEFONE_CELULAR && result1.NR_TELEFONE == null ){
                    return { "telefone": result1.NR_TELEFONE_CELULAR }
                }
                else {
                    return{ "telefone": result1.NR_TELEFONE }
                }
                
            })
            
        }
        return []
    })
    .finally(() => {
        recort.close()
    })
    .catch((err) => {
        console.log("Erro ao obter telefones", err)
    })
}



module.exports = {
    telefonesByNrCarteirinha
} 