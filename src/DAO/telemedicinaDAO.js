const oracledb = require('oracledb');

const listarAtendimentos = async () => {
    const retorno = new Object;
    retorno.status = false;
    const sql = `
    select
        w.nr_atendimento                            as NR_ATENDIMENTO,
        w.nm_pessoa_fisica                          as NM_PESSOA_FISICA,
        w.nm_pessoa_fisica                          as NM_PACIENTE,
        w.cd_pessoa_fisica                          as CD_PESSOA_FISICA,
        w.cd_pessoa_fisica                          as CD_PESSOA_FISICA_PACIENTE,
        to_char(b.dt_nascimento, 'dd/mm/yyy')       as DT_NASCIMENTO,
        round((sysdate - b.dt_nascimento) / 365, 0) as IDADE,
        round((sysdate - b.dt_nascimento) / 365, 0) as ANO,
        w.status_atendimento                        as IE_STATUS_AGENDA_COD,
        to_char(w.dt_entrada_fila, 'dd/mm/yyyy')    as DT_DATA_VARCHAR,
        to_char(w.dt_entrada_fila, 'hh24:mi:ss')    as DT_HORA_VARCHAR,
        w.dt_entrada_fila                           as DT_ENTRADA_FILA,
        w.token_firebase                            as TOKEN_FIREBASE
    from samel.fila_atendimento_telemedicina w
    join tasy.pessoa_fisica b on (w.cd_pessoa_fisica = b.cd_pessoa_fisica)
    where 1 = 1
        and trunc(w.dt_entrada_fila) = trunc(sysdate)
    order by w.dt_entrada_fila asc
    `;
    const db = await oracledb.getConnection();
    await db.execute(sql,
        {

        },
        {
            outFormat: oracledb.OBJECT, autoCommit: true
        } 
    )
    .then(result => {
        retorno.dados = result.rows
        retorno.msg = 'Fila Telemedicina carregada com sucesso!'
        retorno.status = true
    })
    .finally(() => db.close())
    .catch(err => {
        console.log('Erro em listarAtendimentos DAO > ', err);
        retorno.status = false;
        retorno.dados = [];
        retorno.err = err
        retorno.msg = 'Ocorrou algum erro ao carregar a Fila Telemedicina'
    })

    return retorno;
}

const gerarAltaPaciente = async (nr_atendimento, nm_usuario, cd_motivo_alta) => {
    const retorno = new Object;
    retorno.status = false;
    const sql = `
    begin
    saida_setor_servico(nr_atendimento_p        => :nr_atendimento_p,
                        cd_setor_atendimento_p  => 175,
                        cd_motivo_alta_p        => :cd_motivo_alta_p,
                        dt_alta_p               => sysdate,
                        nm_usuario_p            => :nm_usuario_p);
    end;
    `;
    const db = await oracledb.getConnection();
    await db.execute(sql,
        {
            ':nr_atendimento_p':        { dir: oracledb.BIND_IN, type: oracledb.NUMBER, val: Number(nr_atendimento) },
            ':cd_motivo_alta_p':        { dir: oracledb.BIND_IN, type: oracledb.NUMBER, val: Number(cd_motivo_alta) },
            ':nm_usuario_p':            { dir: oracledb.BIND_IN, type: oracledb.STRING, val: nm_usuario.toString() }
        },
        {
            outFormat: oracledb.OBJECT, autoCommit: true
        } 
    )
    .then(result => {
        retorno.msg = 'Alta gerada com sucesso!';
        retorno.status = true;
    })
    .finally(() => db.close())
    .catch(err => {
        console.log('Erro em gerarAltaPaciente DAO > ', err);
        retorno.status = false;
        retorno.dados = [];
        retorno.err = err
        retorno.msg = 'Ocorrou algum erro ao gerar alta!'
    })

    return retorno;
}

const mudarStatusAtendimento = async (nr_atendimento, set_status, nm_usuario) => {
    if (set_status == 'E') {
        gerarAltaPaciente(nr_atendimento, nm_usuario, 19) // 19 === Alta médica + Receita + Orientações
    } else if (set_status == 'F') {
        gerarAltaPaciente(nr_atendimento, nm_usuario, 6) // 6 === Evadiu-se
    }
    const retorno = new Object;
    retorno.status = false;
    const sql = `
    update samel.fila_atendimento_telemedicina
    set status_atendimento = :set_status
    where nr_atendimento = :nr_atendimento
    `;
    const db = await oracledb.getConnection();
    await db.execute(sql,
        {
            ':nr_atendimento':  { dir: oracledb.BIND_IN, type: oracledb.NUMBER, val: Number(nr_atendimento) },
            ':set_status':      { dir: oracledb.BIND_IN, type: oracledb.STRING, val: set_status.toString() }
        },
        {
            outFormat: oracledb.OBJECT, autoCommit: true
        } 
    )
    .then(result => {
        if(result.rowsAffected === 1) {
            retorno.dados = result.rowsAffected;
            retorno.msg = 'Status de atendimento atualizado com sucesso!';
            retorno.status = true;
        } else {
            retorno.msg = 'Ocorrou algum erro ao trocar o status do atendimento!';
            retorno.status = false;
        }
    })
    .finally(() => db.close())
    .catch(err => {
        console.log('Erro em mudarStatusAtendimento DAO > ', err);
        retorno.status = false;
        retorno.dados = [];
        retorno.err = err
        retorno.msg = 'Ocorrou algum erro ao trocar o status do atendimento!'
    })
    return retorno;
}

const buscarTokenFirebaseChatbot = async nr_atendimento => {
    const retorno = new Object;
    retorno.status = false;
    const sql = `
    select 
        token_firebase as TOKEN_FIREBASE 
    from samel.fila_atendimento_telemedicina
    where 1 = 1
    and nr_atendimento = :nr_atendimento
    `;
    const db = await oracledb.getConnection();
    await db.execute(sql,
        {
            ':nr_atendimento': { dir: oracledb.BIND_IN, type: oracledb.NUMBER, val: Number(nr_atendimento) }
        },
        {
            outFormat: oracledb.OBJECT, autoCommit: true
        } 
    )
    .then(result => {
        console.log('CADE A CHAVEEEEEEEEEEEE');
        console.log(result.rows);
        retorno.dados = result.rows[0]
        retorno.msg = 'Token Firebase encontrado!';
        retorno.status = true;
    })
    .finally(() => db.close())
    .catch(err => {
        console.log('Erro em buscarTokenFirebaseChatbot DAO > ', err);
        retorno.status = false;
        retorno.dados = [];
        retorno.err = err
        retorno.msg = 'Ocorrou algum erro ao procurar o Token Firebase!'
    })

    return retorno;
}

module.exports = {
    listarAtendimentos,
    mudarStatusAtendimento,
    buscarTokenFirebaseChatbot
};