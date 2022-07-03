const oracledb = require('oracledb');

async function setTurnos(nome_turno, entrada, saida) {
    let retorno = {
        status: false,
        msg: '',
    };

    const db = await oracledb.getConnection();
    await db.execute(`INSERT INTO samel.turno (
                            nome_turno,
                            entrada,
                            saida
                        ) 
                        VALUES (
                            :nome_turno,
                            :entrada,
                            :saida
                        )
                    `,
        {
            ':nome_turno': { dir: oracledb.BIND_IN, type: oracledb.STRING, val: nome_turno.toString()},
            ':entrada': { dir: oracledb.BIND_IN, type: oracledb.STRING, val: entrada.toString() },
            ':saida': { dir: oracledb.BIND_IN, type: oracledb.STRING, val: saida.toString() }
        },
        { outFormat: oracledb.OBJECT, autoCommit: true },
    )
    .then(result => {
        retorno.status = true
        retorno.msg = "Turno cadastrado com sucesso!"
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



async function updateTurnos(id, nome_turno, entrada, saida) {
    let retorno = {
        status: false,
        msg: '',
    };

    const db = await oracledb.getConnection();
    await db.execute(`UPDATE samel.turno SET
                            nome_turno = :nome_turno,
                            entrada = :entrada,
                            saida = :saida
                        WHERE
                            id_turno = :id
                    `,
        {
            ':id': { dir: oracledb.BIND_IN, type: oracledb.NUMBER, val: parseInt(id)},
            ':nome_turno': { dir: oracledb.BIND_IN, type: oracledb.STRING, val: nome_turno.toString()},
            ':entrada': { dir: oracledb.BIND_IN, type: oracledb.STRING, val: entrada.toString() },
            ':saida': { dir: oracledb.BIND_IN, type: oracledb.STRING, val: saida.toString() }
        },
        { outFormat: oracledb.OBJECT, autoCommit: true },
    )
    .then(result => {
        retorno.status = true
        retorno.msg = "Turno alterado com sucesso!"
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



async function getTurnos() {
    let retorno = {
        status: false,
        msg: '',
    };

    const db = await oracledb.getConnection();
    await db.execute(`select * from samel.turno
                    `,
        {},
        { outFormat: oracledb.OBJECT, autoCommit: true },
    )
    .then(result => {
        if(result.rows.length > 0){
            retorno.status = true;
            retorno.msg = "Listar turnos";
            retorno.dados = result.rows;
        }else{
            retorno.status = false;
            retorno.msg = "Nenhum turno cadastrado";
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



async function deleteTurno(id) {
    let retorno = {
        status: false,
        msg: '',
    };

    const db = await oracledb.getConnection();
    await db.execute(`DELETE FROM samel.turno WHERE id_turno = :id`,
        {
            ':id': { dir: oracledb.BIND_IN, type: oracledb.NUMBER, val: parseInt(id)},
        },
        { outFormat: oracledb.OBJECT, autoCommit: true },
    )
    .then(result => {
        retorno.status = true
        retorno.msg = "Turno deletado com sucesso!"
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
    setTurnos,
    updateTurnos,
    getTurnos,
    deleteTurno,
};
