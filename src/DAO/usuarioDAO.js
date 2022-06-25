const oracledb = require('oracledb');


async function login(cpf) {
    let retorno = {
        status: false,
        msg: '',
    };

    const db = await oracledb.getConnection();
    await db.execute(`select * from samel.profissional 
		                where 
			                cpf = :cpf
                    `,
        {
            ':cpf': { dir: oracledb.BIND_IN, type: oracledb.STRING, val: cpf.toString()},
        },
        
        { outFormat: oracledb.OBJECT, autoCommit: true },
    )
    .then(result => {
        if(result.rows.length > 0){
            retorno.status = true;
            retorno.msg = "Usuário encontrado";
            retorno.dados = result.rows;
        }else{
            retorno.status = false;
            retorno.msg = "Usuário não encontrado";
        }
    })
    .finally(function() {
        db.close();
    })
    .catch(err => {
        retorno.msg = "Erro ao buscar usuário";
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



async function verificarVagasTurnoSetor(id_setor, id_turno) {
    let retorno = {
        status: false,
        msg: '',
    };

    const db = await oracledb.getConnection();
    await db.execute(`select * from samel.vagas_turno
                        where
                            1 = 1
                            and id_setor = :id_setor
                            and id_turno = :id_turno
                            order by id_vagas_turno desc
                    `,
        {
            ':id_setor': { dir: oracledb.BIND_IN, type: oracledb.NUMBER, val: parseInt(id_setor)},
            ':id_turno': { dir: oracledb.BIND_IN, type: oracledb.NUMBER, val: parseInt(id_turno)},
        },
        { outFormat: oracledb.OBJECT, autoCommit: true },
    )
    .then(result => {
        if(result.rows.length > 0){
            retorno.status = true;
            retorno.msg = "Dados encotrados";
            retorno.dados = result.rows;
        }else{
            retorno.status = false;
            retorno.msg = "Turno setor não cadastrado";
            retorno.dados = []
        }
    })
    .finally(function() {
        db.close();
    })
    .catch(err => {
        retorno.msg = "Erro ao buscar vagas";
    });

    return retorno;
}



async function verificarSeusuarioBateuPonto(id_setor, id_turno, cod) {
    let retorno

    const db = await oracledb.getConnection();
    await db.execute(`select count(id_profissional) as batidas from samel.registro_ponto 
                        where 1 = 1
                            and id_setor = :id_setor
                            and id_turno = :id_turno
                            and id_profissional = :cod
                            and trunc(hora_registro) = trunc(sysdate)
                    `,
        {
            ':id_setor': { dir: oracledb.BIND_IN, type: oracledb.NUMBER, val: parseInt(id_setor)},
            ':id_turno': { dir: oracledb.BIND_IN, type: oracledb.NUMBER, val: parseInt(id_turno)},
            ':cod': { dir: oracledb.BIND_IN, type: oracledb.NUMBER, val: parseInt(cod)},
        },
        { outFormat: oracledb.OBJECT, autoCommit: true },
    )
    .then(result => {
        retorno = result.rows[0].BATIDAS;
    })
    .finally(function() {
        db.close();
    })
    .catch(err => {
        console.log("Erro ao buscar pontos batidos" + err);
    });

    return retorno
}



async function verificarPontosBatidos(id_setor, id_turno) {
    let retorno

    const db = await oracledb.getConnection();
    await db.execute(`select count(id_profissional) as batidas from samel.registro_ponto 
                        where 1 = 1
                            and id_setor = :id_setor
                            and id_turno = :id_turno
                            and trunc(hora_registro) = trunc(sysdate)
                    `,
        {
            ':id_setor': { dir: oracledb.BIND_IN, type: oracledb.NUMBER, val: parseInt(id_setor)},
            ':id_turno': { dir: oracledb.BIND_IN, type: oracledb.NUMBER, val: parseInt(id_turno)},
        },
        { outFormat: oracledb.OBJECT, autoCommit: true },
    )
    .then(result => {
        retorno = result.rows[0].BATIDAS;
    })
    .finally(function() {
        db.close();
    })
    .catch(err => {
        retorno.msg = "Erro ao buscar vagas";
    });

    return retorno;
}



async function registrarPonto(cod, id_setor, id_turno, latitude, longitude, cpf) {
    let retorno = {
        status: false,
        msg: '',
    };

    const db = await oracledb.getConnection();
    await db.execute(`insert into samel.registro_ponto (
            LATITUDE,
            LOGITUDE,
            ID_PROFISSIONAL, 
            ID_SETOR,
            ID_TURNO,
            HORA_REGISTRO
    )VALUES(
            :latitude,
            :longitude,
            :cod,
            :id_setor,
            :id_turno,
            sysdate
            )
                    `,
        {
            ':latitude': { dir: oracledb.BIND_IN, type: oracledb.STRING, val: latitude.toString()},
            ':longitude': { dir: oracledb.BIND_IN, type: oracledb.STRING, val: longitude.toString()},
            ':cod': { dir: oracledb.BIND_IN, type: oracledb.NUMBER, val: parseInt(cod)},
            ':id_setor': { dir: oracledb.BIND_IN, type: oracledb.NUMBER, val: parseInt(id_setor)},
            ':id_turno': { dir: oracledb.BIND_IN, type: oracledb.NUMBER, val: parseInt(id_turno)},
        },
        
        { outFormat: oracledb.OBJECT, autoCommit: true },
    )
    .then(result => {
        retorno.status = true;
        retorno.msg = "Ponto registrado com sucesso!";
    })
    .finally(function() {
        db.close();
    })
    .catch(err => {
        console.log(err)
        retorno.msg = "Erro ao registrar ponto!";
    });

    return retorno;
}
// <<<<<<<<<<<<<<<<<<<<<>>>>>>>>>>>>>>>>>>>>>>>>>
// <<<<<<<<<<<<<<<<<<<<<>>>>>>>>>>>>>>>>>>>>>>>>>
// <<<<<<<<<<<<<<<<<<<<<>>>>>>>>>>>>>>>>>>>>>>>>>

module.exports = {
    login,
    getSetores,
    getTurnos,
    verificarVagasTurnoSetor,
    verificarSeusuarioBateuPonto,
    verificarPontosBatidos,
    registrarPonto,
};
