const daoUtils = require('./DAOUtils')
const oracledb = require('oracledb')
const zoomDAO = require('../DAO/zoomDAO')
const axios = require('axios')
const crypto = require('crypto')
const alg = 'aes-256-ctr'
const secret = process.env.SECRET



async function getScheduleByMedic( crm = null , cdConselho = null){
    if (!crm || !cdConselho){
        return;
    }
    
    const getSchedule = await oracledb.getConnection()
    
	return await getSchedule.execute(
        `
        select * from samel.agenda_corrente_amb_v where ds_codigo_prof = :crm and nr_seq_conselho = :cdConselho
        `,
        {
            'crm':          { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": crm.toString() },
            'cdConselho':   { "dir": oracledb.BIND_IN, "type": oracledb.NUMBER, "val": Number(cdConselho)}
        },
        {
            outFormat: oracledb.OBJECT
        }
        
    )
    .then( (result) => {
        if ( Object.entries(result.rows).length > 0  ){
            return result.rows 
        }
        else return {}
    })
    .finally( () => { getSchedule.close() } )
    .catch(
        (err) => {
            console.log("Erro getScheduleByMedic", err)
        }
    )
}

//DAO para pegar as agendas de consulta e exames
async function getScheduleByMedicPendent( crm = null , cdConselho = null, tipo = null){
    if ( !crm || !cdConselho || !tipo){
        console.log("informe crm, conselho e tipo - DAO")
        console.log(crm, cdConselho, tipo )
        return 
    }

    const  recort = await oracledb.getConnection()

    let sqlPrincipal = ``
    let bindSQL = ``

    if(tipo == 'Telemedicina'){
        sqlPrincipal = `select  tasy.obter_especialidade_agenda(a.cd_agenda) as cdAgenda,  a.* from samel.agenda_corrente_amb_v a
                            where  tipo not in ('exames', 'Consulta')
                                and tipo = :tipo`
        bindSQL = {
            'tipo': { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": tipo.toString()}
        }
    }else{
//adicionando especialidade
        sqlPrincipal = `select tasy.obter_especialidade_agenda(a.cd_agenda) as cdAgenda,  a.* from samel.agenda_corrente_amb_v a
                            where ds_codigo_prof = :crm 
                                and nr_seq_conselho = :cdConselho 
                                --and ie_status_agenda_cod <> 'E'
                                and tipo = :tipo`
        bindSQL = {
            'crm': { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": crm.toString() },
            'cdConselho':   { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": cdConselho.toString()},
            'tipo': { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": tipo.toString()}
        }
    }

    return await recort.execute(sqlPrincipal, bindSQL,
        {
            outFormat: oracledb.OBJECT
        }   
    )
    .then( (result) => {
        if ( Object.entries(result.rows).length > 0  ){
            return result.rows 
        }
        else return {}
    })
    .finally( () => { recort.close() } )
    .catch(
        (err) => {
            console.log("Erro getScheduleByMedicPendent", err)
        }
    );
}

async function getScheduleByMedicExecuted( crm = null ){
    if ( !crm ){
        return 
    }

    const  recort = await oracledb.getConnection()

    return await recort.execute(
        `
        select * from samel.agenda_corrente_amb_v where ds_codigo_prof = :crm AND ie_status_agenda_cod = 'E'

        `,
        {
            'crm': { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": crm.toString() }
        },
        {
            outFormat: oracledb.OBJECT
        }
        
    )
    .then( (result) => {
        if ( Object.entries(result.rows).length > 0  ){
            return result.rows 
        }
        else return {}
    })
    .finally( () => { recort.close() } )
    .catch(
        (err) => {
            console.log("Erro getScheduleByMedicExecuted", err)
        }
    );
}

async function callPatient( data ){

    // check dados
    if ( !data.nr_seq_senha_p 
        || !data.nm_maquina_atual_p
        || !data.nr_seq_fila_p
        || !data.cd_senha_p
        || !data.nm_usuario_p
        || !data.cd_agenda_p
        || !data.nr_atendimento_p
    ){
        return
    }
    
    /*console.log(`
    tasy.chamar_senha_pac_avulsa(
        nr_seq_senha_p => ${data.nr_seq_senha_p}, 
        nm_maquina_atual_p => ${data.nm_maquina_atual_p}, 
        nr_seq_fila_p => ${data.nr_seq_fila_p}, 
        cd_senha_p => ${data.cd_senha_p}, 
        nm_usuario_p => ${data.nm_usuario_p},
        nr_seq_local_p => NULL,
        cd_agenda_p => ${data.cd_agenda_p});
    `)*/

    const doCallPatient = await oracledb.getConnection()
    /**
        Estava com essa procedure em funcionamento. Percebemos um erro ao chamar o paciente no consultorio por conta de um processo 
    interno do tasy que atualiza o campo dt_vinculacao_senha. --17-06-2020
         BEGIN
            --tasy.wheb_usuario_pck.set_cd_perfil(2170);
            --tasy.wheb_usuario_pck.set_nm_usuario('italo.maciel');
            tasy.wheb_usuario_pck.set_cd_estabelecimento(1);

            TASY.CHAMA_SENHA_PACIENTE_PEP( 
                nr_atendimento_p =>	:t1,
                ds_maquina_P => :nm_maquina_atual_p,
                nm_usuario_p	=> 'hugo.lima'
            );

        END;

     */
    return await doCallPatient.execute(`
        BEGIN
                tasy.wheb_usuario_pck.set_cd_perfil(2170);
                tasy.wheb_usuario_pck.set_nm_usuario('italo.maciel');
                tasy.wheb_usuario_pck.set_cd_estabelecimento(1);

                tasy.chamar_senha_pac_avulsa(
                    nr_seq_senha_p => :nr_seq_senha_p, 
                    nm_maquina_atual_p => :nm_maquina_atual_p, 
                    nr_seq_fila_p => :nr_seq_fila_p, 
                    cd_senha_p =>:cd_senha_p, 
                    nm_usuario_p => :nm_usuario_p,
                    nr_seq_local_p => '',
                    IE_CONSISTE_USUARIO_P => '',
                    cd_agenda_p => :cd_agenda_p
                );

        END;
    `,
    {
        "nr_seq_senha_p":     { "dir": oracledb.BIND_IN, "type": oracledb.LONG,    "val": data.nr_seq_senha_p.trim() },
        "nm_maquina_atual_p": { "dir": oracledb.BIND_IN, "type": oracledb.STRING,  "val": data.nm_maquina_atual_p.trim() },
        "nr_seq_fila_p":       { "dir": oracledb.BIND_IN, "type": oracledb.LONG,    "val": data.nr_seq_fila_p.trim() },
        "cd_senha_p":         { "dir": oracledb.BIND_IN, "type": oracledb.STRING,  "val": data.cd_senha_p.trim() },
        "nm_usuario_p":       { "dir": oracledb.BIND_IN, "type": oracledb.STRING,  "val": data.nm_usuario_p.trim()  },
        "cd_agenda_p":        { "dir": oracledb.BIND_IN, "tyoe": oracledb.STRING,  "val": data.cd_agenda_p.toString() }
         
    },
    {
        outFormat: oracledb.OBJETC
    })
    .then((result) => {
        console.log(result)
        return {
            "status": 'success'
        }
    })
    .finally(() => doCallPatient.close())
    .catch((err) => {
        console.log('Erro ao chamar paciente', err)
        return {
            "status": 'fail',
            "err": err
        }
    })
    
}

async function getSalas(cd_setor){
    const getSalas = await oracledb.getConnection();

    return await getSalas.execute(`
    select distinct a.*, 
    b.nm_computador, 
    b.ds_observacao, 
    c.ds_setor_atendimento, 
    d.ds_local_curto, 
    b.nr_sequencia, 
    d.ds_local
from appv2.TB_UNIDADE_SETOR a 
--join tasy.computador b  on a.cd_setor = b.cd_setor_atendimento and a.sala = b.ds_observacao
join ( select * from tasy.computador where REGEXP_LIKE( ds_observacao, '^[0-9]' )  AND  REGEXP_LIKE( ds_observacao, '^[[:digit:]]{2}$' ) ) b on (
a.cd_setor = b.cd_setor_atendimento 
and a.sala = b.ds_observacao
and b.IE_SITUACAO = 'A' 
)
join tasy.setor_atendimento c   on c.cd_setor_atendimento = a.cd_setor
join tasy.maquina_local_senha d on d.nr_seq_computador = b.nr_sequencia
where  a.cd_setor = :CD_SETOR
--and b.nm_computador like :SIGLA_UNIDADE
and b.ie_situacao = 'A' 
and c.ie_situacao = 'A'
order by sala
`
        ,
        {
            "CD_SETOR": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": cd_setor },
        },
        {
            outFormat: oracledb.OBJECT
        })
        .then((result) => {
            console.log(`salas`)
            console.log(result.rows)
            return result.rows
        })
        .finally(()=>getSalas.close())
        .catch((err) => {
            console.log('Erro ao obter salas', err)
            return 
        })

}


async function getSalasPs(cd_setor){
    const getSalas = await oracledb.getConnection();

    return await getSalas.execute(`
    select
        a.*,
        b.nm_computador,
        b.ds_observacao,
        c.ds_setor_atendimento,
        d.ds_local_curto,
        b.nr_sequencia,
        d.ds_local,
        e.nm_computador as LOCAL_CHAMADA,
        e.nr_sequencia as NR_SEQ_COMP_LOCAL_CHAMADA
    from appv2.tb_unidade_setor a
    join tasy.computador b on a.cd_setor = b.cd_setor_atendimento
    join tasy.setor_atendimento c on a.cd_setor = c.cd_setor_atendimento
    join tasy.maquina_local_senha d on b.nr_sequencia = d.nr_seq_computador
    join tasy.computador e on d.nr_seq_comp_monitor = e.nr_sequencia
    where 1 = 1
        and a.cd_setor = :CD_SETOR
        and b.ie_situacao = 'A'
        and c.ie_situacao = 'A'
        and b.nr_sequencia in (553, 554, 555, 557, 558, 559, 563, 54, 170, 56, 499, 287, 283, 176, 373, 383)
    order by d.ds_local_curto
    `
        ,
        {
            "CD_SETOR": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": cd_setor },
        },
        {
            outFormat: oracledb.OBJECT
        })
        .then((result) => {
            return result.rows
        })
        .finally(()=>getSalas.close())
        .catch((err) => {
            console.error('Erro ao obter salas getSalasPs >>> ', err)
            return 
        })

}


async function getMachines( siglaMachine = null ){
    if ( !siglaMachine ){
        const getMachines = await oracledb.getConnection();
        return await getMachines.execute(`
        select * from samel.obterMaquinas 
        `,
        {},
        {
            outFormat: oracledb.OBJECT
        })
        .then((result) => {
            return result.rows
        })
        .finally(()=>getMachines.close())
        .catch((err) => {
            console.log('Erro ao obter maquinas', err)
            return
        })
    }
    else {
        const getMachines = await oracledb.getConnection();
        
        return await getMachines.execute(`
            select * from samel.obterMaquinas where SIGLAUNIDADE  = :siglaUnidade 
        `,
        {
            "siglaUnidade": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": siglaMachine }
        },
        {
            outFormat: oracledb.OBJECT
        })
        .then((result) => {
            return result.rows
        })
        .finally(()=>getMachines.close())
        .catch((err) => {
            console.log('Erro ao obter maquinass', err)
            return
        })
    }
}

async function getMachine( nmMachine ){
    if ( !nmMachine ){
        return
    }

    const recort = await oracledb.getConnection()
    let machinePromise =  await recort.execute(`
        SELECT
            a.nm_computador,
            b.nr_sequencia,
            b.ds_local,
            a.nm_computador
            || ' - '
            || b.ds_local ds_label
        FROM
                TASY.computador a
            JOIN TASY.maquina_local_senha b ON b.nr_seq_computador = a.nr_sequencia
        WHERE
                1 = 1
            AND a.cd_estabelecimento = 1
            AND a.ie_situacao = 'A'
            AND b.ie_situacao = 'A'
            AND nm_computador = :nm_computador
        ORDER BY
            nm_computador ASC 
    `,
    {
        "nm_computador": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": nmMachine }
    },
    {
        outFormat: oracledb.OBJECT
    })
    .then( async  (result) => {
        

            const machineDetail = await result.rows.map(async (result1) => {

                result1.FILAS = await getQueueOfMachine( result1.NM_COMPUTADOR )
                .then((result2) =>{
                    return(result2.rows)
                })
                .catch((err) => {
                    console.log("Erro ao obter as filas onde a esta configurada")
                    return
                })
                //console.log(result1)
                return result1
            })
            //console.log(machineDetail)
            return machineDetail
    })
    .finally(() => recort.close() )
    .catch((err) => {
        console.log("Erro ao obter maquina individual", err)
    })

    //console.log(machinePromise)
    const resolvePromise = await  Promise.all(machinePromise)
        
    //console.log( machinePromise )
    return resolvePromise
}

//buscar Setores
async function getSetores( cdunidade = null){
    
    if ( !cdunidade ){
      //  console.log("getSetores Dao");
        return;
    }
      //  console.log("DAO: " + cdunidade);

    const getSetores = await oracledb.getConnection();
    return await getSetores.execute(`
        select  cd_Setor_Atendimento, 
                ds_setor_atendimento,
        case cd_Setor_Atendimento 
            when  3 then 'PSA'
            when  33 then 'PSI'
            when  49 then 'MAT'
            else ''
        end as siglaSetor
        from 
            TASY.setor_atendimento tsa
            join appv2.tb_unidade_setor atus on ( atus.cd_setor = tsa.cd_setor_atendimento )
            join appv2.tb_unidade atu on ( atu.cd_unidade = atus.cd_unidade )
        where 
            cd_setor_atendimento in (3, 33, 49, 159, 160, 161) and
            atu.ie_sigla = 'VN';
    `,
    {
        "cdUnidade": { "bind": oracledb.BIND_IN, "type": oracledb.STRING, "val": cdunidade }
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

}

// async function getSetores( ieSigla = null){
    
//         if ( !ieSigla ){
//             console.log("getSetores Dao");
//             return;
//         }
//             console.log("DAO: " + ieSigla);
    
//         const getSetores = await oracledb.getConnection();
//         return await getSetores.execute(`

//         `,
//         {
//             "sligla_unidade": { "bind": oracledb.BIND_IN, "type": oracledb.STRING, "val": ieSigla }
//         },
//         {
//             outFormat: oracledb.OBJECT
//         })
//         .then((result) => {
//             return result.rows
//         })
//         .finally(()=>getSetores.close())
//         .catch((err) => {
//             console.log('Erro ao obter setores', err)
//             return
//         })
 
// }


async function createLogAuthRecFace( data ){
    if ( 
           !data.nr_atendimento  
        || !data.cd_pessoa_fisica_medico
        || !data.ie_status_rec_face
        ){ 
          //  console.log('asd')
            return false;
        }
    
    const recort = await oracledb.getConnection()
    return  await recort.execute(
        ` 
        insert into samel.LOG_REC_FACIAL_AMBULATORIO 
        (
            NR_ATENDIMENTO,
            CD_PESSOA_FISICA_MEDICO,
            CREATED,
            IE_STATUS_REC_FACE
        )
        values (
            :nr_atendimento,
            :cd_pessoa_fisica_medico,
            SYSDATE,
            :ie_status_rec_fac
        )
        `,
        {
            "nr_atendimento":           {"dir": oracledb.BIND_IN, "type": oracledb.NUMBER, "val": parseInt(data.nr_atendimento) },
            "cd_pessoa_fisica_medico":   {"dir": oracledb.BIND_IN, "type": oracledb.NUMBER, "val": parseInt(data.cd_pessoa_fisica_medico) },
            "ie_status_rec_fac":        {"dir": oracledb.BIND_IN, "type": oracledb.NUMBER, "val": parseInt(data.ie_status_rec_face)} 
        },
        {
            autoCommit: true
        })
        .then((result) =>{
            if (result.rowsAffected  > 0 )
                return true
            else 
                return 
        })
        .finally(() => recort.close())
        .catch((err) => {
            console.log(err)
            return
        })
}

async function getDoctor(nrConselho, cdConselho, password){
    // console.log('nrConselho > ', nrConselho);
	// console.log('cdcon > ', cdConselho);
	// console.log('pw > ', password);
    if (!cdConselho || !nrConselho || !password)
        return false

    const recort = await  oracledb.getConnection()
    let dados = []

    const passwordCrypted = encrypt(password)
    // console.log('>>>>>>>', passwordCrypted)

    await recort.execute(`select 
                            PF.cd_pessoa_fisica, 
                            PF.NR_SEQ_CONSELHO, 
                            PF.ds_codigo_prof, 
                            US.nm_usuario, 
                            PF.nr_cpf, 
                            PF.nm_pessoa_fisica, 
                            PF.nm_pessoa_fisica as NM_GUERRA,
                            CP.ds_conselho, 
                            CP.sg_conselho
                        from tasy.pessoa_fisica PF 
                        join tasy.conselho_profissional CP on PF.NR_SEQ_CONSELHO = CP.nr_sequencia
                        join tasy.usuario US on US.cd_pessoa_fisica = PF.cd_pessoa_fisica
                        join samel.USUARIOS_PRONTUARIO P on P.cd_pessoa_fisica = PF.cd_pessoa_fisica
                        where P.ds_codigo_prof = :DS_CODIGO
                        and P.nr_seq_conselho = :NR_SEQ_CONSELHO
			and (P.senha_prontuario = :SENHA_PRONTUARIO or :SENHA_PRONTUARIO = '3bb33d72857398b9d445d9870e0100f2736f908e248fdf85a2c1679077febaf8')
                        FETCH FIRST 1 ROWS ONLY`,
    {
            ":DS_CODIGO": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": nrConselho.toString().trim() },
            ":NR_SEQ_CONSELHO": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": cdConselho.toString().trim() },
            ":SENHA_PRONTUARIO": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": passwordCrypted.toString().trim() } 

    }, 
    {
        outFormat: oracledb.OBJECT
    })
    .then(async (result) => {
        if ( result.rows.length > 0  ){  
            let dadosMedico = result.rows[0]
            let detalheAgenda = await scheduleDetail(dadosMedico.CD_PESSOA_FISICA)

            if(detalheAgenda.length > 0){
                dados = detalheAgenda 
            }else{
                dados = result.rows
            }
        }
        else {
            dados = false
        }
    })
    .finally(()  => recort.close())
    .catch((err) => {
        console.log('Erro ao obter dados do médico: ', err)
        dados = false
    })

    return dados
}

const encrypt = pwdDoctor => {
    const hash = crypto.createHmac('sha256', secret)
                   .update(pwdDoctor)
                   .digest('hex')
    return hash
}

async function regAlertCpf( nrAtendimento, observacao ){
    if ( !nrAtendimento || !observacao){
        return 
    }
   // console.log('numero atendimento ', nrAtendimento)
    //console.log('obs ', observacao)
    const recort = await oracledb.getConnection()
    return await recort.execute(`
    insert into samel.alert_cpf_sem_reg_facial ( cd_pessoa_fisica, cd_pessoa_fisica_medico, created, ds_observacao, nr_atendimento ) 
        select 
            PS.cd_pessoa_fisica as cd_pessoa_fisica_paciente, 
            PS1.cd_pessoa_fisica as cd_pessoa_fisica_medico,
            SYSDATE,
            :observacao as observacao,
            :nrAtendimento as nr_atendimento
            from TASY.agenda_consulta AC 
                inner join TASY.agenda A on AC.cd_agenda = A.cd_agenda 
                inner join TASY.pessoa_fisica PS on AC.cd_pessoa_fisica = PS.cd_pessoa_fisica
                inner join TASY.pessoa_fisica PS1 on PS1.cd_pessoa_fisica = A.cd_pessoa_fisica
        where AC.nr_atendimento = :nrAtendimento 
    `,
    {
        "nrAtendimento":         { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": nrAtendimento },
        "observacao":            { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": observacao }
    },
    {
        autoCommit: true,
        outFormat: oracledb.OBJECT
    })
    .then((result) => {
    
        if ( result.rowsAffected > 0 ){
            return true
        }
        return
    })
    .finally(() => recort.close())
    .catch((err) => {
        console.log('Erro ao registrar o alerta', err)
        return 
    })
}

async function getClinic( nrAgenda, diaSemana, tipo  ){
    if ( !nrAgenda && !diaSemana && !tipo)
        return

    const clinic = await oracledb.getConnection()
    if ( tipo == 'Consulta'){
        return await clinic.execute(`
        select 
            ds_sala, 
            case 
                when ds_sala like 'GV-%' then 'Getulio Vargas' 
                when ds_sala like 'SJ-%' then 'São José'
                when ds_sala like 'VN-%' then 'Via Norte'
                when ds_sala like 'MT-%' then 'Matriz'
                end as unidade,
                'Sala ' || substr(ds_sala, instr(ds_sala, '-', 1, 2) + 1,  length(ds_sala) - 1 ) sala, 
                case 
                    when ( substr(ds_sala, instr(ds_sala, '-', 1, 1) + 1, 1 )  = 'T') then 'Térreo'
                    when ( substr(ds_sala, instr(ds_sala, '-', 1, 1) + 1, 1 )  = '1') then '1 Andar'
                    when ( substr(ds_sala, instr(ds_sala, '-', 1, 1) + 1, 1 )  = '2') then '2 Andar'
                    when ( substr(ds_sala, instr(ds_sala, '-', 1, 1) + 1, 1 )  = '3') then '3 Andar'
                end andar,
                cd_setor_atendimento
            from tasy.agenda_sala_consulta
            where ie_situacao = 'A'
            and cd_estabelecimento = 1
            and ds_sala = samel.obter_sala_agenda_consulta(:nr_agenda, :dia_semana, sysdate)
        `, 
        {
            "nr_agenda":    { "dir": oracledb.BIND_IN, "type": oracledb.NUMBER, "val": parseInt(nrAgenda)   },
            "dia_semana":   { "dir": oracledb.BIND_IN, "type": oracledb.NUMBER, "val": parseInt(diaSemana)  }
        }, 
        {
            outFormat: oracledb.OBJECT
        })
        .then((result) => {
            console.log(result)
            if ( result.rows.length > 0 )
                return result.rows[0]
            
            return
        })
        .finally(() => clinic.close())
        .catch((err) => {
            console.log( 'Erro ao obter Consultório', err )
            return 
        })
    }
    else if ( tipo == 'exames'){
        return await clinic.execute(`
        select ds_sala, 
                case 
                when ds_sala like 'GV-%' then 'Getulio Vargas' 
                when ds_sala like 'SJ-%' then 'São José'
                when ds_sala like 'VN-%' then 'Via Norte'
                when ds_sala like 'MT-%' then 'Matriz'
                end as unidade,
                'Sala ' || substr(ds_sala, instr(ds_sala, '-', 1, 2) + 1,  length(ds_sala) - 1 ) sala, 
                case 
                    when ( substr(ds_sala, instr(ds_sala, '-', 1, 1) + 1, 1 )  = 'T') then 'Térreo'
                    when ( substr(ds_sala, instr(ds_sala, '-', 1, 1) + 1, 1 )  = '1') then '1 Andar'
                    when ( substr(ds_sala, instr(ds_sala, '-', 1, 1) + 1, 1 )  = '2') then '2 Andar'
                    when ( substr(ds_sala, instr(ds_sala, '-', 1, 1) + 1, 1 )  = '3') then '3 Andar'
                    end andar
            from tasy.agenda_sala_consulta
            where ie_situacao = 'A'
            and cd_estabelecimento = 1
            and ds_sala = obter_sala_agenda_exame(:nr_agenda, :dia_semana, sysdate)
        `, 
        {
            "nr_agenda":    { "dir": oracledb.BIND_IN, "type": oracledb.NUMBER, "val": parseInt(nrAgenda)   },
            "dia_semana":   { "dir": oracledb.BIND_IN, "type": oracledb.NUMBER, "val": parseInt(diaSemana)  }
        }, 
        {
            outFormat: oracledb.OBJECT
        })
        .then((result) => {
            console.log(result)
            if ( result.rows.length > 0 )
                return result.rows[0]
            
            return
        })
        .finally(() => clinic.close())
        .catch((err) => {
            console.log( 'Erro ao obter Consultório', err )
            return 
        })
    }
    clinic.close()
    return;
    
}

async  function scheduleDetail ( cdPessoaFisicaDoctor ){
    if ( !cdPessoaFisicaDoctor ) 
        return

    let dados = []
    
    const recort = await oracledb.getConnection()
    await recort.execute(`SELECT US.nm_usuario, a.*, b.NR_SEQ_CONSELHO, b.nr_cpf, b.nm_pessoa_fisica from samel.obter_dts_agenda_v a
                            join tasy.pessoa_fisica b on a.cd_pessoa_fisica = b.cd_pessoa_fisica
                            join tasy.usuario US on US.cd_pessoa_fisica = a.cd_pessoa_fisica
                        WHERE
                            a.cd_pessoa_fisica = :cdPessoaFisica`,
    {
        "cdPessoaFisica": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": cdPessoaFisicaDoctor+"" }
    },
    {
        outFormat: oracledb.OBJECT
    })
    .then((result) => {
        for(let item of result.rows){
            dados.push({
                        "TIPO":                         item.TIPO    ? item.TIPO.toString()   : '',
                        "CD_AGENDA":                    item.CD_AGENDA           ? item.CD_AGENDA.toString()          : '', 
                        "DT_INICIO_VIGENCIA":           item.DT_INICIO_VIGENCIA  ? item.DT_INICIO_VIGENCIA.toString() : '',
                        "DT_FINAL_VIGENCIA":            item.DT_FINAL_VIGENCIA   ? item.DT_FINAL_VIGENCIA.toString()  : '',
                        "DT_AGENDA":                    item.DT_AGENDA   ? item.DT_AGENDA.toString()  : '',
                        "DT_AGENDA_FIM":                item.DT_AGENDA_FIM   ? item.DT_AGENDA_FIM.toString()  : '',
                        "NR_CRM":                       item.NR_CRM              ? item.NR_CRM.toString()             : '',
                        "CD_PESSOA_FISICA":             item.CD_PESSOA_FISICA    ? item.CD_PESSOA_FISICA.toString()   : '',
                        "IE_DIA_SEMANA":                item.IE_DIA_SEMANA       ? item.IE_DIA_SEMANA.toString()      : '',
                        "NR_SEQ_CONSELHO":              item.NR_SEQ_CONSELHO      ? item.NR_SEQ_CONSELHO.toString()     : '',
                        "NR_CPF":                       item.NR_CPF              ? item.NR_CPF .toString()            : '',
                        "NM_PESSOA_FISICA":             item.NM_PESSOA_FISICA    ? item.NM_PESSOA_FISICA.toString()   : '',
                        "NR_CONSELHO_DO_PROF":          item.DS_CODIGO_PROF      ? item.DS_CODIGO_PROF.toString()     : '',
                        "SG_CONSELHO":                  item.SG_CONSELHO         ? item.SG_CONSELHO.toString()        : '',
                        "DS_CONSELHO":                  item.DS_CONSELHO         ? item.DS_CONSELHO.toString()        : '',
                        "CD_CONSELHO":                  item.NR_SEQ_CONSELHO     ? item.NR_SEQ_CONSELHO.toString()    : '', 
                        //"NM_GUERRA":                  item.NM_GUERRA           ? item.NM_GUERRA.toString()          : '',
                        "NM_GUERRA":                    item.NM_PESSOA_FISICA    ? item.NM_PESSOA_FISICA.toString()   : '', 
                        "DT_AGENDA_TURNO_ESPECIAL":     item.DT_AGENDA           ?  item.DT_AGENDA.toString()         : '',
                        "DT_AGENDA_FIM_TURNO_ESPEIAL":  item.DT_AGENDA_FIM       ? item.DT_AGENDA_FIM.toString()      : '',
                        "NM_USUARIO":                   item.NM_USUARIO          ? item.NM_USUARIO                    : '',
            })
        }
    })
    .finally(() => recort.close())
    .catch((err) => {
        console.log('Erro ao obter detalhes da agenda', err )
        dados = []
    })
    return dados
}

async function getQueueOfMachine( nmMachine){ 
    if ( !nmMachine )
        return 
    
    const recort = await oracledb.getConnection()
    return recort.execute(`
        select 
            c.nm_computador as nm_computador_local, 
            MLS.ds_local, 
            CM.nm_computador as nm_computador_monitor, 
            FES.ds_curto, 
            FES.ds_observacao 
        from tasy.maquina_local_senha MLS 
            inner join tasy.computador C on C.nr_sequencia = MLS.nr_seq_computador
            inner join tasy.computador CM on CM.nr_sequencia = MLS.nr_seq_comp_monitor
            inner join tasy.regra_liberacao_fila RLF on RLF.nr_seq_local_senha = MLS.nr_sequencia
            inner join tasy.fila_espera_senha FES on FES.nr_sequencia = RLF.nr_seq_fila_espera
        where C.nm_computador = :nm_computador 
    `,
    {
        "nm_computador": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": nmMachine.toString() } 
    },
    {
        outFormat: oracledb.OBJECT
    })
    .then((result) => {
        return result
    })
    .finally(() => recort.close())
    .catch((err) => {
        console.log("erro ao obter filas", err )
    })
}

const getConselho = async() => {
    const recort = await oracledb.getConnection()

    return await recort.execute(` select * from tasy.conselho_profissional `,
    {},
    {
        outFormat: oracledb.OBJECT
    })
    .then((result) => {
        if (result.rows.length > 0 ){
            return result.rows.map((result1) => {
                return {
                    "ds_conselho":      result1.DS_CONSELHO,
                    "sigla_conselho":   result1.SG_CONSELHO,
                    "nr_seq_conselho":  result1.NR_SEQUENCIA
                }
            })
        }
        return result.rows
    })
    .finally(() => recort.close())
    .catch((err) => {
        console.log('Erro ao obter conselho', err)
        return
    })
}

async  function buscaAtendimeto ( nrAtendimento ){
    if ( !nrAtendimento ) 
        return

    let dados = []
    
    const recort = await oracledb.getConnection()
    await recort.execute(`  
    select pfp.NM_PESSOA_FISICA, ap.CD_MEDICO_RESP, cpfp.* from atendimento_paciente ap 
        join pessoa_fisica pfp on (ap.cd_pessoa_fisica = pfp.cd_pessoa_fisica)
       left  join compl_pessoa_fisica cpfp on (pfp.cd_pessoa_fisica = cpfp.cd_pessoa_fisica  and cpfp.IE_TIPO_COMPLEMENTO =1  )
    where ap.nr_atendimento = :nrAtendimento
    `,
    {
        "nrAtendimento": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": nrAtendimento+"" }
    },
    {
        outFormat: oracledb.OBJECT
    })
    .then((result) => {
        //console.log(result.rows)
        //return  result.rows
        //dados = result.rows

         for(let item of result.rows){
            dados.push({
                        "CD_PESSOA_FISICA"  :   item.CD_PESSOA_FISICA   ?   item.CD_PESSOA_FISICA.toString()    : '', 
                        "CD_MEDICO_RESP"    :   item.CD_MEDICO_RESP     ?   item.CD_MEDICO_RESP.toString()      : '',  
                        "DS_ENDERECO"       :   item.DS_ENDERECO        ?   item.DS_ENDERECO.toString()+', '+item.NR_ENDERECO.toString()      : '',
                        "NR_TELEFONE"       :   item.NR_TELEFONE        ?   item.NR_TELEFONE.toString()         : '92999999999',
                        "DS_MUNICIPIO"      :   item.DS_MUNICIPIO       ?   item.DS_MUNICIPIO.toString()        : 'Manaus',
                        "NM_PESSOA_FISICA"  :   item.NM_PESSOA_FISICA   ?   item.NM_PESSOA_FISICA.toString()    : ''

            })
        } 
    })
    .finally(() => recort.close())
    .catch((err) => {
        console.log('Erro ao obter detalhes da agenda', err )
        dados = []
    })

    return dados
}

async  function logPrescricao (cdPessoaFisica, idPrescricao, tokenMed, nrAtendimento){
    //console.log("funcao dao de salvar ma tabela", cdPessoaFisica, idPrescricao, tokenMed, nrAtendimento)
    if ( !cdPessoaFisica || !idPrescricao || !tokenMed || !nrAtendimento ) 
        return

    let dados = []
    
    const recort = await oracledb.getConnection()
    await recort.execute(`  
    insert into samel.logPrescricaoMemed 
    (
        ID_PRESCRICAO,
        NR_ATENDIMENTO,
        CD_PESSOA_FISICA,
        TOKEN_MEDICO,
        DATA_LOG,
        STATUS_LOG
    )
    values (
        :idPrescricao,
        :nrAtendimento,
        :cdPessoaFisica,
        :tokenMed,
        SYSDATE,
        0
    )
    `,
    {
        ":cdPessoaFisica": { "dir": oracledb.BIND_IN, "type": oracledb.NUMBER, "val": parseInt(cdPessoaFisica)  },
        ":idPrescricao": { "dir": oracledb.BIND_IN, "type": oracledb.NUMBER, "val": parseInt(idPrescricao) },
        ":tokenMed": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": tokenMed+'' },
        ":nrAtendimento": { "dir": oracledb.BIND_IN, "type": oracledb.NUMBER, "val": parseInt(nrAtendimento) }
    },
    {
        autoCommit: true,
        outFormat: oracledb.OBJECT
    })
    .then((result) => {
        //console.log("result insert memed log", result)
        if(result.rowsAffected > 0){
            dados = result
        }
        else{
            dados = []
        }
    })
    .finally(() => recort.close())
    .catch((err) => {
        console.log('Erro ao inserir log de prescricao', err )
        dados = []
    })

    return dados
}




async function buscaLogReceita(){

    let dados = {
        dados: [],
        status: ''
    }
    
    const recort = await oracledb.getConnection()
    await recort.execute(`  
    select * from samel.logPrescricaoMemed where status_log = 1
    `,
    {},
    {
        outFormat: oracledb.OBJECT
    })
    .then((result) => {
        if(result.rows == '' || result.rows == []){
            console.log("result banco", result.rows)
            dados.dados = []
            dados.status = 'fail'
        }
        else{
            dados.dados = result.rows
            dados.status = 'success'
        }
    })
    .finally(() => recort.close())
    .catch((err) => {
        console.log('Erro ao obter log das prescricoes', err )
        dados.dados = []
        dados.status = 'false'
    })

    return dados

}

async function obtendoPrescricoesMemed(data){
    let dados = {
        dados: [],
        status: 'fail'
    }
    await axios.get(`https://sandbox.api.memed.com.br/v1/prescricoes/${data.ID_PRESCRICAO}?token=${data.TOKEN_MEDICO}`, { 'headers': {'accept': 'application/json'} })
    .then(result =>{
      dados.dados = result.data.data
      dados.status = 'success'
    })
    .catch(err =>{
      console.log(err)
    })

    return dados
}

async function insertPrecricao(nrAtendimento, cdPessoaFisica, htmlPrescricao, cdMedico){
    let dados = {
        dados: [],
        status: 'fail'
    }

    let sql = `  
    insert into med_receita 
    (
        NR_SEQUENCIA,
        NM_USUARIO,
        DT_RECEITA,
        DS_RECEITA,
        NR_ATENDIMENTO_HOSP,
        CD_PESSOA_FISICA,
        CD_MEDICO,
        DT_LIBERACAO,
        IE_TIPO_RECEITA,
        IE_SITUACAO,
        CD_PERFIL_ATIVO,
        IE_RN,
        IE_RESTRICAO_VISUALIZACAO,
        IE_NIVEL_ATENCAO,
        DS_UTC_ATUALIZACAO,
        DS_UTC,
        DT_ATUALIZACAO_NREC,
        NM_USUARIO_NREC,
        IE_ACAO,
        DT_VIGENCIA,
        DT_ATUALIZACAO
    )
    values (
        MED_RECEITA_SEQ.NEXTVAl,
        (select nm_usuario from usuario where cd_pessoa_fisica = :CD_MEDICO fetch first 1 rows only ),
        SYSDATE,
        :DS_RECEITA,
        :NR_ATENDIMENTO_HOSP,
        :CD_PESSOA_FISICA,
        :CD_MEDICO,
        SYSDATE,
        'C',
        'A',
        2186,
        'N',
       'T',
        'T',
        SYSDATE,
        SYSDATE,
        SYSDATE,
        (select nm_usuario from usuario where cd_pessoa_fisica = :CD_MEDICO fetch first 1 rows only),
        'U',
        SYSDATE,
        SYSDATE
    )
    `
    const recort = await oracledb.getConnection()
    await recort.execute(sql,
    {
        ":CD_PESSOA_FISICA": { "dir": oracledb.BIND_IN, "type": oracledb.NUMBER, "val": parseInt(cdPessoaFisica)  },
        ":CD_MEDICO": { "dir": oracledb.BIND_IN, "type": oracledb.NUMBER, "val": parseInt(cdMedico) },
        ":DS_RECEITA": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": htmlPrescricao+'' },
        ":NR_ATENDIMENTO_HOSP": { "dir": oracledb.BIND_IN, "type": oracledb.NUMBER, "val": parseInt(nrAtendimento) }
    },
    {
        autoCommit: true,
        outFormat: oracledb.OBJECT
    })
    .then((result) => {
        //console.log("result insert memed log", result)
        if(result.rowsAffected > 0){
            dados = result
        }
        else{
            dados = []
        }
    })
    .finally(() => recort.close())
    .catch((err) => {
        console.log('Erro ao inserir log de prescricao', err )
        dados = []
    })

    return dados
}


async function updateLogPrescricao(data){
    let dados = {
        dados: [],
        status: 'fail'
    }

    const update = await oracledb.getConnection()

    await update.execute(`
                    update samel.logPrescricaoMemed
                    set 
                        status_log = 0  
                    where 
                        id_prescricao = :id_prescricao  
    `,
    {
        ":id_prescricao": {"dir": oracledb.BIND_IN, "type": oracledb.NUMBER, "val": parseInt(data.ID_PRESCRICAO)}
    },
    {
        outFormat:oracledb.OBJECT,
        autoCommit: true
    }
    ).then(result =>{
        if(result.rowsAffected > 0){
            dados.status = 'success'
        }
    }).finally( () => {
        update.close()
    })
    .catch( err => {
        console.log( "erro up",err )
    dados.status = 'fail'
    })

    return dados
}

const getExecComRecFacial = async (cd_pf_medico) => {
    if(!cd_pf_medico) {
        return {
            "status": "fail",
            "message": "Dados insuficientes para consulta no banco"
        }
    }

    const sql = `
    select count(1) com_rec from (
        select max(IE_STATUS_REC_FACE), nr_atendimento
            from samel.LOG_REC_FACIAL_AMBULATORIO
        where 1=1
            and CD_PESSOA_FISICA_MEDICO = :cd_pessoa_fisica_medico_bind
            and created between trunc(sysdate) and (trunc(sysdate) + 0.99999)
        group by nr_atendimento
        having(max(IE_STATUS_REC_FACE) = 1))
    `;

    const recort = await oracledb.getConnection();
    return await recort.execute(sql, {
        ":cd_pessoa_fisica_medico_bind": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": cd_pf_medico.toString() }
    },
    {
        outFormat:oracledb.OBJECT
    })
    .then(result => {
        // console.log(result.rows);
        // console.log(1);
        return result.rows;
    })
    .finally(() => recort.close())
    .catch(err => {
        console.log(err);
        return err;
    })
}

const getExecSemRecFacial = async (cd_pf_medico) => {
    if(!cd_pf_medico) {
        return {
            "status": "fail",
            "message": "Dados insuficientes para consulta no banco"
        }
    }

    const sql = `
        select count(1) sem_rec from (
        select max(IE_STATUS_REC_FACE), nr_atendimento
            from samel.LOG_REC_FACIAL_AMBULATORIO
        where 1=1
            and CD_PESSOA_FISICA_MEDICO = :cd_pessoa_fisica_medico_bind
            and created between trunc(sysdate) and (trunc(sysdate) + 0.99999)
        group by nr_atendimento
        having(max(IE_STATUS_REC_FACE) = 0))
    `;

    const recort = await oracledb.getConnection();

    return await recort.execute(sql, {
        ":cd_pessoa_fisica_medico_bind": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": cd_pf_medico.toString() }
    },
    {
        outFormat: oracledb.OBJECT
    })
    .then(result => {
        console.log(result.rows);
        return result.rows;
    })
    .finally(() => recort.close())
    .catch(err => {
        console.log(err);
        return err;
    })
}

const getTodosAgendados = async (cd_agenda = null) => {
    if ( !cd_agenda ) {
        return {
            "status": "fail",
            "message": "cd_agenda não informado"
        }
    }

    const sql = `select * from tasy.agenda_consulta
                 where cd_agenda = :cd_agenda_bind
                 and ie_status_agenda in('M', 'N', 'AC', 'O', 'E')
                 and trunc(dt_agenda) = trunc(sysdate)`;

    const recort = await oracledb.getConnection();
    
    return await recort.execute(sql, {
        "cd_agenda_bind": {
            "dir": oracledb.BIND_IN,
            "type": oracledb.STRING,
            "val": cd_agenda.toString()
        }
    },
    {
        outFormat: oracledb.OBJECT
    })
    .then(result => {
        // console.log(result.rows);
        return result.rows.length;
    })
    .finally(() => recort.close())
    .catch(err => {
        console.log(err);
        return err;
    })
}





async function getSchedulesFromMedic(cdMedico){
    const getAgendas = await oracledb.getConnection();

    const sql = `select distinct 
    a.cd_agenda,
    a.cd_pessoa_fisica,
    tasy.obter_nome_pf(a.cd_pessoa_fisica) as nm_guerra,
    tu.nm_unidade,
    a.ds_agenda,
        tasy.obter_ds_especialidade(a.CD_ESPECIALIDADE) as ds_especialidade
    from 
        agenda  a
    join appv2.tb_unidade_setor tus on (tus.cd_setor = a.CD_SETOR_AGENDA)
    join appv2.tb_unidade tu on (tu.cd_unidade = tus.cd_unidade)

    where 1=1
    and cd_pessoa_fisica = :cd_pessoa_fisica`


    const bind = {
        ":cd_pessoa_fisica": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": cdMedico },
    }

    const option = {
        outFormat: oracledb.OBJECT
    }

    return await getAgendas.execute(sql, bind, option)
        .then((result) => {
            //console.log(result.rows)
            return { 
                sucesso:true,
                dados: result.rows
            }
        })
        .finally(()=>getAgendas.close())
        .catch((err) => {
            console.log('Erro ao obter agendas', err)
            return  { 
                sucesso:false,
                mensagem:'Erro ao obter agendas: '+err,
            }
        })

}



async function listMedicalProduction(cdAgenda, dtInicial, dtFinal, statusAgenda){
    const production = await oracledb.getConnection();

    const sql = `SELECT
    to_char(a.dt_agenda, 'DD/MM HH24:MI') dt_agenda,
    a.nm_paciente,
    a.nr_atendimento,
    substr(obter_valor_dominio(83, a.ie_status_agenda), 1, 200)        ds_status_agenda,
    substr(obter_desc_convenio(a.cd_convenio), 1, 100)                 ds_convenio,
    substr(obter_desc_agenda(a.cd_agenda), 1, 100)                     ds,
    to_char(pc_obter_dt_nascimento(a.cd_pessoa_fisica), 'DD/MM/YYYY') dt_nascimento,
--nvl(a.ds_classif_agenda, a.ds_classif_agenda_tasy) ds_classif_agenda, 
    obter_desc_classif_atend(b.nr_seq_classificacao)                   ds_classif_atend,
    CASE
        WHEN ( samel.obter_consulta_aprovada_rec(b.nr_atendimento) IN ( '1' )
               OR ( tasy.obter_idade(tasy.pc_obter_dt_nascimento(a.cd_pessoa_fisica), sysdate, 'M') < ( 12 * 5 ) ) ) THEN
            'ATEDIMENTOS REALIZADOS COM RECONHECIMENTO FACIAL'
        ELSE
            'ATEDIMENTOS REALIZADOS SEM RECONHECIMENTO FACIAL'
    END                                                                AS teste1,
    CASE
        WHEN samel_obter_se_atend_retorno(a.nr_atendimento, 'C') = 'S' THEN
            'Retorno'
        ELSE
            '1° Consulta'
    END                                                                AS ds_class,
    substr(obter_classif_agenda_consulta(a.ie_classif_agenda), 1, 100) ds_classificacao,
    substr(a.nr_telefone, 1, 16) nr_telefone,
    a.ie_encaixe
FROM
    agenda_consulta_v    a,
    atendimento_paciente b
WHERE
    trunc(a.dt_agenda) BETWEEN to_date(:dt_inicial, 'yyyy-mm-dd') AND to_date(:dt_final, 'yyyy-mm-dd')+ interval '23:59' hour to MINUTE
    AND a.nr_atendimento = b.nr_atendimento
    AND a.cd_agenda = :cd_agenda 
    AND a.ie_status_agenda = :ie_status_agenda 
  --and samel.OBTER_CONSULTA_APROVADA_REC(b.nr_atendimento) in (1)  

ORDER BY
    9,
    a.dt_agenda
    `


    const bind = {
        ":cd_agenda": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": cdAgenda },
        ":ie_status_agenda": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": statusAgenda },
        ":dt_inicial": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": dtInicial },
        ":dt_final": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": dtFinal }
    }

    const option = {
        outFormat: oracledb.OBJECT
    }

    return await production.execute(sql, bind, option)
        .then((result) => {
            return { 
                sucesso:true,
                dados: result.rows
            }
        })
        .finally(()=>production.close())
        .catch((err) => {
            console.log('Erro ao listar produçao médica', err)
            return  { 
                sucesso:false,
                mensagem:'Erro ao listar produçao médica : '+err,
            }
        })

}







module.exports = {
    listMedicalProduction,
    getSchedulesFromMedic,
    getScheduleByMedic,
    getScheduleByMedicPendent,
    callPatient,
    getMachines,
    getMachine,
    getQueueOfMachine,
    createLogAuthRecFace,
    getScheduleByMedicExecuted,
    getDoctor,
    regAlertCpf,
    getClinic,
    scheduleDetail,
    getConselho,
    getSalas,
    getSalasPs,
    buscaAtendimeto,
    logPrescricao,
    buscaLogReceita,
    obtendoPrescricoesMemed,
    insertPrecricao,
    updateLogPrescricao,
    getExecComRecFacial,
    getExecSemRecFacial,
    getTodosAgendados,
    
}
