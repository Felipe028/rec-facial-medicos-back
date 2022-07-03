const oracledb = require('oracledb');

async function setEscalas( id_setor, id_profissional, id_turno, data_inicio, data_fim ) {
    let retorno = {
        status: false,
        msg: '',
    };

    const db = await oracledb.getConnection();
    await db.execute(`insert into samel.escala (
                                id_setor, 
                                id_profissional, 
                                id_turno, 
                                data_inicio, 
                                data_fim
                            ) 
                            VALUES (
                                :id_setor, 
                                :id_profissional, 
                                :id_turno, 
                                to_date(:data_inicio, 'DD/MM/YYYY'), 
                                to_date(:data_fim, 'DD/MM/YYYY')
                            )
                    `,
        {
            ':id_setor': { dir: oracledb.BIND_IN, type: oracledb.NUMBER, val: parseInt(id_setor)},
            ':id_profissional': { dir: oracledb.BIND_IN, type: oracledb.NUMBER, val: parseInt(id_profissional)},
            ':id_turno': { dir: oracledb.BIND_IN, type: oracledb.NUMBER, val: parseInt(id_turno)},
            ':data_inicio': { dir: oracledb.BIND_IN, type: oracledb.STRING, val: data_inicio.toString()},
            ':data_fim': { dir: oracledb.BIND_IN, type: oracledb.STRING, val: data_fim.toString()},
        },
        { outFormat: oracledb.OBJECT, autoCommit: true },
    )
    .then(result => {
        retorno.status = true
        retorno.msg = "Escala cadastrada com sucesso!"
        retorno.dados = result.rows
    })
    .finally(function() {
        db.close();
    })
    .catch(err => {
        retorno.msg = "Erro ao cadastrar escala" + err;
    });

    return retorno;
}


async function updateEscalas(id, id_setor, id_profissional, id_turno, data_inicio, data_fim) {
    let retorno = {
        status: false,
        msg: '',
    };

    const db = await oracledb.getConnection();
    await db.execute(`UPDATE samel.escala SET
                            id_setor = :id_setor,
                            id_profissional = :id_profissional,
                            id_turno = :id_turno,
                            data_inicio = to_date(:data_inicio, 'DD/MM/YYYY'), 
                            data_fim = to_date(:data_fim, 'DD/MM/YYYY')
                        WHERE
                            id_escala = :id
                    `,
        {
            ':id': { dir: oracledb.BIND_IN, type: oracledb.NUMBER, val: parseInt(id)},
            ':id_setor': { dir: oracledb.BIND_IN, type: oracledb.NUMBER, val: parseInt(id_setor)},
            ':id_profissional': { dir: oracledb.BIND_IN, type: oracledb.NUMBER, val: parseInt(id_profissional)},
            ':id_turno': { dir: oracledb.BIND_IN, type: oracledb.NUMBER, val: parseInt(id_turno)},
            ':data_inicio': { dir: oracledb.BIND_IN, type: oracledb.STRING, val: data_inicio.toString()},
            ':data_fim': { dir: oracledb.BIND_IN, type: oracledb.STRING, val: data_fim.toString()},
        },
        { outFormat: oracledb.OBJECT, autoCommit: true },
    )
    .then(result => {
        retorno.status = true
        retorno.msg = "Escala alterada com sucesso!"
        retorno.dados = result.rows
    })
    .finally(function() {
        db.close();
    })
    .catch(err => {
        retorno.msg = "Erro ao alterar escala" + err;
    });

    return retorno;
}



async function getEscalas() {
    let retorno = {
        status: false,
        msg: '',
    };

    const db = await oracledb.getConnection();
    await db.execute(`select * from samel.escala
                    `,
        {},
        { outFormat: oracledb.OBJECT, autoCommit: true },
    )
    .then(result => {
        if(result.rows.length > 0){
            retorno.status = true;
            retorno.msg = "Listar escalas";
            retorno.dados = result.rows;
        }else{
            retorno.status = false;
            retorno.msg = "Nenhuma escala cadastrada";
        }
    })
    .finally(function() {
        db.close();
    })
    .catch(err => {
        retorno.msg = "Erro ao buscar escalas";
    });

    return retorno;
}



async function deleteEscalas(id) {
    let retorno = {
        status: false,
        msg: '',
    };

    const db = await oracledb.getConnection();
    await db.execute(`DELETE FROM samel.escala WHERE id_escala = :id`,
        {
            ':id': { dir: oracledb.BIND_IN, type: oracledb.NUMBER, val: parseInt(id)},
        },
        { outFormat: oracledb.OBJECT, autoCommit: true },
    )
    .then(result => {
        retorno.status = true
        retorno.msg = "Escala deletada com sucesso!"
        retorno.dados = result.rows
    })
    .finally(function() {
        db.close();
    })
    .catch(err => {
        retorno.msg = "Erro ao deletar escala!" + err;
    });

    return retorno;
}


// <<<<<<<<<<<<<<<<<<<<<>>>>>>>>>>>>>>>>>>>>>>>>>
// <<<<<<<<<<<<<<<<<<<<<>>>>>>>>>>>>>>>>>>>>>>>>>
// <<<<<<<<<<<<<<<<<<<<<>>>>>>>>>>>>>>>>>>>>>>>>>

module.exports = {
    setEscalas,
    updateEscalas,
    getEscalas,
    deleteEscalas,
};
