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
};



async function setUsuario( nome_profissional, cpf, data_nascimento, crm, especialidade, ano_formatura ) {
    let retorno = {
        status: false,
        msg: '',
    };

    const db = await oracledb.getConnection();
    await db.execute(`INSERT INTO samel.profissional (
                            nome_profissional,
                            cpf,
                            data_nascimento,
                            crm,
                            especialidade,
                            ano_formatura
                        ) 
                        VALUES (
                            :nome_profissional,
                            :cpf,
                            to_date(:data_nascimento, 'DD/MM/YYYY'),
                            :crm,
                            :especialidade,
                            :ano_formatura
                        )
                    `,
        {
            ':nome_profissional': { dir: oracledb.BIND_IN, type: oracledb.STRING, val: nome_profissional.toString()},
            ':cpf': { dir: oracledb.BIND_IN, type: oracledb.STRING, val: cpf.toString()},
            ':data_nascimento': { dir: oracledb.BIND_IN, type: oracledb.STRING, val: data_nascimento.toString()},
            ':crm': { dir: oracledb.BIND_IN, type: oracledb.STRING, val: crm.toString()},
            ':especialidade': { dir: oracledb.BIND_IN, type: oracledb.STRING, val: especialidade.toString()},
            ':ano_formatura': { dir: oracledb.BIND_IN, type: oracledb.NUMBER, val: parseInt(ano_formatura)}
        },
        { outFormat: oracledb.OBJECT, autoCommit: true },
    )
    .then(result => {
        retorno.status = true
        retorno.msg = "Usuário cadastrado com sucesso!"
        retorno.dados = result.rows
    })
    .finally(function() {
        db.close();
    })
    .catch(err => {
        retorno.msg = "Erro ao cadastrar usuário" + err;
    });

    return retorno;
};



async function updateUsuario(id, nome_profissional, cpf, data_nascimento, crm, especialidade, ano_formatura) {
    let retorno = {
        status: false,
        msg: '',
    };

    const db = await oracledb.getConnection();
    await db.execute(`UPDATE samel.profissional SET
                            nome_profissional = :nome_profissional,
                            cpf = :cpf,
                            data_nascimento = :data_nascimento,
                            crm = :crm,
                            especialidade = :especialidade,
                            ano_formatura = :ano_formatura
                        WHERE
                            id_profissional = :id
                    `,
        {
            ':id': { dir: oracledb.BIND_IN, type: oracledb.NUMBER, val: parseInt(id)},
            ':nome_profissional': { dir: oracledb.BIND_IN, type: oracledb.STRING, val: nome_profissional.toString()},
            ':cpf': { dir: oracledb.BIND_IN, type: oracledb.STRING, val: cpf.toString()},
            ':data_nascimento': { dir: oracledb.BIND_IN, type: oracledb.STRING, val: data_nascimento.toString()},
            ':crm': { dir: oracledb.BIND_IN, type: oracledb.STRING, val: crm.toString()},
            ':especialidade': { dir: oracledb.BIND_IN, type: oracledb.STRING, val: especialidade.toString()},
            ':ano_formatura': { dir: oracledb.BIND_IN, type: oracledb.NUMBER, val: parseInt(ano_formatura)}
        },
        { outFormat: oracledb.OBJECT, autoCommit: true },
    )
    .then(result => {
        retorno.status = true
        retorno.msg = "Usuário alterado com sucesso!"
        retorno.dados = result.rows
    })
    .finally(function() {
        db.close();
    })
    .catch(err => {
        retorno.msg = "Erro ao alterar usuário" + err;
    });

    return retorno;
}



async function getUsuario() {
    let retorno = {
        status: false,
        msg: '',
    };

    const db = await oracledb.getConnection();
    await db.execute(`select * from samel.profissional
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
        retorno.msg = "Erro ao buscar usuários";
    });

    return retorno;
}



async function deleteUsuario(id) {
    let retorno = {
        status: false,
        msg: '',
    };

    const db = await oracledb.getConnection();
    await db.execute(`DELETE FROM samel.profissional WHERE id_profissional = :id`,
        {
            ':id': { dir: oracledb.BIND_IN, type: oracledb.NUMBER, val: parseInt(id)},
        },
        { outFormat: oracledb.OBJECT, autoCommit: true },
    )
    .then(result => {
        retorno.status = true
        retorno.msg = "Usuário deletado com sucesso!"
        retorno.dados = result.rows
    })
    .finally(function() {
        db.close();
    })
    .catch(err => {
        retorno.msg = "Erro ao deletar usuário" + err;
    });

    return retorno;
}
// <<<<<<<<<<<<<<<<<<<<<>>>>>>>>>>>>>>>>>>>>>>>>>
// <<<<<<<<<<<<<<<<<<<<<>>>>>>>>>>>>>>>>>>>>>>>>>
// <<<<<<<<<<<<<<<<<<<<<>>>>>>>>>>>>>>>>>>>>>>>>>

module.exports = {
    login,
    verificarVagasTurnoSetor,
    verificarSeusuarioBateuPonto,
    verificarPontosBatidos,
    registrarPonto,
    setUsuario,
    updateUsuario,
    getUsuario,
    deleteUsuario,
};
