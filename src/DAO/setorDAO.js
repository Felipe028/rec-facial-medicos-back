const oracledb = require('oracledb');

async function setSetor(nome_setor, sigla_setor) {
    let retorno = {
        status: false,
        msg: '',
    };

    const db = await oracledb.getConnection();
    await db.execute(`INSERT INTO samel.setor (
                            nome_setor,
                            sigla_setor
                        ) 
                        VALUES (
                            :nome_setor,
                            :sigla_setor
                        )
                    `,
        {
            ':nome_setor': { dir: oracledb.BIND_IN, type: oracledb.STRING, val: nome_setor.toString()},
            ':sigla_setor': { dir: oracledb.BIND_IN, type: oracledb.STRING, val: sigla_setor.toString()},
        },
        { outFormat: oracledb.OBJECT, autoCommit: true },
    )
    .then(result => {
        retorno.status = true
        retorno.msg = "Setor cadastrado com sucesso!"
        retorno.dados = result.rows
    })
    .finally(function() {
        db.close();
    })
    .catch(err => {
        retorno.msg = "Erro ao buscar setores" + err;
    });

    return retorno;
}


async function updateSetor(id, nome_setor, sigla_setor) {
    let retorno = {
        status: false,
        msg: '',
    };

    const db = await oracledb.getConnection();
    await db.execute(`UPDATE samel.setor SET
                            nome_setor = :nome_setor,
                            sigla_setor = :sigla_setor
                        WHERE
                            id_setor = :id
                    `,
        {
            ':id': { dir: oracledb.BIND_IN, type: oracledb.NUMBER, val: parseInt(id)},
            ':nome_setor': { dir: oracledb.BIND_IN, type: oracledb.STRING, val: nome_setor.toString()},
            ':sigla_setor': { dir: oracledb.BIND_IN, type: oracledb.STRING, val: sigla_setor.toString() }
        },
        { outFormat: oracledb.OBJECT, autoCommit: true },
    )
    .then(result => {
        retorno.status = true
        retorno.msg = "Setor alterado com sucesso!"
        retorno.dados = result.rows
    })
    .finally(function() {
        db.close();
    })
    .catch(err => {
        retorno.msg = "Erro ao buscar setores" + err;
    });

    return retorno;
}



async function getSetores() {
    let retorno = {
        status: false,
        msg: '',
    };

    const db = await oracledb.getConnection();
    await db.execute(`select * from samel.setor
                    `,
        {},
        { outFormat: oracledb.OBJECT, autoCommit: true },
    )
    .then(result => {
        if(result.rows.length > 0){
            retorno.status = true;
            retorno.msg = "Listar setores";
            retorno.dados = result.rows;
        }else{
            retorno.status = false;
            retorno.msg = "Nenhum setor cadastrado";
        }
    })
    .finally(function() {
        db.close();
    })
    .catch(err => {
        retorno.msg = "Erro ao buscar setores";
    });

    return retorno;
}



async function deleteSetor(id) {
    let retorno = {
        status: false,
        msg: '',
    };

    const db = await oracledb.getConnection();
    await db.execute(`DELETE FROM samel.setor WHERE id_setor = :id`,
        {
            ':id': { dir: oracledb.BIND_IN, type: oracledb.NUMBER, val: parseInt(id)},
        },
        { outFormat: oracledb.OBJECT, autoCommit: true },
    )
    .then(result => {
        retorno.status = true
        retorno.msg = "Setor deletado com sucesso!"
        retorno.dados = result.rows
    })
    .finally(function() {
        db.close();
    })
    .catch(err => {
        retorno.msg = "Erro ao buscar setores" + err;
    });

    return retorno;
}
// <<<<<<<<<<<<<<<<<<<<<>>>>>>>>>>>>>>>>>>>>>>>>>
// <<<<<<<<<<<<<<<<<<<<<>>>>>>>>>>>>>>>>>>>>>>>>>
// <<<<<<<<<<<<<<<<<<<<<>>>>>>>>>>>>>>>>>>>>>>>>>

module.exports = {
    setSetor,
    updateSetor,
    getSetores,
    deleteSetor,
};
