const oracledb = require('oracledb');
const jwt = require('jsonwebtoken');

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



async function loginAdm(cpf, password) {
    let retorno = {
        status: false,
        msg: '',
    };

    const db = await oracledb.getConnection();
    await db.execute(`select * from samel.profissional 
		                where 1=1
                            and cpf = :cpf
                            and password = :password
                    `,
        {
            ':cpf': { dir: oracledb.BIND_IN, type: oracledb.STRING, val: cpf.toString()},
            ':password': { dir: oracledb.BIND_IN, type: oracledb.STRING, val: password.toString()},
        },
        
        { outFormat: oracledb.OBJECT, autoCommit: true },
    )
    .then(result => {
        if(result.rows.length > 0){
            retorno.status = true;
            retorno.msg = "Usuário encontrado";
            retorno.dados = result.rows;
            let id = retorno.dados.ID_PROFISSIONAL
            retorno.token_key = jwt.sign(
                { id },
                process.env.SECRET_KEY,
                {expiresIn: "1h"}
            );
            //expiresIn: 120 // it will be expired after 120ms
            //expiresIn: "120s" // it will be expired after 120s
            //expiresIn: "10h" // it will be expired after 10 hours
            //expiresIn: "20d" // it will be expired after 20 days
        }else{
            retorno.status = false;
            retorno.msg = "Usuário não encontrado";
        }
    })
    .finally(function() {
        db.close();
    })
    .catch(err => {
        retorno.msg = "Erro ao buscar usuário adm" + err;
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



async function verificarTurnoNoturno(id_setor, id_turno, cod) {
    let retorno

    const db = await oracledb.getConnection();
    await db.execute(`select * from samel.registro_ponto 
                        where 1 = 1
                            and id_setor = :id_setor
                            and id_turno = :id_turno
                            and id_profissional = :cod
                            and trunc(hora_entrada) = trunc(sysdate-1)
                            order by id_registro_ponto desc
                    `,
        {
            ':id_setor': { dir: oracledb.BIND_IN, type: oracledb.NUMBER, val: parseInt(id_setor)},
            ':id_turno': { dir: oracledb.BIND_IN, type: oracledb.NUMBER, val: parseInt(id_turno)},
            ':cod': { dir: oracledb.BIND_IN, type: oracledb.NUMBER, val: parseInt(cod)},
        },
        { outFormat: oracledb.OBJECT, autoCommit: true },
    )
    .then(result => {
        retorno = result.rows;
    })
    .finally(function() {
        db.close();
    })
    .catch(err => {
        console.log("Erro ao calcular diferença entre horas" + err);
    });

    return retorno
}



async function verificarLimiteHorasTurnos(id_turno) {
    let retorno

    const db = await oracledb.getConnection();
    await db.execute(`select nome_turno, to_char(saida - entrada) as HORAS from samel.turno 
                        where 1 = 1
                        and id_turno = :id_turno
                    `,
        {
            ':id_turno': { dir: oracledb.BIND_IN, type: oracledb.NUMBER, val: parseInt(id_turno)},
        },
        { outFormat: oracledb.OBJECT, autoCommit: true },
    )
    .then(result => {
        retorno = result.rows[0];
    })
    .finally(function() {
        db.close();
    })
    .catch(err => {
        console.log("Erro ao calcular diferença entre horas do turno" + err);
    });

    return retorno
}



async function diferencaHorasBatidaAnteriorAtualDia(id_setor, id_turno, cod) {
    let retorno

    const db = await oracledb.getConnection();
    await db.execute(`select to_char(sysdate - hora_entrada) as DIFERENCA from samel.registro_ponto 
                        where 1 = 1
                            and id_setor = :id_setor
                            and id_turno = :id_turno
                            and id_profissional = :cod
                            and trunc(hora_entrada) = trunc(sysdate)
                    `,
        {
            ':id_setor': { dir: oracledb.BIND_IN, type: oracledb.NUMBER, val: parseInt(id_setor)},
            ':id_turno': { dir: oracledb.BIND_IN, type: oracledb.NUMBER, val: parseInt(id_turno)},
            ':cod': { dir: oracledb.BIND_IN, type: oracledb.NUMBER, val: parseInt(cod)},
        },
        { outFormat: oracledb.OBJECT, autoCommit: true },
    )
    .then(result => {
        retorno = result.rows[0];
    })
    .finally(function() {
        db.close();
    })
    .catch(err => {
        console.log("Erro ao calcular diferença entre horas do turno" + err);
    });

    return retorno
}



async function diferencaHorasBatidaAnteriorAtual(id_setor, id_turno, cod) {
    let retorno

    const db = await oracledb.getConnection();
    await db.execute(`select to_char(sysdate - hora_entrada) as DIFERENCA from samel.registro_ponto 
                        where 1 = 1
                            and id_setor = :id_setor
                            and id_turno = :id_turno
                            and id_profissional = :cod
                            and trunc(hora_entrada) = trunc(sysdate-1)
                            order by DIFERENCA asc
                    `,
        {
            ':id_setor': { dir: oracledb.BIND_IN, type: oracledb.NUMBER, val: parseInt(id_setor)},
            ':id_turno': { dir: oracledb.BIND_IN, type: oracledb.NUMBER, val: parseInt(id_turno)},
            ':cod': { dir: oracledb.BIND_IN, type: oracledb.NUMBER, val: parseInt(cod)},
        },
        { outFormat: oracledb.OBJECT, autoCommit: true },
    )
    .then(result => {
        retorno = result.rows[0];
    })
    .finally(function() {
        db.close();
    })
    .catch(err => {
        console.log("Erro ao calcular diferença entre horas do turno" + err);
    });

    return retorno
}



async function verificarlimitesDoTurno(id_turno) {
    let retorno

    const db = await oracledb.getConnection();
    await db.execute(`select
                        to_char(a.entrada, 'HH24') hora_entrada,
                        to_char(a.saida, 'HH24') hora_saida,
                        to_char(sysdate, 'HH24') as hora_atual,
                        a.* 
                        from samel.turno a where id_turno=:id_turno
                    `,
        {
            ':id_turno': { dir: oracledb.BIND_IN, type: oracledb.NUMBER, val: parseInt(id_turno)},
        },
        { outFormat: oracledb.OBJECT, autoCommit: true },
    )
    .then(result => {
        retorno = result.rows[0];
    })
    .finally(function() {
        db.close();
    })
    .catch(err => {
        console.log("Erro ao buscar pontos batidos" + err);
    });

    return retorno
}



async function verificarSeusuarioBateuPonto(id_setor, id_turno, cod) {
    let retorno

    const db = await oracledb.getConnection();
    await db.execute(`select * from samel.registro_ponto 
                        where 1 = 1
                            and id_setor = :id_setor
                            and id_turno = :id_turno
                            and id_profissional = :cod
                            and trunc(hora_entrada) = trunc(sysdate)
                    `,
        {
            ':id_setor': { dir: oracledb.BIND_IN, type: oracledb.NUMBER, val: parseInt(id_setor)},
            ':id_turno': { dir: oracledb.BIND_IN, type: oracledb.NUMBER, val: parseInt(id_turno)},
            ':cod': { dir: oracledb.BIND_IN, type: oracledb.NUMBER, val: parseInt(cod)},
        },
        { outFormat: oracledb.OBJECT, autoCommit: true },
    )
    .then(result => {
        retorno = result.rows;
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



async function registrarPontoEntrada(cod, id_setor, id_turno, latitude, longitude, cpf) {
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
            HORA_ENTRADA
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



async function registrarPontoSaida(cod) {
    let retorno = {
        status: false,
        msg: '',
    };

    const db = await oracledb.getConnection();
    await db.execute(`UPDATE samel.registro_ponto SET
                            HORA_SAIDA = sysdate
                        WHERE
                            id_registro_ponto = :cod
    `,
        {
            ':cod': { dir: oracledb.BIND_IN, type: oracledb.NUMBER, val: parseInt(cod)},
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



async function setUsuario( nome_profissional, cpf, data_nascimento, crm, especialidade, ano_formatura, password ) {
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
                            ano_formatura,
                            password
                        ) 
                        VALUES (
                            :nome_profissional,
                            :cpf,
                            to_date(:data_nascimento, 'DD/MM/YYYY'),
                            :crm,
                            :especialidade,
                            :ano_formatura,
                            :password
                        )
                    `,
        {
            ':nome_profissional': { dir: oracledb.BIND_IN, type: oracledb.STRING, val: nome_profissional.toString()},
            ':cpf': { dir: oracledb.BIND_IN, type: oracledb.STRING, val: cpf.toString()},
            ':data_nascimento': { dir: oracledb.BIND_IN, type: oracledb.STRING, val: data_nascimento.toString()},
            ':crm': { dir: oracledb.BIND_IN, type: oracledb.STRING, val: crm.toString()},
            ':especialidade': { dir: oracledb.BIND_IN, type: oracledb.STRING, val: especialidade.toString()},
            ':ano_formatura': { dir: oracledb.BIND_IN, type: oracledb.NUMBER, val: parseInt(ano_formatura)},
            ':password': { dir: oracledb.BIND_IN, type: oracledb.STRING, val: password.toString()}
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



async function getUsuario(id_profissional) {
    let retorno = {
        status: false,
        msg: '',
    };

    const db = await oracledb.getConnection();
    await db.execute(`select * from samel.profissional
                            where id_profissional = :id_profissional
                    `,
        {
            ':id_profissional': { dir: oracledb.BIND_IN, type: oracledb.NUMBER, val: parseInt(id_profissional)},
        },
        { outFormat: oracledb.OBJECT, autoCommit: true },
    )
    .then(result => {
        if(result.rows.length > 0){
            retorno.status = true;
            retorno.msg = "Usuario encontrado";
            retorno.dados = result.rows[0];
        }else{
            retorno.status = false;
            retorno.msg = "Nenhum usuario cadastrado";
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



async function getUsuarios() {
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



async function getFolhaPonto(id, mes, ano) {
    let retorno = {
        status: false,
        msg: '',
    };


    const db = await oracledb.getConnection();
    await db.execute(`SELECT 
    (select nome_turno from samel.turno where id_turno=a.id_turno) as turno,
    (select nome_setor from samel.setor where id_setor=a.id_setor) as setor,
    to_char(a.hora_entrada, 'DD') dia_entrada,
    to_char(a.hora_saida, 'DD') dia_saida,
    to_char(a.hora_entrada, 'HH24:MI') hora_entrada1,
    to_char(a.hora_saida, 'HH24:MI') hora_saida1,
    a.* 
    FROM samel.registro_ponto a WHERE extract(month from hora_entrada) = :mes and extract (year from hora_entrada) = :ano`,
        {
            ':mes': { dir: oracledb.BIND_IN, type: oracledb.NUMBER, val: parseInt(mes)},
            ':ano': { dir: oracledb.BIND_IN, type: oracledb.NUMBER, val: parseInt(ano)},
        },
        { outFormat: oracledb.OBJECT, autoCommit: true },
    )
    .then(result => {
        retorno.status = true
        retorno.msg = "Sucesso!"
        retorno.dados = result.rows
    })
    .finally(function() {
        db.close();
    })
    .catch(err => {
        retorno.msg = "Erro ao listar folha de ponto" + err;
    });

    return retorno;
}
// <<<<<<<<<<<<<<<<<<<<<>>>>>>>>>>>>>>>>>>>>>>>>>
// <<<<<<<<<<<<<<<<<<<<<>>>>>>>>>>>>>>>>>>>>>>>>>
// <<<<<<<<<<<<<<<<<<<<<>>>>>>>>>>>>>>>>>>>>>>>>>

module.exports = {
    login,
    loginAdm,
    verificarVagasTurnoSetor,
    verificarTurnoNoturno,
    verificarLimiteHorasTurnos,
    diferencaHorasBatidaAnteriorAtualDia,
    diferencaHorasBatidaAnteriorAtual,
    verificarlimitesDoTurno,
    verificarSeusuarioBateuPonto,
    verificarPontosBatidos,
    registrarPontoEntrada,
    registrarPontoSaida,
    setUsuario,
    updateUsuario,
    getUsuario,
    getUsuarios,
    deleteUsuario,
    getFolhaPonto,
};
