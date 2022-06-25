const oracledb = require('oracledb');
const crypto = require('crypto');
const alg = 'aes-256-ctr';
const secret = process.env.SECRET;
const hostPixeonAurora = process.env.HOST_PIXEON_AURORA;
const pixeonSecret = process.env.PIXEON_SECRET;
const jti = process.env.JTI;
const conveniosSamel = JSON.parse(process.env.CONVENIOS_SAMEL);

const agendamentoRetorno = require('./agendamentoRetornoDAO')
const { BIND_IN, BIND_OUT } = require('oracledb')

async function obterTaxaAvaliacao(cdMedico) {
    retorno = {
        status: false,
        msg: '',
        dados: [],
    };

    const db = await oracledb.getConnection();
    await db
        .execute(
            `select
                            round(avg(cast(trim(ds_descricao) as number)), 2) as nota_atendimento_ambulatorios
                        from samel.pes_atendimento pa
                        join samel.pes_resposta pra on (pa.nr_atendimento = pra.nr_atendimento)
                        where 1=1
                            and cd_pergunta = 'A1'
                            and cd_medico = :CD_MEDICO`, {
                ':CD_MEDICO': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: cdMedico.toString(),
                },
            }, {
                outFormat: oracledb.OBJECT,
            },
        )
        .then(result => {
            retorno.status = true;
            retorno.msg = 'Sucesso ao obter atestados';
            retorno.dados = result.rows[0];
        })
        .finally(function() {
            db.close();
        })
        .catch(err => {
            console.log(`Erro ao obter atestados: ${err}`);
            retorno.msg = 'Erro ao obter atestados';
        });
    return retorno;
}

async function executarProcedimentos(
    nrPrescricao,
    nrSeqProced,
    nmUsuario,
    cdPerfil,
    cdFuncao,
) {
    retorno = {
        status: false,
        msg: '',
        dados: [],
    };

    const db = await oracledb.getConnection();
    await db
        .execute(
            `declare
                        nr_seq_procpaci_p_s number;
                    begin
                    Gerar_Proced_Paciente_Pendente(
                        nr_prescricao_p  => :NR_PRESCRICAO,
                        nr_seq_proced_p => :NR_SEQ_PROCED,
                        nm_usuario_p   => :NM_USUARIO,
                        cd_perfil_p => 2232,
                        cd_funcao_p  =>  942,
                        cd_categoria_p    => null,
                        ie_tipo_atend_tiss_p  => null,
                        nr_seq_procpaci_p => nr_seq_procpaci_p_s
                        );
                        DBMS_OUTPUT.put_line('nr_seq_procpaci_p_ : ' || nr_seq_procpaci_p_s);
                    end`, {
                ':NR_PRESCRICAO': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.NUMBER,
                    val: nrPrescricao,
                },
                ':NR_SEQ_PROCED': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.NUMBER,
                    val: nrSeqProced,
                },
                ':NM_USUARIO': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: nmUsuario.toString(),
                },
            }, {
                outFormat: oracledb.OBJECT,
            },
        )
        .then(result => {
            retorno.status = true;
            retorno.msg = 'Sucesso ao obter atestados';
            retorno.dados = result.rows;
        })
        .finally(function() {
            db.close();
        })
        .catch(err => {
            console.log(`Erro ao obter atestados: ${err}`);
            retorno.msg = 'Erro ao obter atestados';
        });
    return retorno;
}

async function obterProcedimentos(nrAtendimento) {
    retorno = {
        status: false,
        msg: '',
        dados: [],
    };

    const db = await oracledb.getConnection();
    await db
        .execute(
            `SELECT  distinct

                        b.nr_atendimento,
                        b.nr_prescricao nr_prescricao,
                        c.nr_sequencia as  nr_sequencia_presc,
                        b.dt_prescricao dt_prescricao,
                        g.ds_valor_dominio ds_status_exame,
                        substr(obter_desc_procedimento  (c.cd_procedimento,c.ie_origem_proced),1,200) ds_procedimento,
                        substr(obter_nome_setor(c.cd_setor_atendimento),1,255) ds_setor_atend
                        FROM   valor_dominio g,
                        
                        prescr_procedimento c,
                        prescr_medica b
                        WHERE b.nr_prescricao = c.nr_prescricao
                        and g.cd_dominio = 1226
                        and  c.ie_status_execucao = g.vl_dominio
                        and b.nr_atendimento = :NR_ATENDIMENTO
                        ORDER BY nr_prescricao desc`, {
                ':NR_ATENDIMENTO': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: nrAtendimento.toString(),
                },
            }, {
                outFormat: oracledb.OBJECT,
            },
        )
        .then(result => {
            retorno.status = true;
            retorno.msg = 'Sucesso ao obter atestados';
            retorno.dados = result.rows;
        })
        .finally(function() {
            db.close();
        })
        .catch(err => {
            console.log(`Erro ao obter atestados: ${err}`);
            retorno.msg = 'Erro ao obter atestados';
        });
    return retorno;
}

async function buscarAtestadosPaciente(cdPessoaFisica, nmUsuario, cdMedico) {
    retorno = {
        status: false,
        msg: '',
        dados: [],
    };

    const db = await oracledb.getConnection();
    await db
        .execute(
            `SELECT a.* ,
                        substr(tasy.obter_nome_pessoa_fisica(cd_medico, null),1,200) NM_MEDICO,
                        substr(tasy.obter_descricao_padrao('TIPO_ATESTADO','DS_TITULO',NR_SEQ_TIPO_ATESTADO),1,100) DS_TIPO_ATESTADO,
                        tasy.OBTER_DATA_ASSINATURA_DIGITAL(nr_seq_assinatura) DT_ASSINATURA,
                        tasy.OBTER_DATA_ASSINATURA_DIGITAL(nr_seq_assinat_inativacao) DT_ASSINATURA_INATIVACAO,
                        substr(tasy.comparar_data(dt_atestado,dt_atualizacao_nrec - (1/144),'2'),1,1) IE_REGISTRO_RETROATIVO,
                        substr(tasy.obter_pendencia_assinatura(tasy.wheb_usuario_pck.get_nm_usuario,nr_sequencia,'AT'),1,1) IE_PENDENCIA_ASSINATURA
                        --substr(tasy.obter_desc_espec_medica(CD_ESPECIALIDADE_MEDICO),1,50) DS_ESPECIALIDADE_PROF
                    FROM	tasy.ATESTADO_PACIENTE a
                    WHERE 1 = 1 
                    AND	cd_pessoa_fisica = :CD_PESSOA_FISICA 
                    AND	((tasy.obter_liberacao_registro('S',:NM_USUARIO,dt_liberacao,nm_usuario) = 'S') OR ((nvl(ie_avaliador_aux,'N') = 'S') 
                    AND	(cd_medico = :CD_MEDICO) OR (nvl(nm_usuario_nrec,nm_usuario) = :NM_USUARIO ))) 
                    AND	tasy.obter_lib_registro_situacao('S',ie_situacao) = 'S'
                    ORDER BY DT_ATESTADO desc`, {
                ':CD_PESSOA_FISICA': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: cdPessoaFisica.toString(),
                },
                ':NM_USUARIO': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: nmUsuario,
                },
                ':CD_MEDICO': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: cdMedico.toString(),
                },
            }, {
                outFormat: oracledb.OBJECT,
            },
        )
        .then(result => {
            retorno.status = true;
            retorno.msg = 'Sucesso ao obter atestados';
            retorno.dados = result.rows;
        })
        .finally(function() {
            db.close();
        })
        .catch(err => {
            console.log(`Erro ao obter atestados: ${err}`);
            retorno.msg = 'Erro ao obter atestados';
        });
    return retorno;
}

async function converterArquivoLista(idArquivo, nmUsuario) {
    retorno = {
        status: false,
        msg: '',
        dados: [],
    };

    const db = await oracledb.getConnection();
    await db
        .execute(
            `declare
                        begin
                            tasy.converte_rtf_html2('
                            select ds_atestado 
                            from tasy.atestado_paciente 
                            where nr_sequencia = :nr', :idArquivo, :nmUsuario, :ds_out_w);
                        end;`, {
                ':idArquivo': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: idArquivo,
                },
                ':nmUsuario': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: nmUsuario,
                },
                ':ds_out_w': { dir: oracledb.BIND_OUT, type: oracledb.STRING },
            }, {
                outFormat: oracledb.OBJECT,
            },
        )
        .then(async result => {
            const nrSequencia = result.outBinds[':ds_out_w'];

            oracledb.fetchAsString = [oracledb.CLOB];

            await db
                .execute(
                    `select ds_texto_clob from tasy.TASY_CONVERSAO_RTF
                            where nr_sequencia = :nrSequencia`, {
                        ':nrSequencia': {
                            dir: oracledb.BIND_IN,
                            type: oracledb.STRING,
                            val: nrSequencia,
                        },
                    }, {
                        outFormat: oracledb.OBJECT,
                    },
                )
                .then(result => {
                    retorno.msg = `Sucesso ao obter arquivo convertido`;
                    retorno.dados = result.rows[0].DS_TEXTO_CLOB;
                })
                .catch(err => {
                    console.log(`Erro ao obter arquivo convertido: ${err}`);
                    retorno.msg = `Erro ao obter arquivo convertido: ${err}`;
                });
        })
        .finally(function() {
            db.close();
        })
        .catch(err => {
            console.log(`Erro ao converter arquivo da lista: ${err}`);
            retorno.msg = `Erro ao converter arquivo da lista`;
        });
    return retorno;
}

async function obterModeloAtestado(nrAtendimento) {
    retorno = {
        status: false,
        msg: '',
        dados: [],
    };

    const db = await oracledb.getConnection();
    await db
        .execute(
            `SELECT nr_sequencia cd,
                                ds_titulo ds,
                                ds_atestado
                    FROM	tasy.tipo_atestado
                    WHERE (to_char(cd_estabelecimento) = to_char(1) OR cd_estabelecimento is null)
                    AND ((cd_perfil is null) OR (cd_perfil = 2339))
                    AND ((cd_setor_atendimento is null) OR (cd_setor_atendimento = 1))
                    AND ((cd_setor_paciente is null) OR (cd_setor_paciente = 115) OR (115 = 0))
                    AND ((cd_especialidade = 25) OR ( cd_especialidade is null) 
                        OR (25 = 0))
                    AND ie_situacao   = 'A'
                    AND (tasy.obter_se_atestado_lib(:nr_atendimento,nr_sequencia) = 'S')
                    AND (tasy.Obter_Se_atestado_padrao_lib(nr_sequencia) = 'S')
                    ORDER BY 2
   `, {
                nr_atendimento: {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: nrAtendimento.toString(),
                },
            }, {
                outFormat: oracledb.OBJECT,
            },
        )
        .then(result => {
            retorno.status = true;
            retorno.msg = 'Sucesso ao obter modelos de atestados';
            retorno.dados = result.rows;
        })
        .finally(function() {
            db.close();
        })
        .catch(err => {
            console.log(`Erro ao obter modelos de atestados: ${err}`);
            retorno.msg = `Erro ao obter modelos de atestados`;
        });
    return retorno;
}

async function converterArquivo(
    idArquivo,
    nmUsuario,
    cdPessoaFisica,
    nrAtendimento,
    diasAtestado,
    cdMedico,
) {
    retorno = {
        status: false,
        msg: '',
        dados: [],
    };

    const db = await oracledb.getConnection();
    await db
        .execute(
            `declare
                        begin
                            tasy.converte_rtf_html2('
                                select ds_atestado 
                                from tipo_atestado 
                                where nr_sequencia = :nr', :idArquivo, :nmUsuario, :ds_out_w);
                        end;`, {
                ':idArquivo': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: idArquivo.toString(),
                },
                ':nmUsuario': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: nmUsuario,
                },
                ':ds_out_w': { dir: oracledb.BIND_OUT, type: oracledb.STRING },
            }, {
                outFormat: oracledb.OBJECT,
            },
        )
        .then(async result => {
            const nrSequencia = result.outBinds[':ds_out_w'];

            oracledb.fetchAsString = [oracledb.CLOB];

            await db
                .execute(
                    `select replace(
            replace(
            replace(
            replace(
            replace(
            replace(
            replace((select ds_texto_clob from tasy.TASY_CONVERSAO_RTF where nr_sequencia = :nrSequencia)
                 ,'@nome',(select tasy.SUBSTITUIR_MACRO_TEXTO_TASY('@NOME','CD_PESSOA_FISICA',:cdPessoaFisica) FROM dual))
                 ,'@Cid', (select tasy.SUBSTITUIR_MACRO_TEXTO_TASY('@CID','NR_ATENDIMENTO',:nrAtendimento) FROM	dual))
                 ,'@Dias_atestado', :diasAtestado)
                 ,'@Data_intern_sem_hora', to_char(sysdate, 'DD/MM/YYYY'))
                 ,'@DataExt', to_char(sysdate, 'DD/MM/YYYY'))
                 ,'@Medico', (select tasy.SUBSTITUIR_MACRO_TEXTO_TASY('@NM_MEDICO','CD_PESSOA_USUARIO',:cdMedico) FROM	dual))
                 ,'@NM_Medico', (select tasy.SUBSTITUIR_MACRO_TEXTO_TASY('@NM_MEDICO','CD_PESSOA_USUARIO',:cdMedico) FROM	dual))
                 as html
            FROM DUAL`, {
                        ':nrSequencia': {
                            dir: oracledb.BIND_IN,
                            type: oracledb.STRING,
                            val: nrSequencia,
                        },
                        ':cdPessoaFisica': {
                            dir: oracledb.BIND_IN,
                            type: oracledb.STRING,
                            val: cdPessoaFisica.toString(),
                        },
                        ':nrAtendimento': {
                            dir: oracledb.BIND_IN,
                            type: oracledb.STRING,
                            val: nrAtendimento.toString(),
                        },
                        ':diasAtestado': {
                            dir: oracledb.BIND_IN,
                            type: oracledb.NUMBER,
                            val: diasAtestado,
                        },
                        ':cdMedico': {
                            dir: oracledb.BIND_IN,
                            type: oracledb.NUMBER,
                            val: cdMedico,
                        },
                    }, {
                        outFormat: oracledb.OBJECT,
                    },
                )
                .then(result => {
                    retorno.status = true;
                    retorno.msg = 'Sucesso ao converter atestado';
                    retorno.dados = result.rows[0].HTML;
                });
        })
        .finally(function() {
            db.close();
        })
        .catch(err => {
            console.log(`Erro ao converter arquivo: ${err}`);
            retorno.msg = `Erro ao converter arquivo`;
        });
    return retorno;
}

async function converterArquivo2(idArquivo, nmUsuario, cdMedico, tipo, origem) {
    let retorno = {
        status: false,
        msg: '',
        dados: [],
    };

    let query = '';
    let idArquivoConversao = '';

    switch (tipo) {
        case 1:
            query = `select ds_atestado from tasy.atestado_paciente 
                        where nr_sequencia = :nr`;
            idArquivoConversao = idArquivo;
            break;
        case 2:
            query = `SELECT ds_texto FROM tasy.med_texto_padrao
                        where nr_sequencia = :nr`;
            idArquivoConversao = idArquivo;
            break;
        case 3:
            query = `select ds_anamnese from tasy.anamnese_paciente
                        where nr_sequencia = :nr`;
            idArquivoConversao = idArquivo;
            break;
        case 4:
            query = `select ds_receita from tasy.med_receita
                        where nr_sequencia = :nr`;
            idArquivoConversao = idArquivo;
            break;
        case 5:
            query = `select ds_solicitacao from tasy.PEDIDO_EXAME_EXTERNO
                        where nr_sequencia = :nr`;
            idArquivoConversao = idArquivo;
            break;
        case 6:
            query = `select ds_resultado from tasy.result_laboratorio
                        WHERE  nr_sequencia = :nr`;
            idArquivoConversao = idArquivo;
            break;
        case 7:
            query = `select ds_laudo from tasy.laudo_paciente
                        where nr_sequencia = :nr`;
            idArquivoConversao = idArquivo;
            break;
        case 8:
            if (origem == 1) {
                // Origem JAVA
                console.info('Convertendo RTF no Tasy JAVA');
                query = `select ds_anamnese from tasy.ANAMNESE_PACIENTE
                        where nr_sequencia = :nr`;
                idArquivoConversao = idArquivo;
            } else {
                // Origem HTML
                console.info('Convertendo RTF no Tasy HTML');
                query = `select ds_evolucao from tasy.EVOLUCAO_PACIENTE
                        where cd_evolucao = :nr`;
                idArquivoConversao = idArquivo;
            }
            break;
    }

    const db = await oracledb.getConnection();
    oracledb.fetchAsString = [oracledb.CLOB];
    await db
        .execute(
            `declare
                        begin
                            tasy.converte_rtf_html2(:query, :idArquivo, :nmUsuario, :ds_out_w);
                        end;`, {
                ':query': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: query,
                },
                ':idArquivo': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: idArquivoConversao.toString(),
                },
                ':nmUsuario': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: nmUsuario,
                },
                ':ds_out_w': { dir: oracledb.BIND_OUT, type: oracledb.STRING },
            }, {
                outFormat: oracledb.OBJECT,
            },
        )
        .then(async result => {
            const nrSequencia = result.outBinds[':ds_out_w'];
            oracledb.fetchAsString = [oracledb.CLOB];
            await db
                .execute(
                    `select * from tasy.TASY_CONVERSAO_RTF
                            where nr_sequencia = :nrSequencia`, {
                        ':nrSequencia': {
                            dir: oracledb.BIND_IN,
                            type: oracledb.STRING,
                            val: nrSequencia,
                        },
                    }, {
                        outFormat: oracledb.OBJECT,
                    },
                )
                .then(result => {
                    retorno.status = true;
                    retorno.msg = 'Sucesso ao converter arquivo';
                    retorno.dados = result.rows[0];
                });
        })
        .finally(function() {
            db.close();
        })
        .catch(err => {
            console.log(`Erro ao converter arquivo: ${err}`);
            retorno.msg = `Erro ao converter arquivo`;
        });
    return retorno;
}

async function obterTextoPadraoMedico(cdMedico) {
    retorno = {
        status: false,
        msg: '',
        dados: [],
    };

    const db = await oracledb.getConnection();
    await db
        .execute(
            `SELECT * FROM	tasy.med_texto_padrao
                        WHERE 1 = 1
                        and ((ie_evolucao_clinica = null) OR (ie_evolucao_clinica is null))
                        and cd_medico = :cdMedico
                        and ((nr_seq_grupo = 0) OR (0 = 0))
                        ORDER BY ds_titulo`, {
                ':cdMedico': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: cdMedico.toString(),
                },
            }, {
                outFormat: oracledb.OBJECT,
            },
        )
        .then(result => {
            retorno.status = true;
            if (result.rows.length > 0) {
                retorno.msg = 'Sucesso ao obter texto padrão';
                retorno.dados = result.rows;
            } else {
                retorno.msg = 'Médico sem texto padrão';
            }
        })
        .finally(function() {
            db.close();
        })
        .catch(err => {
            console.log(`Erro ao obter texto pardão: ${err}`);
            retorno.msg = `Erro ao obter texto pardão: ${err}`;
        });
    return retorno;
}

async function obterEspecialidadesMedico(cdMedico) {
    retorno = {
        status: false,
        msg: '',
        dados: [],
    };

    const db = await oracledb.getConnection();
    await db
        .execute(
            `SELECT 
                        cd_especialidade cd,
                        substr(tasy.obter_desc_espec_medica(cd_especialidade),1,100) ds
                    FROM	tasy.medico_especialidade
                    WHERE cd_pessoa_fisica = :cdMedico
                    ORDER BY ds`, {
                ':cdMedico': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: cdMedico.toString(),
                },
            }, {
                outFormat: oracledb.OBJECT,
            },
        )
        .then(result => {
            retorno.status = true;
            retorno.msg = 'Sucesso ao obter especialidades do médico';
            retorno.dados = result.rows;
        })
        .finally(function() {
            db.close();
        })
        .catch(err => {
            console.log(`Erro ao obter especialidades do médico: ${err}`);
            retorno.msg = `Erro ao obter especialidades do médico: ${err}`;
        });
    return retorno;
}

async function checarDiagnosticoExistente(nrAtendimento, nmUsuario) {
    console.log(typeof nrAtendimento, nmUsuario);
    let retorno = {
        status: false,
        msg: '',
    };

    //commit de teste
    const db = await oracledb.getConnection();
    await db
        .execute(
            `SELECT count(1) qtd
                    FROM	tasy.DIAGNOSTICO_DOENCA a
                    WHERE 1 = 1 
                    AND	nr_atendimento = :NR_ATENDIMENTO
                    AND DT_LIBERACAO IS NOT NULL
                    and tasy.obter_liberacao_registro('S',:NM_USUARIO, dt_liberacao,nm_usuario) = 'S'`, {
                ':NR_ATENDIMENTO': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: nrAtendimento.toString(),
                },
                ':NM_USUARIO': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: nmUsuario,
                },
            }, {
                outFormat: oracledb.OBJECT,
            },
        )
        .then(result => {
            if (result.rows[0].QTD > 0) {
                retorno.status = true;
                retorno.msg = 'Paciente possui diagnóstico';
            } else {
                retorno.status = false;
                retorno.msg = 'Paciente não possui diagnóstico';
            }
        })
        .finally(function() {
            db.close();
        })
        .catch(err => {
            console.log(`Erro ao checar diagnóstico: ${err}`);
            retorno.msg = 'Erro ao checar diagnóstico';
        });
    return retorno;
}

async function checarDiagnosticoExistente2(nrAtendimento, nmUsuario){

    console.log(typeof(nrAtendimento), nmUsuario)
    let retorno = {
        status: false, 
        msg: '',
        dados: []
    }

    //commit de teste
    const db = await oracledb.getConnection();
    await db.execute(`SELECT * FROM	tasy.DIAGNOSTICO_DOENCA a
                    WHERE 1 = 1 
                    AND	nr_atendimento = :NR_ATENDIMENTO
                    AND DT_LIBERACAO IS NOT NULL
                    and tasy.obter_liberacao_registro('S',:NM_USUARIO, dt_liberacao,nm_usuario) = 'S'`,
    { 
        ":NR_ATENDIMENTO": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": nrAtendimento.toString() },
        ":NM_USUARIO": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": nmUsuario },
    },
    { 
        outFormat: oracledb.OBJECT
    })
    .then(result => {
        if(result.rows.length > 0){
            retorno.dados = result.rows
            retorno.status = true
            retorno.msg = 'Paciente possui diagnóstico'
        }else{
            retorno.status = false
            retorno.msg = 'Paciente não possui diagnóstico'
        }
    })
    .finally(function(){
        db.close()
    })
    .catch(err => { 
        console.log(`Erro ao checar diagnóstico: ${err}`)
        retorno.msg = 'Erro ao checar diagnóstico'
    })
    return retorno
}

async function salvarAtestado(dadosAtestado){ 
    retorno = {
        status: false,
        msg: '',
    };

    const db = await oracledb.getConnection();
    await db
        .execute(
            `INSERT INTO tasy.ATESTADO_PACIENTE (
                            IE_RESTRICAO_VISUALIZACAO, 
                            IE_NIVEL_ATENCAO,
                            NM_USUARIO_NREC, 
                            DT_ATUALIZACAO_NREC,
                            IE_AVALIADOR_AUX,
                            NM_USUARIO,
                            CD_MEDICO,
                            CD_PERFIL_ATIVO,
                            DS_ATESTADO,
                            DT_LIBERACAO,
                            DT_ATESTADO,
                            NR_SEQUENCIA,
                            DT_ATUALIZACAO,
                            QT_CARACTERES,
                            IE_SITUACAO,
                            CD_PESSOA_FISICA,
                            NR_ATENDIMENTO )
                    VALUES (:IE_RESTRICAO_VISUALIZACAO, 
                            :IE_NIVEL_ATENCAO, 
                            :NM_USUARIO_NREC, 
                            sysdate, 
                            :IE_AVALIADOR_AUX, 
                            :NM_USUARIO,
                            :CD_MEDICO, 
                            :CD_PERFIL_ATIVO, 
                            :DS_ATESTADO,
                            null, 
                            sysdate, 
                            tasy.ATESTADO_PACIENTE_seq.nextval,
                            sysdate, 
                            :QT_CARACTERES, 
                            :IE_SITUACAO, 
                            :CD_PESSOA_FISICA, 
                            :NR_ATENDIMENTO)`, {
                ':IE_RESTRICAO_VISUALIZACAO': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: dadosAtestado.IE_RESTRICAO_VISUALIZACAO.toString(),
                },
                ':IE_NIVEL_ATENCAO': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: dadosAtestado.IE_NIVEL_ATENCAO.toString(),
                },
                ':NM_USUARIO_NREC': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: dadosAtestado.NM_USUARIO_NREC,
                },
                ':IE_AVALIADOR_AUX': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: dadosAtestado.IE_AVALIADOR_AUX.toString(),
                },
                ':NM_USUARIO': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: dadosAtestado.NM_USUARIO,
                },
                ':CD_MEDICO': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: dadosAtestado.CD_MEDICO.toString(),
                },
                ':CD_PERFIL_ATIVO': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: dadosAtestado.CD_PERFIL_ATIVO.toString(),
                },
                ':DS_ATESTADO': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: dadosAtestado.DS_ATESTADO,
                },
                ':QT_CARACTERES': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: dadosAtestado.QT_CARACTERES.toString(),
                },
                ':IE_SITUACAO': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: dadosAtestado.IE_SITUACAO.toString(),
                },
                ':CD_PESSOA_FISICA': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: dadosAtestado.CD_PESSOA_FISICA.toString(),
                },
                ':NR_ATENDIMENTO': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: dadosAtestado.NR_ATENDIMENTO.toString(),
                },
            }, {
                outFormat: oracledb.OBJECT,
                autoCommit: true,
            },
        )
        .then(result => {
            if (result.rowsAffected > 0) {
                retorno.status = true;
                retorno.msg = 'Sucesso ao inserir atestado';
            }
        })
        .finally(function() {
            db.close();
        })
        .catch(err => {
            console.log(`Erro ao inserir atestado: ${err}`);
            retorno.msg = `Erro ao inserir atestado`;
        });
    return retorno;
}

async function apagarAtestado(nrSeqAtestado) {
    let retorno = {
        status: false,
        msg: '',
    };

    const db = await oracledb.getConnection();
    await db
        .execute(
            `DELETE FROM tasy.ATESTADO_PACIENTE
                        WHERE 1 = 1 
                    AND	NR_SEQUENCIA = :NR_SEQ_ATESTADO`, {
                ':NR_SEQ_ATESTADO': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.NUMBER,
                    val: nrSeqAtestado,
                },
            }, {
                outFormat: oracledb.OBJECT,
                autoCommit: true,
            },
        )
        .then(result => {
            if (result.rowsAffected > 0) {
                (retorno.status = true),
                (retorno.msg = 'Sucesso ao apagar atestado');
            } else {
                retorno.msg = 'Erro ao apagar atestado';
            }
        })
        .finally(function() {
            db.close();
        })
        .catch(err => {
            console.log(`Erro ao apagar atestado: ${err}`);
            retorno.msg = `Erro ao apagar atestado atestado`;
        });
    return retorno;
}

async function liberarAtestado(nrSeqAtestado) {
    let retorno = {
        status: false,
        msg: '',
    };

    const db = await oracledb.getConnection();
    await db
        .execute(
            `begin
                        tasy.LIBERAR_ATESTADO_PACIENTE(:NR_SEQ_ATESTADO);
                    end;`, {
                ':NR_SEQ_ATESTADO': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: nrSeqAtestado.toString(),
                },
            }, {
                outFormat: oracledb.OBJECT,
                autoCommit: true,
            },
        )
        .then(result => {
            (retorno.status = true),
            (retorno.msg = 'Sucesso ao liberar atestado');
        })
        .finally(function() {
            db.close();
        })
        .catch(err => {
            console.log(`Erro ao liberar atestado: ${err}`);
            retorno.msg = `Erro ao liberar atestado atestado`;
        });
    return retorno;
}

async function buscarDiagnosticosAtendimento(nrAtendimento, nmUsuario) {
    let retorno = {
        status: false,
        msg: '',
        dados: [],
    };

    const db = await oracledb.getConnection();
    await db
        .execute(
            `SELECT a.* ,
                        substr(tasy.obter_desc_cid(CD_DOENCA),1,200) DS_CID_DOENCA,
                        substr(ds_diagnostico,1,255) DS_DIAGNOSTICO_RESTR,
                        substr(tasy.obter_nome_pf(cd_medico),1,60) NM_MEDICO,
                        substr(tasy.obter_obs_tipo_isolamento_cid(cd_doenca, 0, 1),1,255) DS_TIPO_ISOLAMENTO,
                        substr(tasy.obter_obs_tipo_isolamento_cid(cd_doenca, 0, 2),1,255) DS_OBS_TIPO_ISOLAMENTO,
                        substr(tasy.obter_desc_diag_interno(NR_SEQ_DIAG_INTERNO),1,255) DS_DIAG_INTERNO,
                        tasy.OBTER_DATA_ASSINATURA_DIGITAL(nr_seq_assinatura) DT_ASSINATURA,
                        tasy.OBTER_DATA_ASSINATURA_DIGITAL(NR_SEQ_ASSINAT_INATIVACAO) DT_ASSINATURA_INAT,
                        substr(tasy.obter_tipo_diag_classif(ie_tipo_diag_classif),1,150) DS_TIPO_DIAG_CLASSIF,
                        substr(tasy.Obter_medico_diagnostico(NR_ATENDIMENTO,DT_DIAGNOSTICO,'C'),1,10) CD_MEDICO_FUNC,
                        substr(tasy.Obter_tipo_diagnostico(nr_atendimento,dt_diagnostico),1,100) DS_TIPO_DIAGNOSTICO,
                        substr(tasy.obter_cod_tipo_diagnostico(nr_atendimento,dt_diagnostico),1,100) IE_TIPO_DIAGNOSTICO_FUNC,
                        substr(tasy.obter_pendencia_assinatura(tasy.wheb_usuario_pck.get_nm_usuario,nr_seq_interno,'DG'),1,1) IE_PENDENCIA_ASSINATURA,
                        to_char(a.DT_DIAGNOSTICO, 'dd/mm/yyyy hh24:mi:ss') dt_string
                    FROM	tasy.DIAGNOSTICO_DOENCA a
                    WHERE 1 = 1 
                    AND	nr_atendimento = :NR_ATENDIMENTO
                    and tasy.obter_liberacao_registro('S',:NM_USUARIO, dt_liberacao,nm_usuario) = 'S'
                    ORDER BY DT_DIAGNOSTICO desc`, {
                ':NR_ATENDIMENTO': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: nrAtendimento,
                },
                ':NM_USUARIO': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: nmUsuario,
                },
            }, {
                outFormat: oracledb.OBJECT,
            },
        )
        .then(result => {
            retorno.status = true;
            retorno.dados = result.rows;

            if (result.rows.length > 0) {
                retorno.msg = 'Sucesso ao obter diagnósticos do atendimento';
            } else {
                retorno.msg = 'Sem diagnósticos no atendimento';
            }
        })
        .finally(function() {
            db.close();
        })
        .catch(err => {
            console.log(`Erro ao obter diagnósticos: ${err}`);
            retorno.msg = `Erro ao obter diagnósticos`;
        });
    return retorno;
}

async function buscarDiagnosticosPaciente(cdPessoaFisica, nmUsuario) {
    let retorno = {
        status: false,
        msg: '',
        dados: [],
    };

    const db = await oracledb.getConnection();
    await db
        .execute(
            `SELECT a.cd_doenca,
                        substr(tasy.obter_desc_cid(c.CD_DOENCA_CID),1,200) ds_cid,
                        count(*) qt_registro,
                        max(trunc(a.dt_diagnostico)) dt_diagnostico,
                        max(substr(a.ds_diagnostico,1,255)) ds_observacao,
                        substr(tasy.obter_se_mudou_diag('713903',a.cd_doenca),1,1) ie_mudou,
                        substr(tasy.Obter_status_diag_doenca(x.cd_pessoa_fisica, a.cd_doenca,max(a.dt_atualizacao)),1,60) ds_status,
                        substr(tasy.Obter_cor_status_diag_doenca(x.cd_pessoa_fisica, a.cd_doenca,max(a.dt_atualizacao)),1,60) ds_cor,
                        substr(tasy.obter_tipo_isolamento_cid(a.cd_doenca,0,'TI'),1,240) ds_tipo_isolamento,
                        substr(tasy.obter_desc_diag_grupo(max(a.nr_seq_grupo_diag)),1,255) ds_grupo
                    FROM	tasy.diagnostico_medico b,
                    tasy.diagnostico_doenca a,
                    tasy.atendimento_paciente x,
                    tasy.CID_DOENCA c 
                    WHERE a.nr_atendimento = x.nr_atendimento 
                    AND	a.cd_doenca  = c.CD_DOENCA_CID  
                    AND	((a.dt_liberacao is not Null) OR (a.nm_usuario = :NM_USUARIO))  
                    AND	x.cd_pessoa_fisica = :CD_PESSOA_FISICA
                    AND	'S' = 'S'  
                    AND	a.nr_atendimento = b.nr_atendimento  
                    AND	a.dt_diagnostico = b.dt_diagnostico 
                    AND	a.dt_inativacao is null 
                    GROUP BY a.cd_doenca,
                        substr(tasy.obter_desc_cid(c.CD_DOENCA_CID),1,200),
                        x.cd_pessoa_fisica  

                    UNION ALL 
                    SELECT a.cd_doenca,
                        substr(tasy.obter_desc_cid(c.CD_DOENCA_CID),1,200) ds_cid,
                        1 qt_registro,
                        trunc(a.dt_diagnostico) dt_diagnostico,
                        substr(a.ds_diagnostico,1,255) ds_observacao,
                        substr(tasy.obter_se_mudou_diag(:CD_PESSOA_FISICA,a.cd_doenca),1,1) ie_mudou,
                        substr(tasy.obter_status_diag(x.cd_pessoa_fisica, a.cd_doenca),1,60) ds_status,
                        substr(tasy.Obter_cor_status_diag(x.cd_pessoa_fisica, a.cd_doenca),1,60) ds_cor,
                        substr(tasy.obter_tipo_isolamento_cid(a.cd_doenca,0,'TI'),1,240) ds_tipo_isolamento,
                        substr(tasy.obter_desc_diag_grupo(a.nr_seq_grupo_diag),1,255) ds_grupo 
                    FROM	tasy.diagnostico_medico b,
                        tasy.diagnostico_doenca a,
                        tasy.atendimento_paciente x,
                    tasy.CID_DOENCA c
                    WHERE a.nr_atendimento = x.nr_atendimento  
                    AND	x.cd_pessoa_fisica = :CD_PESSOA_FISICA  
                    AND	'N' = 'S'  
                    AND	a.cd_doenca  = c.CD_DOENCA_CID 
                    AND	a.nr_atendimento = b.nr_atendimento 
                    AND	((a.dt_liberacao is not Null) OR (a.nm_usuario = :NM_USUARIO)) 
                    AND	a.dt_diagnostico = b.dt_diagnostico 
                    AND	a.dt_inativacao is null
                    ORDER BY dt_diagnostico desc`, {
                ':CD_PESSOA_FISICA': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: cdPessoaFisica.toString(),
                },
                ':NM_USUARIO': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: nmUsuario,
                },
            }, {
                outFormat: oracledb.OBJECT,
            },
        )
        .then(result => {
            retorno.status = true;
            retorno.dados = result.rows;

            if (result.rows.length > 0) {
                retorno.msg = 'Sucesso ao obter diagnósticos do usuário';
            } else {
                retorno.msg = 'Sem diagnósticos do usuário';
            }
        })
        .finally(function() {
            db.close();
        })
        .catch(err => {
            console.log(`Erro ao obter diagnósticos: ${err}`);
            retorno.msg = `Erro ao obter diagnósticos`;
        });
    return retorno;
}

async function buscarOcorrenciasDiagnostico(cdPessoaFisica, cdDoenca) {
    let retorno = {
        status: false,
        msg: '',
        dados: [],
    };

    const db = await oracledb.getConnection();
    await db
        .execute(
            `SELECT a.*,
                        substr(tasy.obter_desc_cid(CD_DOENCA),1,200) DS_CID_DOENCA,
                        substr(tasy.obter_desc_diag_interno(NR_SEQ_DIAG_INTERNO),1,255) DS_DIAG_INTERNO,
                        substr(ds_diagnostico,1,255) DS_DIAGNOSTICO_RESTR,
                        substr(tasy.obter_nome_pf(cd_medico),1,60) NM_MEDICO,
                        substr(tasy.Obter_tipo_diagnostico(nr_atendimento,dt_diagnostico),1,100) DS_TIPO_DIAGNOSTICO,
                        tasy.OBTER_DATA_ASSINATURA_DIGITAL(nr_seq_assinatura) DT_ASSINATURA,
                        substr(tasy.obter_tipo_isolamento_cid(cd_doenca,0),1,240) DS_TIPO_ISOLAMENTO
                    FROM	tasy.DIAGNOSTICO_DOENCA a
                    WHERE 1 = 1 
                    AND	a.nr_atendimento in (
                    SELECT x.nr_atendimento
                    FROM	 tasy.atendimento_paciente x
                    WHERE x.cd_pessoa_fisica = :CD_PESSOA_FISICA)
                    and a.cd_doenca = :CD_DOENCA
                    ORDER BY DT_DIAGNOSTICO desc`, {
                ':CD_PESSOA_FISICA': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: cdPessoaFisica.toString(),
                },
                ':CD_DOENCA': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: cdDoenca,
                },
            }, {
                outFormat: oracledb.OBJECT,
            },
        )
        .then(result => {
            retorno.status = true;
            retorno.dados = result.rows;
            retorno.msg = 'Sucesso ao obter ocorrências';
        })
        .finally(function() {
            db.close();
        })
        .catch(err => {
            console.log(`Erro ao obter ocorrências: ${err}`);
            retorno.msg = `Erro ao obter ocorrências`;
        });
    return retorno;
}

async function listasParaDiagnostico(
    cd_estabelecimento,
    cd_perfil,
    cd_setor_atendimento,
    cd_especialidade,
) {
    var retorno = {
        status: false,
        msg: '',
        dados: {},
    };

    var retornoDiagnosticoDermatologia = await getDiagnosticoDermatologia(
        cd_estabelecimento,
        cd_perfil,
        cd_setor_atendimento,
        cd_especialidade,
    );

    if (retornoDiagnosticoDermatologia) {
        retorno.dados.diagnosticoDermatologia = retornoDiagnosticoDermatologia;

        var retornoDiagnosticoAmbulatorial = await getDiagnosticoAmbulatorial(
            cd_estabelecimento,
            cd_perfil,
            cd_setor_atendimento,
            cd_especialidade,
        );

        if (retornoDiagnosticoAmbulatorial) {
            retorno.dados.diagnosticoAmbulatorial =
                retornoDiagnosticoAmbulatorial;

            var retornoDiagnosticoSemGrupo = await getDiagnosticoSemGrupo(
                cd_estabelecimento,
                cd_perfil,
                cd_setor_atendimento,
                cd_especialidade,
            );

            if (retornoDiagnosticoSemGrupo) {
                retorno.dados.diagnosticoSemGrupo = retornoDiagnosticoSemGrupo;
            } else {
                retorno.msg =
                    'Erro ao obter listas para diagnóstico: retornoDiagnosticoSemGrupo';
            }
        } else {
            retorno.msg =
                'Erro ao obter listas para diagnóstico: retornoDiagnosticoAmbulatorial';
        }
    } else {
        retorno.msg =
            'Erro ao obter listas para diagnóstico: retornoDiagnosticoDermatologia';
    }
    return retorno;
}

async function pesquisarRemedio(descricaoItem){
    retorno = {
        status: false, 
        msg: '',
        dados: []
    }


    const itemPesquisa = `%${descricaoItem}%`

    const db = await oracledb.getConnection();
    await db.execute(`select
    DS_MATERIAL,
    CD_MATERIAL,
    CD_MEDICAMENTO,
    tasy.obter_estrutura_material(a.cd_material,'G') as cd_grupo_med
from tasy.material a
where 1 = 1
     and upper(ds_material) like upper(:DS_ITEM)
 and tasy.obter_estrutura_material(a.cd_material,'G') = '1'
 FETCH FIRST 5 ROWS ONLY`,
    { 
        ":DS_ITEM": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": itemPesquisa }        
    },
    { 
        outFormat: oracledb.OBJECT,
    })
    .then(result => {
        retorno.status = true,
        retorno.msg = 'Sucesso ao obter diagnósticos'
        retorno.dados = result.rows
        // console.log(retorno.dados)
    })
    .finally(function(){
        db.close()
    })
    .catch(err => { 
        console.log(`Erro ao obter diagnósticos: ${err}`)
        retorno.msg = `Erro ao obter diagnósticos`
    })
    return retorno
}


async function obterUnidadeMedida(){
    retorno = {
        status: false, 
        msg: '',
        dados: []
    }

    const db = await oracledb.getConnection();
    await db.execute(`select 
                        distinct(c.CD_UNIDADE_MEDIDA),
                        substr(fis_obter_unidade_medida(c.CD_UNIDADE_MEDIDA),1,200) ds_unidade_medida
                        from tasy.CPOE_MATERIAL c
                        order by ds_unidade_medida asc`,
    {},
    { 
        outFormat: oracledb.OBJECT,
    })
    .then(result => {
        retorno.status = true,
        retorno.msg = 'Sucesso ao obter diagnósticos'
        retorno.dados = result.rows
        // console.log(retorno.dados)
    })
    .finally(function(){
        db.close()
    })
    .catch(err => { 
        console.log(`Erro ao obter diagnósticos: ${err}`)
        retorno.msg = `Erro ao obter diagnósticos`
    })
    return retorno
}


async function obterIntervalo(){
    retorno = {
        status: false, 
        msg: '',
        dados: []
    }

    const db = await oracledb.getConnection();
    await db.execute(`select cd_intervalo, ds_intervalo from tasy.intervalo_prescricao`,
    {},
    { 
        outFormat: oracledb.OBJECT,
    })
    .then(result => {
        retorno.status = true,
        retorno.msg = 'Sucesso ao obter diagnósticos'
        retorno.dados = result.rows
        // console.log(retorno.dados)
    })
    .finally(function(){
        db.close()
    })
    .catch(err => { 
        console.log(`Erro ao obter diagnósticos: ${err}`)
        retorno.msg = `Erro ao obter diagnósticos`
    })
    return retorno
}


async function pesquisarDiagnostico(descricaoItem){
    retorno = {
        status: false,
        msg: '',
        dados: [],
    };

    const db = await oracledb.getConnection();
    await db
        .execute(
            `SELECT cd_doenca_cid,
                        ds_doenca_cid,
                        ds_informacao_adic ds_observacao
                    FROM	tasy.cid_doenca b
                    WHERE 'S' = 'S' 
                    AND	nvl(ie_situacao,'A') = 'A' 
                    AND	exists (SELECT 1   
                    FROM	tasy.cid_especialidade c,
                        tasy.cid_categoria d  
                    WHERE d.cd_categoria_cid = b.cd_categoria_cid   
                    AND	 d.cd_especialidade = c.cd_especialidade_cid(+)   
                    AND	 nvl(c.ie_situacao,'A') = 'A'    
                    AND	 nvl(d.ie_situacao,'A') = 'A') 
                    AND	(upper(cd_doenca_cid) like '%' || upper(:DESCRICAO_ITEM) || '%' or upper(b.ds_doenca_cid) like '%' || upper(:DESCRICAO_ITEM) || '%')
                    UNION
                    SELECT b.cd_doenca_cid,
                        b.ds_doenca_cid,
                        b.ds_informacao_adic ds_observacao
                    FROM	tasy.cid_doenca b,
                    tasy.diagnostico_doenca_filtro a
                    WHERE a.cd_doenca_cid  = b.cd_doenca_cid 
                    AND	nvl(ie_situacao,'A') = 'A' 
                    AND	exists (SELECT 1   
                    FROM	tasy.cid_especialidade c,
                        tasy.cid_categoria d  
                    WHERE d.cd_categoria_cid = b.cd_categoria_cid   
                    AND	 d.cd_especialidade = c.cd_especialidade_cid(+)   
                    AND	 nvl(c.ie_situacao,'A') = 'A'    
                    AND	 nvl(d.ie_situacao,'A') = 'A') 
                    AND	'S'  = 'N' 
                    AND	((a.ie_prioridade  = 1) OR (1 = 0)) 
                    AND	(upper(b.cd_doenca_cid) like '%' || upper(:DESCRICAO_ITEM) || '%' or upper(b.ds_doenca_cid) like '%' || upper(:DESCRICAO_ITEM) || '%')
                    ORDER BY ds_doenca_cid
                    FETCH FIRST 5 ROWS ONLY`, {
                ':DESCRICAO_ITEM': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: descricaoItem,
                },
            }, {
                outFormat: oracledb.OBJECT,
            },
        )
        .then(result => {
            (retorno.status = true),
            (retorno.msg = 'Sucesso ao obter diagnósticos');
            retorno.dados = result.rows;
        })
        .finally(function() {
            db.close();
        })
        .catch(err => {
            console.log(`Erro ao obter diagnósticos: ${err}`);
            retorno.msg = `Erro ao obter diagnósticos`;
        });
    return retorno;
}

async function getDiagnosticoDermatologia(
    cd_estabelecimento,
    cd_perfil,
    cd_setor_atendimento,
    cd_especialidade,
) {
    let retornoDiagnosticoDermatologia = null;

    const db = await oracledb.getConnection();
    await db
        .execute(
            `SELECT nr_sequencia,                       
                        ds_rotina,
                        nvl(ie_pede_data,'N') ie_pede_data,
                        nvl(ie_pede_lado,'N') ie_pede_lado,
                        nvl(ie_pede_obs,'N') ie_pede_obs,
                        nvl(ie_pede_classif_diag,'N') ie_pede_classif_diag,
                        nvl(a.ds_cor,'clNavy') ds_cor,
                        substr(nvl(tasy.obter_desc_grupo_cid_rot(nr_seq_grupo),tasy.Wheb_mensagem_pck.get_texto(333905)),1,255) ds_grupo,
                    cd_doenca,
                    nvl((SELECT x.nr_seq_apres
                    FROM	tasy.cid_rotina_grupo x
                    WHERE x.nr_sequencia = a.nr_seq_grupo),99999) nr_seq_apres_grupo
                    FROM	 tasy.cid_rotina a
                    WHERE  (a.cd_estabelecimento = :CD_ESTABELECIMENTO OR a.cd_estabelecimento is null)
                    and  ((a.cd_especialidade = :CD_ESPECIALIDADE) OR ((0 = 0)) 
                        AND	(a.cd_especialidade is null))
                    and ((a.cd_perfil = :CD_PERFIL) OR (a.cd_perfil is null))
                    and ((a.cd_setor_atendimento = :CD_SETOR_ATENDIMENTO) OR (a.cd_setor_atendimento is null))
                    and tasy.obter_se_CID_ativo(a.cd_doenca) = 'A'
                    and  tasy.obter_se_cid_rotina_lib(a.nr_sequencia,1,2339) = 'S'
                    and  tasy.obter_se_grupo_cid_lib(a.nr_seq_grupo,1,2339) = 'S'
                    and ( (8 is null 
                        AND	(nr_seq_grupo is null)) OR (nr_seq_grupo = 8))
                    ORDER BY nr_seq_apres_grupo desc,
                    ds_grupo,
                    a.nr_seq_apres,
                    a.ds_rotina`, {
                ':CD_ESTABELECIMENTO': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: cd_estabelecimento.toString(),
                },
                ':CD_PERFIL': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: cd_perfil.toString(),
                },
                ':CD_SETOR_ATENDIMENTO': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: cd_setor_atendimento.toString(),
                },
                ':CD_ESPECIALIDADE': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: cd_especialidade.toString(),
                },
            }, {
                outFormat: oracledb.OBJECT,
            },
        )
        .then(result => {
            retornoDiagnosticoDermatologia = result.rows;
        })
        .finally(function() {
            db.close();
        })
        .catch(err => {
            retornoDiagnosticoDermatologia = false;
        });
    return retornoDiagnosticoDermatologia;
}

async function getDiagnosticoAmbulatorial(
    cd_estabelecimento,
    cd_perfil,
    cd_setor_atendimento,
    cd_especialidade,
) {
    let retornoDiagnosticoAmbulatorial = null;

    const db = await oracledb.getConnection();
    await db
        .execute(
            `SELECT nr_sequencia,
                        ds_rotina,
                        nvl(ie_pede_data,'N') ie_pede_data,
                        nvl(ie_pede_lado,'N') ie_pede_lado,
                        nvl(ie_pede_obs,'N') ie_pede_obs,
                        nvl(ie_pede_classif_diag,'N') ie_pede_classif_diag,
                        nvl(a.ds_cor,'clNavy') ds_cor,
                        substr(nvl(tasy.obter_desc_grupo_cid_rot(nr_seq_grupo),tasy.Wheb_mensagem_pck.get_texto(333905)),1,255) ds_grupo,
                    cd_doenca,
                    nvl((SELECT x.nr_seq_apres
                    FROM	tasy.cid_rotina_grupo x
                    WHERE x.nr_sequencia = a.nr_seq_grupo),99999) nr_seq_apres_grupo
                    FROM	 tasy.cid_rotina a
                    WHERE  (a.cd_estabelecimento = :CD_ESTABELECIMENTO OR a.cd_estabelecimento is null)
                    and  ((a.cd_especialidade = :CD_ESPECIALIDADE) OR ((0 = 0)) 
                        AND	(a.cd_especialidade is null))
                    and ((a.cd_perfil = :CD_PERFIL) OR (a.cd_perfil is null))
                    and ((a.cd_setor_atendimento = :CD_SETOR_ATENDIMENTO) OR (a.cd_setor_atendimento is null))
                    and tasy.obter_se_CID_ativo(a.cd_doenca) = 'A'
                    and  tasy.obter_se_cid_rotina_lib(a.nr_sequencia,1,2339) = 'S'
                    and  tasy.obter_se_grupo_cid_lib(a.nr_seq_grupo,1,2339) = 'S'
                    and ( (2 is null 
                        AND	(nr_seq_grupo is null)) OR (nr_seq_grupo = 2))
                    ORDER BY nr_seq_apres_grupo desc,
                    ds_grupo,
                    a.nr_seq_apres,
                    a.ds_rotina`, {
                ':CD_ESTABELECIMENTO': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: cd_estabelecimento.toString(),
                },
                ':CD_PERFIL': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: cd_perfil.toString(),
                },
                ':CD_SETOR_ATENDIMENTO': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: cd_setor_atendimento.toString(),
                },
                ':CD_ESPECIALIDADE': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: cd_especialidade.toString(),
                },
            }, {
                outFormat: oracledb.OBJECT,
            },
        )
        .then(result => {
            retornoDiagnosticoAmbulatorial = result.rows;
        })
        .finally(function() {
            db.close();
        })
        .catch(err => {
            retornoDiagnosticoAmbulatorial = false;
        });
    return retornoDiagnosticoAmbulatorial;
}

async function getDiagnosticoSemGrupo(
    cd_estabelecimento,
    cd_perfil,
    cd_setor_atendimento,
    cd_especialidade,
) {
    let retornoDiagnosticoSemGrupo = null;

    const db = await oracledb.getConnection();
    await db
        .execute(
            `SELECT nr_sequencia,               
                        ds_rotina,
                        nvl(ie_pede_data,'N') ie_pede_data,
                        nvl(ie_pede_lado,'N') ie_pede_lado,
                        nvl(ie_pede_obs,'N') ie_pede_obs,
                        nvl(ie_pede_classif_diag,'N') ie_pede_classif_diag,
                        nvl(a.ds_cor,'clNavy') ds_cor,
                        substr(nvl(TASY.obter_desc_grupo_cid_rot(nr_seq_grupo),TASY.Wheb_mensagem_pck.get_texto(333905)),1,255) ds_grupo,
                    cd_doenca,
                    nvl((SELECT x.nr_seq_apres
                    FROM	TASY.cid_rotina_grupo x
                    WHERE x.nr_sequencia = a.nr_seq_grupo),99999) nr_seq_apres_grupo
                    FROM	 TASY.cid_rotina a
                    WHERE  (a.cd_estabelecimento = :CD_ESTABELECIMENTO OR a.cd_estabelecimento is null)
                    and  ((a.cd_especialidade = :CD_ESPECIALIDADE) OR ((0 = 0)) 
                        AND	(a.cd_especialidade is null))
                    and ((a.cd_perfil = :CD_PERFIL) OR (a.cd_perfil is null))
                    and ((a.cd_setor_atendimento = :CD_SETOR_ATENDIMENTO) OR (a.cd_setor_atendimento is null))
                    and TASY.obter_se_CID_ativo(a.cd_doenca) = 'A'
                    and  TASY.obter_se_cid_rotina_lib(a.nr_sequencia,1,2339) = 'S'
                    and  TASY.obter_se_grupo_cid_lib(a.nr_seq_grupo,1,2339) = 'S'
                    and ( (null is null 
                        AND	(nr_seq_grupo is null)) OR (nr_seq_grupo = null))
                    ORDER BY nr_seq_apres_grupo desc,
                    ds_grupo,
                    a.nr_seq_apres,
                    a.ds_rotinA`, {
                ':CD_ESTABELECIMENTO': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: cd_estabelecimento.toString(),
                },
                ':CD_PERFIL': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: cd_perfil.toString(),
                },
                ':CD_SETOR_ATENDIMENTO': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: cd_setor_atendimento.toString(),
                },
                ':CD_ESPECIALIDADE': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: cd_especialidade.toString(),
                },
            }, {
                outFormat: oracledb.OBJECT,
            },
        )
        .then(result => {
            retornoDiagnosticoSemGrupo = result.rows;
        })
        .finally(function() {
            db.close();
        })
        .catch(err => {
            retornoDiagnosticoSemGrupo = false;
        });
    return retornoDiagnosticoSemGrupo;
}

async function salvarDiagnostico(
    cdMedico,
    nmUsuario,
    nrAtendimento,
    nrSeqCid,
    ie_liberado,
) {
    var retorno = {
        status: false,
        msg: '',
    };

    var retornoGerarDiagnosticoMedico = await gerarDiagnosticoMedico(
        cdMedico,
        nmUsuario,
        nrAtendimento,
    );

    if (retornoGerarDiagnosticoMedico) {
        var retornoGerarDiagnosticoRotina = await gerarDiagnosticoRotina(
            nmUsuario,
            nrAtendimento,
            nrSeqCid,
            ie_liberado,
        );

        if (retornoGerarDiagnosticoRotina) {
            retorno.status = true;
            retorno.msg = 'Diagnóstico salvo com sucesso';
        } else {
            retorno.msg =
                'Erro ao salvar diagnóstico na tabela diagnostico_doenca';
        }
    } else {
        retorno.msg = 'Erro ao salvar diagnóstico na tabela diagnostico_medico';
    }

    return retorno;
}

async function gerarDiagnosticoMedico(
    cdMedico,
    nmUsuario,
    nrAtendimento,
    sdate,
) {
    let retorno = '';

    const db = await oracledb.getConnection();
    await db
        .execute(
            `  begin
                            tasy.GERAR_DIAGNOSTICO_MEDICO(
                            DT_DIAGNOSTICO_P => TO_DATE(:SDATE, 'YYYY/MM/DD HH24:MI:SS'),
                            CD_MEDICO_DIAG_P => :CD_MEDICO,
                            NM_USUARIO_P => :NM_USUARIO, 
                            NR_ATENDIMENTO_P => :NR_ATENDIMENTO);
                        end;`, {
                ':SDATE': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: sdate,
                },
                ':CD_MEDICO': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: cdMedico.toString(),
                },
                ':NM_USUARIO': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: nmUsuario.toString(),
                },
                ':NR_ATENDIMENTO': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: nrAtendimento.toString(),
                },
            }, {
                outFormat: oracledb.OBJECT,
            },
        )
        .then(result => {
            retorno = true;
        })
        .finally(function() {
            db.close();
        })
        .catch(err => {
            console.log(
                `Erro ao salvar diagnóstico na tabela diagnostico_medico: ${err}`,
            );
            retorno = false;
        });
    return retorno;
}

async function updateGerarDiagnosticoMedico(
    nrAtendimento,
    ieTipoDiagnostico,
    cdMedico,
    nmUsuario,
    sdate,
) {
    console.log('sadbahsdas', sdate);
    let retorno2 = '';

    let dbUp = await oracledb.getConnection();
    await dbUp
        .execute(
            `begin
                            tasy.ATUALIZAR_DADOS_DIAGNOSTICO(
                                nr_atendimento_p    =>  :nr_atendimento_bind,
                                dt_diagnostico_p    =>	TO_DATE(:SDATE, 'YYYY/MM/DD HH24:MI:SS'),
                                cd_medico_p =>	:cd_medico_p,
                                ie_tipo_diagnostico_p   =>	:ie_tipo_diagnostico_bind,
                                nm_usuario_p    =>	:nm_usuario_p
                                
                            );
                        end;`, {
                ':SDATE': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: sdate,
                },
                ':nm_usuario_p': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: nmUsuario.toString(),
                },
                ':cd_medico_p': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: cdMedico.toString(),
                },
                ':ie_tipo_diagnostico_bind': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: ieTipoDiagnostico.toString(),
                },
                ':nr_atendimento_bind': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: nrAtendimento.toString(),
                },
            }, {
                outFormat: oracledb.OBJECT,
                autoCommit: true,
            },
        )
        .then(result => {
            retorno2 = true;
        })
        .finally(function() {
            dbUp.close();
        })
        .catch(err => {
            console.log(`Erro ao mudar tipo diagnóstico: ${err}`);
            retorno2 = false;
        });
    return retorno2;
}

async function sysdateBanco() {
    let dbUp = await oracledb.getConnection();
    return await dbUp
        .execute(
            `select to_char(sysdate, 'YYYY-MM-DD HH24:MI:SS') as dt_atual_string from dual`, {}, {
                outFormat: oracledb.OBJECT,
            },
        )
        .then(result => {
            return result.rows[0].DT_ATUAL_STRING;
        })
        .finally(function() {
            dbUp.close();
        })
        .catch(err => {
            console.log(`Erro ao obter data: ${err}`);
        });
}

async function gerarDiagnosticoRotina(
    nmUsuario,
    nrAtendimento,
    nrSeqCid,
    ie_liberado,
) {
    let retorno = '';

    const db = await oracledb.getConnection();
    await db
        .execute(
            `declare
                        dt_max_diagnostico date;
                        begin
                            select max(dt_diagnostico) into dt_max_diagnostico from	tasy.diagnostico_medico where nr_atendimento = :NR_ATENDIMENTO ;
                            tasy.GERAR_DIAGNOSTICO_ROTINA(
                            NR_SEQ_ATEND_CONS_PEPA_P => '',
                            NR_SEQ_CID_P => :NR_SEQ_CID,
                            DT_DIAGNOSTICO_P => dt_max_diagnostico, 
                            IE_LIBERADO_P => :IE_LIBERADO,
                            IE_CLASSIF_DIAG_P => '',
                            NM_USUARIO_P => :NM_USUARIO,
                            NR_SEQ_MENTOR_P => :NR_SEQ_MENTOR,
                            DS_OBSERVACAO_P => '',
                            NR_SEQ_INTERNO_P => :NR_SEQ_INTERNO,
                            DT_FIM_P => '',
                            IE_LADO_P => '',  
                            NR_ATENDIMENTO_P => :NR_ATENDIMENTO);
                        end;`, {
                ':NM_USUARIO': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: nmUsuario.toString(),
                },
                ':NR_ATENDIMENTO': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.NUMBER,
                    val: nrAtendimento,
                },
                ':NR_SEQ_CID': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.NUMBER,
                    val: nrSeqCid,
                },
                ':IE_LIBERADO': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: ie_liberado.toString(),
                },
                ':NR_SEQ_MENTOR': {
                    dir: oracledb.BIND_OUT,
                    type: oracledb.NUMBER,
                },
                ':NR_SEQ_INTERNO': {
                    dir: oracledb.BIND_OUT,
                    type: oracledb.NUMBER,
                },
            }, {
                outFormat: oracledb.OBJECT,
            },
        )
        .then(result => {
            if (result.outBinds[':NR_SEQ_INTERNO']) {
                retorno = true;
            }
        })
        .finally(function() {
            db.close();
        })
        .catch(err => {
            console.log(
                `Erro ao salvar diagnóstico na tabela diagnostico_doenca: ${err}`,
            );
            retorno = false;
        });
    return retorno;
}

async function salvarDiagnostico2(
    cdMedico,
    nmUsuario,
    nrAtendimento,
    cdDoenca,
    ieTipoDiagnostico,
) {
    let retorno = {
        status: false,
        msg: '',
    };
    let sdate = await sysdateBanco();
    const diagnosticoMedico = await gerarDiagnosticoMedico(
        cdMedico,
        nmUsuario,
        nrAtendimento,
        sdate,
    );

    const db = await oracledb.getConnection();
    await db
        .execute(
            `INSERT INTO tasy.DIAGNOSTICO_DOENCA ( DT_MANIFESTACAO , IE_RN , IE_DIAG_ADMISSAO , IE_TIPO_DIAGNOSTICO , CD_DOENCA , IE_DIAG_PRE_CIR , IE_UNIDADE_TEMPO , NM_USUARIO , IE_CONVENIO , DT_DIAGNOSTICO , CD_MEDICO , CD_PERFIL_ATIVO , IE_DIAG_REFERENCIA , IE_DIAG_OBITO , NR_SEQ_CLASSIF_ADIC , IE_DIAG_PRINC_DEPART , IE_LADO , IE_DIAG_TRAT_CERT , IE_SITUACAO , IE_DIAG_PRINC_EPISODIO , IE_DIAG_CIRURGIA , DT_FIM , NR_RECEM_NATO , IE_CLASSIFICACAO_DOENCA , DT_CID , DT_INATIVACAO , NR_SEQ_INTERNO , IE_NIVEL_ATENCAO , IE_TIPO_DOENCA , IE_DIAG_TRATAMENTO , DT_LIBERACAO , DS_DIAGNOSTICO , QT_TEMPO , DT_ATUALIZACAO , IE_TIPO_ATENDIMENTO , DT_INICIO , NR_SEQ_ETIOLOGIA , NR_ATENDIMENTO , IE_DIAG_ALTA )
                        VALUES (null, 'N' , 'N' , 2 , :CD_DOENCA , 'N' , null , :NM_USUARIO , 'N' , sysdate , :CD_MEDICO , 2339 , 'N' , 'N' , null , 'N' , null , 'N' , 'A' , 'N' , 'N' , null , null , 'P' , null , null , tasy.DIAGNOSTICO_DOENCA_seq.nextval , 'T' , null , 'N' , null , null , null , sysdate , 1 , null , null , :NR_ATENDIMENTO , 'N')`, {
                ':CD_DOENCA': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: cdDoenca.toString(),
                },
                ':NM_USUARIO': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: nmUsuario,
                },
                ':CD_MEDICO': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: cdMedico.toString(),
                },
                ':NR_ATENDIMENTO': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: nrAtendimento.toString(),
                },
            }, {
                outFormat: oracledb.OBJECT,
                autoCommit: true,
            },
        )
        .then(result => {
            if (result.rowsAffected > 0) {
                retorno.status = true;
                retorno.msg = 'Sucesso ao inserir diagnóstico';
            }
        })
        .finally(function() {
            db.close();
        })
        .catch(err => {
            console.log(`Erro ao inserir diagnóstico: ${err}`);
            retorno.msg = `Erro ao inserir diagnóstico`;
        });

    if (diagnosticoMedico === true) {
        const updateDiagnosticoMedico = await updateGerarDiagnosticoMedico(
            nrAtendimento,
            ieTipoDiagnostico,
            cdMedico,
            nmUsuario,
            sdate,
        );
    }

    return retorno;
}

async function apagarDiagnostico(nrAtendimento, dtDiagnostico, cdDoenca) {
    let retorno = {
        status: false,
        msg: '',
    };

    const db = await oracledb.getConnection();
    await db
        .execute(
            `DELETE FROM tasy.DIAGNOSTICO_DOENCA
                        WHERE 1 = 1 
                            AND	NR_ATENDIMENTO = :NR_ATENDIMENTO 
                            AND	DT_DIAGNOSTICO = to_date(:DT_DIAGNOSTICO, 'dd/mm/yyyy hh24:mi:ss') 
                            AND	CD_DOENCA = :CD_DOENCA`, {
                ':NR_ATENDIMENTO': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: nrAtendimento.toString(),
                },
                ':DT_DIAGNOSTICO': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: dtDiagnostico.toString(),
                },
                ':CD_DOENCA': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: cdDoenca.toString(),
                },
            }, {
                outFormat: oracledb.OBJECT,
                autoCommit: true,
            },
        )
        .then(result => {
            if (result.rowsAffected > 0) {
                retorno.status = true;
                retorno.msg = `Sucesso ao apagar diagnóstico`;
            } else {
                retorno.msg = `Erro ao apagar diagnóstico`;
            }
        })
        .finally(function() {
            db.close();
        })
        .catch(err => {
            console.log(`Erro ao apagar diagóstico: ${err}`);
            retorno.msg = `Erro ao apagar diagóstico`;
        });
    return retorno;
}

async function getAtestadosPaciente(cdPessoaFisica, nrAtendimento) {
    retorno = {
        status: false,
        msg: '',
        dados: [],
    };

    const db = await oracledb.getConnection();
    await db
        .execute(
            `SELECT 
                a.nr_sequencia,
                a.nr_atendimento,
                to_char(a.dt_atestado) dt_atestado,
                a.nm_usuario,
                substr(tasy.obter_nome_pessoa_fisica(cd_medico, null),1,200) NM_MEDICO,
                a.cd_medico,
                substr(tasy.obter_descricao_padrao('TIPO_ATESTADO','DS_TITULO',NR_SEQ_TIPO_ATESTADO),1,100) DS_TIPO_ATESTADO,
                tasy.OBTER_DATA_ASSINATURA_DIGITAL(nr_seq_assinatura) DT_ASSINATURA,
                tasy.OBTER_DATA_ASSINATURA_DIGITAL(nr_seq_assinat_inativacao) DT_ASSINATURA_INATIVACAO,
                substr(tasy.comparar_data(dt_atestado,dt_atualizacao_nrec - (1/144),'2'),1,1) IE_REGISTRO_RETROATIVO,
                substr(tasy.obter_pendencia_assinatura(tasy.wheb_usuario_pck.get_nm_usuario,nr_sequencia,'AT'),1,1) IE_PENDENCIA_ASSINATURA,
                nvl(to_char(a.nr_seq_tipo_atestado), 'Não informado') tipo_atestado,
                nvl(to_char(a.qt_dias_atestado), 'Não informado') qtd_dias_atestado
            FROM tasy.ATESTADO_PACIENTE a
            WHERE 1 = 1 
            AND	cd_pessoa_fisica = :CD_PESSOA_FISICA
            and nr_atendimento = :nr_atendimento
            AND	tasy.obter_lib_registro_situacao('S',ie_situacao) = 'S'
            ORDER BY DT_ATESTADO desc`, {
                ':CD_PESSOA_FISICA': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: cdPessoaFisica.toString(),
                },
                ':nr_atendimento': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: nrAtendimento.toString(),
                },
            }, {
                outFormat: oracledb.OBJECT,
            },
        )
        .then(result => {
            retorno.status = true;
            retorno.msg = 'Sucesso ao obter atestados';
            retorno.dados = result.rows;
        })
        .finally(function() {
            db.close();
        })
        .catch(err => {
            console.log(`Erro ao obter atestados: ${err}`);
            retorno.msg = 'Erro ao obter atestados';
        });
    return retorno;
}

async function getArquivoAtestadoPaciente(nrSequencia) {
    retorno = {
        status: false,
        msg: '',
        dados: [],
    };

    const db = await oracledb.getConnection();
    await db
        .execute(
            `SELECT 
                a.ds_atestado
            FROM tasy.ATESTADO_PACIENTE a
            WHERE 1 = 1
            and a.nr_sequencia = :nr_sequencia`, {
                ':nr_sequencia': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: nrSequencia.toString(),
                },
            }, {
                outFormat: oracledb.OBJECT,
            },
        )
        .then(result => {
            retorno.status = true;
            retorno.msg = 'Sucesso ao arquivo do atestado';
            retorno.dados = result.rows[0];
        })
        .finally(function() {
            db.close();
        })
        .catch(err => {
            console.log(`Erro ao obter atestado: ${err}`);
            retorno.msg = 'Erro ao obter atestado';
        });
    return retorno;
}

async function liberarDiagnostico(nrAtendimento, dtDiagnostico) {
    let retorno = {
        status: false,
        msg: '',
    };

    const db = await oracledb.getConnection();
    await db
        .execute(
            `UPDATE tasy.diagnostico_doenca
                        SET dt_liberacao = sysdate
                        WHERE nr_atendimento = :NR_ATENDIMENTO 
                        AND dt_diagnostico = to_date(:DT_DIAGNOSTICO, 'DD/MM/YYYY HH24:MI:SS')`, {
                ':NR_ATENDIMENTO': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: nrAtendimento.toString(),
                },
                ':DT_DIAGNOSTICO': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: dtDiagnostico.toString(),
                },
            }, {
                outFormat: oracledb.OBJECT,
                autoCommit: true,
            },
        )
        .then(result => {
            if (result.rowsAffected > 0) {
                retorno.status = true;
                retorno.msg = `Sucesso ao liberar diagnóstico`;
            } else {
                retorno.msg = `Erro ao liberar diagóstico`;
            }
        })
        .finally(function() {
            db.close();
        })
        .catch(err => {
            console.log(`Erro ao liberar diagóstico: ${err}`);
            retorno.msg = `Erro ao liberar diagóstico`;
        });
    return retorno;
}

async function listarAnamnesePaciente(cdPessoaFisica, cdMedico) {
    var retorno = {
        status: false,
        dados: [],
    };

    const sql = `
	select * from (
    select
        'HTML' as ORIGEM,
        substr(Obter_desc_tipo_evolucao(a.ie_evolucao_clinica),1,200) IE_EVOLUCAO_ANAMNESE,
        substr(tasy.obter_valor_dominio(72, a.ie_tipo_evolucao),1,200) DS_TIPO_EVOLUCAO,
        substr(tasy.obter_nome_pessoa_fisica(a.cd_medico, null),1,200) NM_MEDICO,
        nvl(substr(tasy.obter_desc_espec_medica(a.CD_ESPECIALIDADE),1,50), 'Não registrado na evolução médica') DS_ESPECIALIDADE_PROF,
        --substr(tasy.obter_nome_setor(a.cd_setor_atendimento),1,40) DS_SETOR_ATENDIMENTO,
        a.cd_evolucao as CD_EVOLUCAO,
        a.IE_TIPO_EVOLUCAO as IE_TIPO_EVOLUCAO,
        a.DS_EVOLUCAO as DS_EVOLUCAO,
        a.dt_liberacao as DT_LIBERACAO,
        a.NR_ATENDIMENTO as NR_ATENDIMENTO,
        a.DT_EVOLUCAO as DT_EVOLUCAO,
        a.DT_ATUALIZACAO as DT_ATUALIZACAO
    from tasy.EVOLUCAO_PACIENTE a
    where 1 = 1
    and a.cd_pessoa_fisica =:cd_pessoa_fisica
    and a.ie_evolucao_clinica = 'EA'
    and ie_tipo_evolucao = 1
    and (a.dt_liberacao is not null or cd_medico = :cd_medico)
    and a.nr_atendimento is not null
    and a.dt_evolucao >= trunc(sysdate) - 730

union all

    select
        'JAVA' as ORIGEM,
        'Anamnese Ambulatorial' as IE_EVOLUCAO_ANAMNESE,
        substr(tasy.obter_valor_dominio(72, ap.ie_tipo_evolucao),1,200) DS_TIPO_EVOLUCAO,
        substr(tasy.obter_nome_pessoa_fisica(ap.cd_medico, null),1,200) NM_MEDICO,
        nvl(substr(tasy.obter_desc_espec_medica(ap.CD_ESPECIALIDADE_MEDICO),1,50), 'Não registrado na evolução médica') DS_ESPECIALIDADE_PROF,
        ap.nr_sequencia as CD_EVULUCAO,
        ap.IE_TIPO_EVOLUCAO as IE_TIPO_EVOLUCAO,
        ap.DS_ANAMNESE as DS_EVOLUCAO,
        ap.dt_liberacao as DT_LIBERACAO,
        ap.NR_ATENDIMENTO as NR_ATENDIMENTO,
        ap.DT_ANANMESE as DT_EVOLUCAO,
        ap.DT_ATUALIZACAO as DT_ATUALIZACAO
    from tasy.ANAMNESE_PACIENTE ap
    where 1 = 1
    --and ap.ie_tipo_evolucao = 1
    and ap.cd_pessoa_fisica = :cd_pessoa_fisica
    and (ap.dt_liberacao is not null or cd_medico = :cd_medico)
    and ap.ie_situacao = 'A'
    and ap.dt_ananmese >= trunc(sysdate) - 730
)
order by DT_ATUALIZACAO desc
    `;

    const db = await oracledb.getConnection();
    await db
        .execute(
            sql, {
                ':cd_pessoa_fisica': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: cdPessoaFisica.toString(),
                },
                ':cd_medico': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: cdMedico.toString(),
                },
            }, {
                outFormat: oracledb.OBJECT,
            },
        )
        .then(result => {
            retorno.status = true;
            if (result.rows.length > 0) {
                retorno.dados = result.rows;
            }
        })
        .finally(function() {
            db.close();
        })
        .catch(err => {
            console.log(`Erro obter anamnese do paciente: ${err}`);
        });
    return retorno;
}

async function listarEvolucaoPaciente(cdPessoaFisica, nmUsuario, cdMedico) {
    let retorno = {
        status: false,
        dados: [],
    };

    const db = await oracledb.getConnection();
    await db
        .execute(
            `SELECT a.*,
                        substr(tasy.obter_nome_pessoa_fisica(cd_medico, null),1,200) NM_MEDICO,
                        substr(tasy.obter_valor_dominio(72, ie_tipo_evolucao),1,200) DS_TIPO_EVOLUCAO,
                        substr(tasy.Obter_desc_tipo_evolucao(ie_evolucao_clinica),1,200) DS_SUBTIPO_EVOLUCAO,
                        substr(tasy.obter_informacao_gravidade(NR_SEQ_EVOL_GRAV,'D'),1,255) DS_INF_GRAVIDADE,
                        substr(tasy.obter_desc_curta_setor(CD_SETOR_ATENDIMENTO),1,7) DS_SETOR_CURTO,
                        substr(tasy.obter_desc_espec_medica(CD_ESPECIALIDADE),1,50) DS_ESPECIALIDADE,
                        substr(tasy.obter_nome_pessoa_fisica(cd_medico_parecer, null),1,200) NM_MEDICO_PARECER,
                        substr(DECODE(tasy.Obter_Dados_Usuario_Opcao(nm_usuario_nrec,'C'),NVL(cd_medico,tasy.Obter_Dados_Atendimento(nr_atendimento,'MR')),null,tasy.obter_nome_usuario(nm_usuario_nrec)),1,200) NM_MEDICO_AUX,
                        substr(tasy.obter_nome_setor(cd_setor_atendimento),1,40) DS_SETOR_ATENDIMENTO,
                        (SELECT max(tasy.obter_classif_medico(a.nr_seq_classif_medico))
                        FROM	tasy.evolucao_paciente_compl a
                        WHERE a.nr_seq_evo_paciente = cd_evolucao) DS_ATUACAO_MEDICO, tasy.OBTER_DATA_ASSINATURA_DIGITAL(nr_seq_assinatura) DT_ASSINATURA, tasy.OBTER_DATA_ASSINATURA_DIGITAL(NR_SEQ_ASSINAT_INATIVACAO) DT_ASSINATURA_INAT, substr(tasy.obter_desc_espec_medica(CD_ESPECIALIDADE_MEDICO),1,50) DS_ESPECIALIDADE_PROF, substr(tasy.Obter_Classif_Agenda_Atend(nr_atendimento),1,200) DS_CLASSIF_AGENDA, substr(tasy.obter_nome_tipo_atend(tasy.obter_tipo_atendimento(nr_atendimento)),1,30) DS_TIPO_ATEND, substr(tasy.obter_dados_pf(CD_MEDICO,'COPR'),1,40) DS_CRM_PROF, substr(tasy.Obter_Prof_Agenda_Atend(nr_atendimento),1,200) DS_PROF_AGEND, substr(tasy.comparar_data(dt_evolucao,dt_atualizacao_nrec - (1/144),'2'),1,1) IE_REGISTRO_RETROATIVO, substr(tasy.Obter_se_Inativa_Tipo_Evol(IE_EVOLUCAO_CLINICA),1,1) IE_REGRA_INATIVAR, substr(tasy.obter_clinica_atendimento(nr_atendimento),1,100) DS_CLINICA_ATEND, substr(tasy.obter_pendencia_assinatura(tasy.wheb_usuario_pck.get_nm_usuario,CD_EVOLUCAO,'EV'),1,1) IE_PENDENCIA_ASSINATURA, substr(tasy.obter_cor_tipo_evolucao(IE_EVOLUCAO_CLINICA),1,15) DS_COR_TIPO_EVOLUCAO, substr(tasy.obter_cor_fonte_tipo_evol(IE_EVOLUCAO_CLINICA),1,15) DS_COR_FONTE_TIPO_EVOL
                        FROM	(SELECT PAGING.*,
                        ROWNUM PAGING_RN
                        FROM	(SELECT /*+ first_rows(100) */ NR_ATENDIMENTO ,
                        IE_EVOLUCAO_DOR ,
                        IE_SITUACAO ,
                        IE_RECEM_NATO ,
                        DS_EVOLUCAO,
                        NR_RECEM_NATO ,
                        CD_EVOLUCAO ,
                        DT_EVOLUCAO ,
                        NM_USUARIO ,
                        DT_LIBERACAO ,
                        CD_MEDICO ,
                        CD_ESPECIALIDADE_MEDICO ,
                        IE_EVOLUCAO_CLINICA ,
                        CD_ESPECIALIDADE ,
                        CD_MEDICO_PARECER ,
                        IE_AVALIADOR_AUX ,
                        DT_LIBERACAO_AUX ,
                        NR_SEQ_EVOL_GRAV ,
                        DS_IMPRESSAO ,
                        DS_LISTA_PROBLEMAS ,
                        IE_RESTRICAO_VISUALIZACAO ,
                        CD_UNIDADE ,
                        DT_INATIVACAO ,
                        NM_USUARIO_INATIVACAO ,
                        DS_JUSTIFICATIVA ,
                        NM_USUARIO_NREC ,
                        IE_RELEV_RESUMO_ALTA ,
                        DS_UTC ,
                        DS_UTC_ATUALIZACAO ,
                        IE_TIPO_EVOLUCAO ,
                        CD_PESSOA_FISICA ,
                        DT_ATUALIZACAO ,
                        DT_ATUALIZACAO_NREC ,
                        QT_PESO ,
                        QT_ALTURA ,
                        QT_SUPERF_CORPORIA ,
                        IE_PERIODO ,
                        CD_TOPOGRAFIA ,
                        CD_TUMOR_PRIM_PAT ,
                        CD_LINFONODO_REG_PAT ,
                        CD_METASTASE_DIST_PAT ,
                        CD_ESTADIO_OUTRO ,
                        CD_SETOR_ATENDIMENTO ,
                        NR_CIRURGIA ,
                        NR_SEQ_ASSINATURA ,
                        QT_CARACTERES ,
                        NR_SEQ_ASSINAT_INATIVACAO ,
                        NR_SEQ_AVALIACAO ,
                        IE_HORARIO_VERAO ,
                        NR_ATEND_ALTA ,
                        NR_SEQ_PEPO ,
                        CD_DOENCA
                        FROM	tasy.EVOLUCAO_PACIENTE a
                        WHERE 1 = 1 
                        AND	cd_pessoa_fisica = :CD_PESSOA_FISICA
                        AND	tasy.consiste_se_consulta_evolucao(ie_evolucao_clinica,:CD_MEDICO,2339) = 'S' 
                        AND	ie_tipo_evolucao <> '9' 
                        AND	((dt_liberacao is not null) OR (nm_usuario = :NM_USUARIO) OR (tasy.obter_se_vis_evol_nao_lib(2339, ie_evolucao_clinica) = 'S') OR (dt_liberacao_aux is not null 
                        AND	cd_medico = :CD_MEDICO)) 
                        AND	tasy.pep_obter_se_visualiza(ie_restricao_visualizacao,nm_usuario, :NM_USUARIO) = 'S'
                        ORDER BY CD_PESSOA_FISICA desc ,
                        DT_EVOLUCAO desc ) PAGING
                        WHERE (ROWNUM <= 100)) a
                        WHERE (PAGING_RN > 0)`, {
                ':CD_MEDICO': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: cdMedico.toString(),
                },
                ':CD_PESSOA_FISICA': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: cdPessoaFisica.toString(),
                },
                ':NM_USUARIO': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: nmUsuario,
                },
            }, {
                outFormat: oracledb.OBJECT,
            },
        )
        .then(result => {
            retorno.status = true;
            if (result.rows.length > 0) {
                retorno.dados = result.rows;
            }
        })
        .finally(function() {
            db.close();
        })
        .catch(err => {
            console.log(`Erro obter evolução do paciente: ${err}`);
        });
    return retorno;
}

async function salvarAnamnese(
    NR_ATENDIMENTO,
    IE_TIPO_EVOLUCAO,
    CD_PESSOA_FISICA,
    NM_USUARIO,
    DS_EVOLUCAO_P,
    CD_MEDICO,
    E_EVOLUCAO_CLINICA_P,
    CD_ESPECIALIDADE,
) {
    retorno = {
        status: false,
        msg: '',
    };

    const db = await oracledb.getConnection();
    await db
        .execute(
            `begin samel.inserir_evolucao_paciente_prontuario(
                        cd_especialidade_p => :CD_ESPECIALIDADE,
                        nr_atendimento_p => :NR_ATENDIMENTO,
                        ie_tipo_evolucao_p => :IE_TIPO_EVOLUCAO,
                        cd_pessoa_fisica_p => :CD_PESSOA_FISICA,
                        nm_usuario_p => :NM_USUARIO,
                        ds_evolucao_p => :DS_EVOLUCAO_P,
                        cd_medico_p => :CD_MEDICO,
                        ie_evolucao_clinica_p => :E_EVOLUCAO_CLINICA_P
                        );
                        end;`, {
                ':NR_ATENDIMENTO': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: NR_ATENDIMENTO,
                },
                ':IE_TIPO_EVOLUCAO': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: IE_TIPO_EVOLUCAO,
                },
                ':CD_PESSOA_FISICA': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: CD_PESSOA_FISICA,
                },
                ':NM_USUARIO': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: NM_USUARIO,
                },
                ':DS_EVOLUCAO_P': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: DS_EVOLUCAO_P,
                },
                ':CD_MEDICO': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: CD_MEDICO,
                },
                ':E_EVOLUCAO_CLINICA_P': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: E_EVOLUCAO_CLINICA_P,
                },
                ':CD_ESPECIALIDADE': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.NUMBER,
                    val: parseInt(CD_ESPECIALIDADE),
                },
            }, {
                outFormat: oracledb.OBJECT,
                autoCommit: true,
            },
        )
        .then(result => {
            retorno.status = true;
            retorno.msg = 'Sucesso ao inserir anamnese';
        })
        .finally(function() {
            db.close();
        })
        .catch(err => {
            console.log(`Erro ao inserir anamnese: ${err}`);
            retorno.msg = `Erro ao inserir anamnese`;
        });
    return retorno;
}

async function liberarAnamnese(nrSeqAnamnese) {
    let retorno = {
        status: false,
        msg: '',
    };

    const db = await oracledb.getConnection();
    await db
        .execute(
            `update tasy.EVOLUCAO_PACIENTE
                        set	dt_liberacao = sysdate
                        where 1 = 1
                        and cd_evolucao = :NR_SEQ_ANAMNESE
                        and	dt_liberacao is null`, {
                ':NR_SEQ_ANAMNESE': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.NUMBER,
                    val: nrSeqAnamnese,
                },
            }, {
                outFormat: oracledb.OBJECT,
                autoCommit: true,
            },
        )
        .then(result => {
            retorno.status = true;
            retorno.msg = 'Anamnese liberada com sucesso';
        })
        .finally(function() {
            db.close();
        })
        .catch(err => {
            console.log(`Erro ao liberar anamnese: ${err}`);
            retorno = false;
        });
    return retorno;
}

async function editarAnamneseHtml(dsAnamnese, nrSeqAnamnese) {
    console.log(dsAnamnese);
    let retorno = {
        status: false,
        msg: '',
    };

    const db = await oracledb.getConnection();
    await db
        .execute(
            `UPDATE tasy.EVOLUCAO_PACIENTE 
                        set DS_EVOLUCAO = :DS_ANAMNESE 
                        where 1 = 1
                        and CD_EVOLUCAO = :NR_SEQUENCIA`, {
                ':NR_SEQUENCIA': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.NUMBER,
                    val: nrSeqAnamnese,
                },
                ':DS_ANAMNESE': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: dsAnamnese,
                },
            }, {
                outFormat: oracledb.OBJECT,
                autoCommit: true,
            },
        )
        .then(result => {
            if (result.rowsAffected > 0) {
                (retorno.status = true),
                (retorno.msg = 'Sucesso ao alterar anamnese');
            } else {
                retorno.msg = 'Erro ao alterar anamnese';
            }
        })
        .finally(function() {
            db.close();
        })
        .catch(err => {
            console.log(`Erro ao alterar anamnese: ${err}`);
            retorno.msg = `Erro ao alterar anamnese`;
        });
    return retorno;
}

async function editarAnamneseJava(dsAnamnese, nrSeqAnamnese) {
    console.log(dsAnamnese);
    let retorno = {
        status: false,
        msg: '',
    };

    const db = await oracledb.getConnection();
    await db
        .execute(
            `UPDATE tasy.ANAMNESE_PACIENTE 
                        set DS_ANAMNESE = :DS_ANAMNESE 
                        where 1 = 1
                        and nr_sequencia = :NR_SEQUENCIA`, {
                ':NR_SEQUENCIA': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.NUMBER,
                    val: nrSeqAnamnese,
                },
                ':DS_ANAMNESE': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: dsAnamnese,
                },
            }, {
                outFormat: oracledb.OBJECT,
                autoCommit: true,
            },
        )
        .then(result => {
            if (result.rowsAffected > 0) {
                (retorno.status = true),
                (retorno.msg = 'Sucesso ao alterar anamnese');
            } else {
                retorno.msg = 'Erro ao alterar anamnese';
            }
        })
        .finally(function() {
            db.close();
        })
        .catch(err => {
            console.log(`Erro ao alterar anamnese: ${err}`);
            retorno.msg = `Erro ao alterar anamnese`;
        });
    return retorno;
}

async function excluirAnamneseHtml(nrSeqAnamnese) {
    let retorno = {
        status: false,
        msg: '',
    };

    const db = await oracledb.getConnection();
    await db
        .execute(
            `DELETE
                        FROM	TASY.EVOLUCAO_PACIENTE
                        WHERE 1 = 1
                            AND	CD_EVOLUCAO = :NR_SEQUENCIA`, {
                ':NR_SEQUENCIA': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.NUMBER,
                    val: nrSeqAnamnese,
                },
            }, {
                outFormat: oracledb.OBJECT,
                autoCommit: true,
            },
        )
        .then(result => {
            if (result.rowsAffected > 0) {
                (retorno.status = true),
                (retorno.msg = 'Sucesso ao apagar anamnese');
            } else {
                retorno.msg = 'Erro ao apagar anamnese';
            }
        })
        .finally(function() {
            db.close();
        })
        .catch(err => {
            console.log(`Erro ao apagar anamnese: ${err}`);
            retorno.msg = `Erro ao apagar anamnese`;
        });
    return retorno;
}

async function excluirAnamneseJava(nrSeqAnamnese) {
    let retorno = {
        status: false,
        msg: '',
    };

    const db = await oracledb.getConnection();
    await db
        .execute(
            `DELETE
                        FROM	TASY.ANAMNESE_PACIENTE
                        WHERE 1 = 1
                            AND	nr_sequencia = :NR_SEQUENCIA`, {
                ':NR_SEQUENCIA': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.NUMBER,
                    val: nrSeqAnamnese,
                },
            }, {
                outFormat: oracledb.OBJECT,
                autoCommit: true,
            },
        )
        .then(result => {
            if (result.rowsAffected > 0) {
                (retorno.status = true),
                (retorno.msg = 'Sucesso ao apagar anamnese');
            } else {
                retorno.msg = 'Erro ao apagar anamnese';
            }
        })
        .finally(function() {
            db.close();
        })
        .catch(err => {
            console.log(`Erro ao apagar anamnese: ${err}`);
            retorno.msg = `Erro ao apagar anamnese`;
        });
    return retorno;
}

async function buscarReceitasPaciente(cdPessoaFisica, nmUsuario) {
    let retorno = {
        status: false,
        msg: '',
        dados: [],
    };

    const db = await oracledb.getConnection();
    await db
        .execute(
            `SELECT a.*, substr(tasy.obter_nome_pf(CD_MEDICO),1,60) NM_MEDICO
                        FROM	tasy.MED_RECEITA a
                        WHERE 1 = 1 
                            AND	cd_pessoa_fisica = :CD_PESSOA_FISICA 
                            AND	((nr_atendimento_hosp is not null) OR nr_seq_cliente is null) 
                            AND	(tasy.obter_lib_registro_situacao('S',ie_situacao) = 'S') 
                            AND	(tasy.obter_liberacao_registro('S',:NM_USUARIO,dt_liberacao,nm_usuario) = 'S') 
                            AND	((ie_restricao_visualizacao = 'T') OR (ie_restricao_visualizacao is null) OR (ie_restricao_visualizacao = 'U' 
                            AND	nm_usuario = :NM_USUARIO))
                        ORDER BY DT_RECEITA desc`, {
                ':CD_PESSOA_FISICA': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: cdPessoaFisica,
                },
                ':NM_USUARIO': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: nmUsuario,
                },
            }, {
                outFormat: oracledb.OBJECT,
            },
        )
        .then(result => {
            retorno.status = true;
            retorno.msg = 'Sucesso ao obter receitas';
            retorno.dados = result.rows;
        })
        .finally(function() {
            db.close();
        })
        .catch(err => {
            console.log(`Erro ao obter receitas: ${err}`);
            retorno.status = false;
            retorno.msg = `Erro ao obter receitas: ${err}`;
        });
    return retorno;
}

async function buscarHistoryReceitasPaciente(cdPessoaFisica, nrAtendimento) {
    let retorno = {
        status: false,
        msg: '',
        dados: [],
    };

    const db = await oracledb.getConnection();
    await db
        .execute(
            `SELECT 
                a.nr_atendimento_hosp, 
                substr(tasy.obter_nome_pf(CD_MEDICO),1,60) NM_MEDICO,
                a.nr_sequencia,
                a.dt_receita,
                a.ds_receita,
                a.cd_medico,
                a.nm_usuario,
                b.nr_crm
            from tasy.MED_RECEITA a
            join tasy.medico b on a.CD_MEDICO = b.cd_pessoa_fisica
            where 1 = 1 
                AND	a.cd_pessoa_fisica = :cd_pessoa_fisica
                AND	((a.nr_atendimento_hosp is not null) OR a.nr_seq_cliente is null) 
                AND	(tasy.obter_lib_registro_situacao('S',a.ie_situacao) = 'S')
                AND a.nr_atendimento_hosp = :nr_atendimento
            ORDER BY a.DT_RECEITA desc`, {
                ':cd_pessoa_fisica': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: cdPessoaFisica,
                },
                ':nr_atendimento': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: nrAtendimento,
                },
            }, {
                outFormat: oracledb.OBJECT,
            },
        )
        .then(result => {
            retorno.status = true;
            retorno.msg = 'Sucesso ao obter receitas';
            retorno.dados = result.rows;
        })
        .finally(function() {
            db.close();
        })
        .catch(err => {
            console.log(`Erro ao obter receitas: ${err}`);
            retorno.status = false;
            retorno.msg = `Erro ao obter receitas: ${err}`;
        });
    return retorno;
}

async function listaMedicamentosReceita(cdMedico) {
    let retorno = {
        status: false,
        msg: '',
        dados: [],
    };

    const tiposMedicamentos = await tiposMedicamentosMedico(cdMedico);

    const lista = await Promise.all(
        tiposMedicamentos.map(async item => {
            if (item.TIPO == 'instituicao') {
                item.MEDICAMENTOS = await listaMedicamentosInstituicao(
                    item.NR_SEQUENCIA,
                );
                return item;
            } else {
                item.MEDICAMENTOS = await listaMedicamentosUsuario(
                    cdMedico,
                    item.NR_SEQUENCIA,
                );
                return item;
            }
        }),
    );

    const instituicao = lista.filter(result => result.TIPO == 'instituicao');
    const usuario = lista.filter(result => result.TIPO == 'usuario');

    const listasMedicamentos = {
        instituicao,
        usuario,
    };

    if (instituicao && usuario) {
        retorno.status = true;
        retorno.msg = 'Sucesso ao obter lista de medicamentos para receita';
        retorno.dados = listasMedicamentos;
    } else {
        retorno.msg = 'Erro ao obter lista de medicamentos para receita';
    }

    return retorno;
}

async function buscarMedicamentosReceita(cdMedico, descricaoItem) {
    let retorno = {
        status: false,
        msg: '',
        dados: [],
    };

    const itemPesquisa = `%${descricaoItem}%`;

    const db = await oracledb.getConnection();
    await db
        .execute(
            `SELECT nr_sequencia,
                        NVL(ds_material_selecao,ds_material) ds_material
                    FROM	 tasy.med_medic_padrao
                    WHERE 1 = 1
                        AND	(upper(DS_MATERIAL) like upper(:DS_ITEM) or nr_sequencia like :DS_ITEM )
                        AND	(((NVL('A','U') = 'U' 
                        AND	cd_medico = :CD_MEDICO) OR
                    (NVL('A','I') = 'I' 
                        AND	((cd_estabelecimento = 1 
                        AND	cd_medico IS NULL) OR
                            (cd_estabelecimento IS NULL 
                        AND	cd_medico IS NULL)))) OR
                        ((NVL('A','A') = 'A' 
                        AND	cd_medico = :CD_MEDICO) OR
                    (NVL('A','A') = 'A' 
                        AND	((cd_estabelecimento = 1 
                        AND	cd_medico IS NULL) OR
                            (cd_estabelecimento IS NULL 
                        AND	cd_medico IS NULL)))))        
                        AND	((NVL('A','I')  IN ('I','A') 
                        AND	tasy.obter_se_mostra_medic_espec(nr_sequencia, tasy.obter_especialidade_medico(:CD_MEDICO, 'C')) = 'S') OR (NVL('A','U')  = 'U'))
                        AND	((NVL('A','I')  IN ('I','A') 
                        AND	tasy.obter_se_mostra_medic_perfil(nr_sequencia, 2339) = 'S') OR (NVL('A','U')  = 'U'))
                        AND	ie_situacao  = 'A'
                    ORDER BY ds_material
                    FETCH FIRST 5 ROWS ONLY`, {
                ':CD_MEDICO': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: cdMedico,
                },
                ':DS_ITEM': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: itemPesquisa,
                },
            }, {
                outFormat: oracledb.OBJECT,
            },
        )
        .then(result => {
            retorno.status = true;
            retorno.dados = result.rows;

            if (result.rows.length > 0) {
                retorno.msg = 'Sucesso ao obter medicamentos para receita';
            } else {
                retorno.msg = 'Sem medicamentos com essa descricao';
            }
        })
        .finally(function() {
            db.close();
        })
        .catch(err => {
            console.log(`Erro ao obter receitas: ${err}`);
            retorno = false;
        });
    return retorno;
}

async function tiposMedicamentosMedico(cdMedico) {
    let retorno = '';

    const db = await oracledb.getConnection();
    await db
        .execute(
            `SELECT nr_sequencia,
                    'instituicao' as tipo,
                    ds_grupo_medic,
                    cd_medico,
                    dt_atualizacao,
                    nm_usuario,
                    ie_situacao,
                    44 nr_seq_imagem, 
                    null comercial_selecionado,
                    null generico_selecionado,
                    258 ie_formato_estab, 
                    'I' ie_medicamento,  
                    2339 cd_perfil,
                    null ie_tipo_receita,
                    1 cd_estabelecimento
                    FROM	  tasy.med_grupo_medic
                    WHERE  (('I' = 'U' 
                        AND	cd_medico = :CD_MEDICO) or
                    ('I' = 'I' 
                        AND	((cd_estabelecimento = 1 
                        
                        AND	cd_medico is null) or
                            (cd_estabelecimento is null   
                        AND	cd_medico is null))))
                    and ie_situacao = 'A'
                    --ORDER BY ds_grupo_medic
                    union
                    SELECT nr_sequencia,
                        'usuario' as tipo,
                    ds_grupo_medic,
                    cd_medico,
                    dt_atualizacao,
                    nm_usuario,
                    ie_situacao,
                    44 nr_seq_imagem, 
                    null comercial_selecionado,
                    null generico_selecionado,
                    258 ie_formato_estab, 
                    'U' ie_medicamento,  
                    2339 cd_perfil,
                    null ie_tipo_receita,
                    1 cd_estabelecimento
                    FROM	  tasy.med_grupo_medic
                    WHERE  (('U' = 'U' 
                        AND	cd_medico = :CD_MEDICO) or
                    ('U' = 'I' 
                        AND	((cd_estabelecimento = 1             
                        AND	cd_medico is null) or
                            (cd_estabelecimento is null   
                        AND	cd_medico is null))))
                    and ie_situacao = 'A'
                    ORDER BY ds_grupo_medic`, {
                ':CD_MEDICO': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: cdMedico,
                },
            }, {
                outFormat: oracledb.OBJECT,
            },
        )
        .then(result => {
            retorno = result.rows;
        })
        .finally(function() {
            db.close();
        })
        .catch(err => {
            console.log(`Erro ao obter receitas: ${err}`);
            retorno = false;
        });
    return retorno;
}

async function listaMedicamentosInstituicao(nrSequencia) {
    let retorno = '';

    const db = await oracledb.getConnection();
    await db
        .execute(
            `SELECT nr_sequencia, 
                        ds_material,
                        cd_medico,
                        dt_atualizacao,
                        nm_usuario,
                        ds_posologia,
                        ie_tipo_receita,
                        nr_seq_grupo_medic,
                        ds_generico,
                        ds_observacao,
                        ds_laboratorio,
                        nvl(ds_material_selecao,ds_material) ds_material_apresentacao,
                        41 nr_seq_imagem,
                        null generico_selecionado,
                        258 ie_formato_estab
                        FROM	  tasy.med_medic_padrao
                        WHERE  nr_seq_grupo_medic = :NR_SEQUENCIA
                        and  (('I' = 'U' 
                            AND	cd_medico = null) or
                            ('I' = 'I' 
                            AND	((cd_estabelecimento = 1   
                            AND	cd_medico is null) OR (cd_estabelecimento is null 
                            AND	cd_medico is null))))
                        and (('I'  = 'I' 
                            AND	tasy.obter_se_mostra_medic_espec(nr_sequencia, tasy.obter_especialidade_medico(null, 'C')) = 'S') OR ('I'  = 'U'))
                        and  (('I'  = 'I' 
                            AND	tasy.obter_se_mostra_medic_perfil(nr_sequencia, 2339) = 'S') OR ('I'  = 'U'))
                        and ie_situacao  = 'A'
                        ORDER BY ds_material_apresentacao`, {
                ':NR_SEQUENCIA': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.NUMBER,
                    val: nrSequencia,
                },
            }, {
                outFormat: oracledb.OBJECT,
            },
        )
        .then(result => {
            retorno = result.rows;
        })
        .finally(function() {
            db.close();
        })
        .catch(err => {
            console.log(`Erro ao obter medicamentos instituicao: ${err}`);
            retorno = false;
        });
    return retorno;
}

async function listaMedicamentosUsuario(cdMedico, nrSequencia) {
    let retorno = '';

    const db = await oracledb.getConnection();
    await db
        .execute(
            `SELECT nr_sequencia,
                        ds_material,
                        cd_medico,
                        dt_atualizacao,
                        nm_usuario,
                        ds_posologia,
                        ie_tipo_receita,
                        nr_seq_grupo_medic,
                        ds_generico,
                        ds_observacao,
                        ds_laboratorio,
                    nvl(ds_material_selecao,ds_material) ds_material_apresentacao,
                    41 nr_seq_imagem,
                    null generico_selecionado,
                    258 ie_formato_estab
                    FROM	  tasy.med_medic_padrao
                    WHERE  nr_seq_grupo_medic = :NR_SEQUENCIA
                    and  (('U' = 'U' 
                        AND	cd_medico = :CD_MEDICO) or
                        ('U' = 'I' 
                        AND	((cd_estabelecimento = 1 
                    
                        AND	cd_medico is null) OR (cd_estabelecimento is null 
                        AND	cd_medico is null))))
                    and (('U'  = 'I' 
                        AND	tasy.obter_se_mostra_medic_espec(nr_sequencia, tasy.obter_especialidade_medico(:CD_MEDICO, 'C')) = 'S') OR ('U'  = 'U'))
                    and  (('U'  = 'I' 
                        AND	tasy.obter_se_mostra_medic_perfil(nr_sequencia, 2339) = 'S') OR ('U'  = 'U'))
                    and ie_situacao  = 'A'
                    ORDER BY ds_material_apresentacao`, {
                ':CD_MEDICO': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: cdMedico.toString(),
                },
                ':NR_SEQUENCIA': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.NUMBER,
                    val: nrSequencia,
                },
            }, {
                outFormat: oracledb.OBJECT,
            },
        )
        .then(result => {
            retorno = result.rows;
        })
        .finally(function() {
            db.close();
        })
        .catch(err => {
            console.log(`Erro ao obter medicamentos usuario: ${err}`);
            retorno = false;
        });
    return retorno;
}

async function salvarReceita(
    IE_RESTRICAO_VISUALIZACAO,
    IE_RN,
    IE_TIPO_RECEITA,
    IE_NIVEL_ATENCAO,
    NM_USUARIO_NREC,
    NM_USUARIO,
    DS_RECEITA,
    CD_MEDICO,
    CD_PERFIL_ATIVO,
    DT_LIBERACAO,
    IE_SITUACAO,
    NR_ATENDIMENTO_HOSP,
    CD_PESSOA_FISICA,
) {
    let retorno = {
        status: false,
        msg: '',
    };

    DT_LIBERACAO = DT_LIBERACAO == 'N' ? null : DT_LIBERACAO;

    const db = await oracledb.getConnection();
    await db
        .execute(
            `INSERT INTO tasy.MED_RECEITA (
                        IE_RESTRICAO_VISUALIZACAO,
                        IE_RN , 
                        IE_TIPO_RECEITA,
                        IE_NIVEL_ATENCAO,
                        NM_USUARIO_NREC,
                        DT_ATUALIZACAO_NREC,
                        NM_USUARIO,
                        DS_RECEITA,
                        CD_MEDICO,
                        CD_PERFIL_ATIVO,
                        DT_LIBERACAO,
                        NR_SEQUENCIA,
                        DT_RECEITA,
                        DT_ATUALIZACAO,
                        IE_SITUACAO,
                        NR_ATENDIMENTO_HOSP,
                        CD_PESSOA_FISICA,
                        NR_RECEM_NATO )
                    VALUES ( 
                        :IE_RESTRICAO_VISUALIZACAO,
                        :IE_RN,
                        :IE_TIPO_RECEITA,
                        :IE_NIVEL_ATENCAO,
                        :NM_USUARIO_NREC,
                        sysdate, 
                        :NM_USUARIO,
                        :DS_RECEITA,
                        :CD_MEDICO,
                        :CD_PERFIL_ATIVO,
                        to_date(:DT_LIBERACAO, 'DD/MM/YYYY HH24:MI:SS'),
                        tasy.MED_RECEITA_seq.nextval,
                        sysdate,
                        sysdate,
                        :IE_SITUACAO,
                        :NR_ATENDIMENTO_HOSP,
                        :CD_PESSOA_FISICA,
                        null)`, {
                ':IE_RESTRICAO_VISUALIZACAO': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: IE_RESTRICAO_VISUALIZACAO.toString(),
                },
                ':IE_RN': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: IE_RN.toString(),
                },
                ':IE_TIPO_RECEITA': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: IE_TIPO_RECEITA.toString(),
                },
                ':IE_NIVEL_ATENCAO': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: IE_NIVEL_ATENCAO.toString(),
                },
                ':NM_USUARIO_NREC': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: NM_USUARIO_NREC.toString(),
                },
                ':NM_USUARIO': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: NM_USUARIO.toString(),
                },
                ':DS_RECEITA': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: DS_RECEITA,
                },
                ':CD_MEDICO': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: CD_MEDICO,
                },
                ':CD_PERFIL_ATIVO': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.NUMBER,
                    val: CD_PERFIL_ATIVO,
                },
                ':DT_LIBERACAO': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: DT_LIBERACAO,
                },
                ':IE_SITUACAO': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: IE_SITUACAO,
                },
                ':NR_ATENDIMENTO_HOSP': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: NR_ATENDIMENTO_HOSP.toString(),
                },
                ':CD_PESSOA_FISICA': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: CD_PESSOA_FISICA,
                },
            }, {
                outFormat: oracledb.OBJECT,
                autoCommit: true,
            },
        )
        .then(result => {
            if (result.rowsAffected > 0) {
                retorno.status = true;
                retorno.msg = 'Sucesso ao inserir receita';
            }
        })
        .finally(function() {
            db.close();
        })
        .catch(err => {
            console.log(`Erro ao inserir receita: ${err}`);
            retorno.msg = 'Erro ao inserir receita';
        });
    return retorno;
}

async function salvarReceitaNovo( CD_DOENCA, CD_MATERIAL, CD_MEDICO, D_PESSOA_FISICA, DOSAGEM, DS_MATERIAL, INTERVALO, NM_USUARIO, NR_ATENDIMENTO, TEMPO_TRATAMENTO, UNIDADE_MEDIDA, VIA_ADM ){

    let retorno = {
        cd_doenca: "",
        cd_material: "",
        status: false,
        msg: '',
    }

    const db = await oracledb.getConnection();
    await db.execute(`insert into samel.prontuario_receita
                            (
                            NR_SEQUENCIA, CD_DOENCA, CD_MEDICO, CD_PESSOA_FISICA, 
                            NM_USUARIO, NR_ATENDIMENTO, QTD_DOSAGEM, DS_INTERVALO, 
                            QTD_TEMPO_TRATAMENTO, QTD_UNIDADE_MEDIDA, DS_VIA_ADMINISTRACAO, 
                            CD_MATERIAL, DS_MATERIAL
                            ) VALUES
                            (
                            samel.prontuario_receita_seq.nextval, :cd_doenca, :cd_medico, :cd_pessoa_fisica, 
                            :nm_usuario, :nr_atendimento, :qtd_dosagem, :ds_intervalo, :qtd_tempo_tratamento, 
                            :QTD_UNIDADE_MEDIDA, :ds_via_administracao, :cd_material, :ds_material
                            )`,
    {
        ":cd_doenca":               { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": CD_DOENCA.toString() },
        ":cd_medico":               { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": CD_MATERIAL.toString() },
        ":cd_pessoa_fisica":        { "dir": oracledb.BIND_IN, "type": oracledb.STRING, 'val': D_PESSOA_FISICA.toString()},
        ":qtd_dosagem":             { "dir": oracledb.BIND_IN, "type": oracledb.NUMBER, "val": parseInt(DOSAGEM) },//parseInt(DOSAGEM)},//float
        ":ds_intervalo":            { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": INTERVALO.toString()},
        ":nm_usuario":              { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": NM_USUARIO.toString()},
        ":nr_atendimento":          { "dir": oracledb.BIND_IN, "type": oracledb.NUMBER, "val": Number(NR_ATENDIMENTO) },
        ":qtd_tempo_tratamento":    { "dir": oracledb.BIND_IN, "type": oracledb.NUMBER, "val": parseInt(TEMPO_TRATAMENTO) },// parseInt(TEMPO_TRATAMENTO) },
        ":QTD_UNIDADE_MEDIDA":      { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": UNIDADE_MEDIDA.toString() }, //parseInt(UNIDADE_MEDIDA) },
        ":ds_via_administracao":    { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": VIA_ADM.toString()},
        ":cd_material":             { "dir": oracledb.BIND_IN, "type": oracledb.NUMBER, "val": parseInt(CD_MATERIAL)},//"val":2 }, // CD_MATERIAL },
        ":ds_material":             { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": DS_MATERIAL.toString()},
    }
    ,
    { 
        outFormat: oracledb.OBJECT,
        autoCommit: true
    })
    .then(result => {
        if(result.rowsAffected > 0){
            retorno.cd_doenca = CD_DOENCA,
            retorno.cd_material = CD_MATERIAL,
            retorno.status = true
            retorno.msg = 'Sucesso ao inserir receita'
        }       
    })
    .finally(function(){
        db.close()
    })
    .catch(err => { 
        console.log(`Erro ao inserir receita: ${err}`)
        retorno.cd_doenca = CD_DOENCA,
        retorno.cd_material = CD_MATERIAL,
        retorno.msg = 'Erro ao inserir receita'
    })
    return retorno
}

async function pesquisarExame(dsItem){
    retorno = {
        status: false,
        msg: '',
    };

    const db = await oracledb.getConnection();
    await db
        .execute(
            `SELECT  nr_seq_exame,
                        nr_seq_exame NR_EXAME,
                        nm_exame,
                        nr_seq_apresent,
                        nr_seq_proc_interno,
                        ie_solicitacao,
                        IE_SITUACAO,
                        ie_origem_proced,
                        cd_procedimento,
                        SUBSTR(tasy.OBTER_DESC_GRUPO_EXAME_LAB(nr_Seq_grupo),1,90) ds_grupo
                    FROM	 tasy.exame_laboratorio
                    WHERE (ie_solicitacao = 'S' OR 'S' = 'N')
                        AND	upper(NM_EXAME) like '%' || upper(:DS_ITEM) || '%'
                        AND	(cd_estabelecimento = 1 OR cd_estabelecimento IS NULL)
                        AND	(NVL(IE_SITUACAO,'I') = 'A' OR 'A' = 'I')
                        and ie_origem_proced = 8
                    ORDER BY nm_exame
                    FETCH FIRST 5 ROWS ONLY`, {
                ':DS_ITEM': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: dsItem,
                },
            }, {
                outFormat: oracledb.OBJECT,
                autoCommit: true,
            },
        )
        .then(result => {
            (retorno.status = true),
            (retorno.msg = 'Sucesso ao pesquisar item receita');
            retorno.dados = result.rows;
        })
        .finally(function() {
            db.close();
        })
        .catch(err => {
            console.log(`Erro ao pesquisar item receita: ${err}`);
            retorno.msg = `Erro ao pesquisar item receita`;
        });
    return retorno;
}

async function obterMaterialExame(nrSeqExame) {
    retorno = {
        status: false,
        msg: '',
    };

    const db = await oracledb.getConnection();
    await db
        .execute(
            `SELECT b.cd_material_exame cd,
                        b.ds_material_exame ds,
                        b.nr_sequencia
                    FROM tasy.material_exame_lab b,
                    tasy.exame_lab_material a
                    WHERE a.nr_seq_material = b.nr_sequencia
                    and a.ie_situacao = 'A' 
                    AND	a.nr_seq_exame = :NR_SEQ_EXAME
                    ORDER BY a.ie_prioridade,
                        b.ds_material_exame`, {
                ':NR_SEQ_EXAME': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: nrSeqExame,
                },
            }, {
                outFormat: oracledb.OBJECT,
                autoCommit: true,
            },
        )
        .then(result => {
            (retorno.status = true),
            (retorno.msg = 'Sucesso ao obter material');
            retorno.dados = result.rows;
        })
        .finally(function() {
            db.close();
        })
        .catch(err => {
            console.log(`Erro ao obter material: ${err}`);
            retorno.msg = `Erro ao obter material`;
        });
    return retorno;
}

async function salvarItemEspecifico(
    nmUsuario,
    nrSeqPedido,
    qtExame,
    ieOrigemProced,
    nrSeqExameLab,
    cdMaterialExame,
    cdProcedimento,
    nrProcInterno,
) {

    let retorno = {
        status: false,
        msg: '',
    };
    let bind = {};

    if (nrSeqExameLab) {// Se for lab
        sql = `INSERT INTO tasy.PEDIDO_EXAME_EXTERNO_ITEM ( DS_JUSTIFICATIVA , CD_MATERIAL_EXAME , NR_SEQ_TOPOGRAFIA , IE_URGENTE , NM_USUARIO_NREC , QT_EXAME , NR_SEQ_PEDIDO , DT_ATUALIZACAO_NREC , NM_USUARIO , IE_ORIGEM_PROCED , NR_SEQ_GRUPO_EXAME , CD_CGC , NR_SEQ_EXAME_LAB , NR_PROC_INTERNO , CD_PROCEDIMENTO , NR_SEQUENCIA , NR_SEQ_APRESENT , DT_EXECUCAO , DT_ATUALIZACAO , IE_LADO , DS_EXAME_SEM_CAD , NR_DOC_CONVENIO )
        VALUES ( null , :CD_MATERIAL_EXAME , null , 'N' , :NM_USUARIO , :QT_EXAME , :NR_SEQ_PEDIDO , sysdate , :NM_USUARIO , :IE_ORIGEM_PROCED , null , null , :NR_SEQ_EXAME_LAB , null , :CD_PROCEDIMENTO , tasy.PEDIDO_EXAME_EXTERNO_ITEM_seq.nextval , 1, null , sysdate , null , null , null)`;

        bind = {
            ':NM_USUARIO': {
                dir: oracledb.BIND_IN,
                type: oracledb.STRING,
                val: nmUsuario,
            },
            ':NR_SEQ_PEDIDO': {
                dir: oracledb.BIND_IN,
                type: oracledb.NUMBER,
                val: nrSeqPedido,
            },
            ':QT_EXAME': {
                dir: oracledb.BIND_IN,
                type: oracledb.STRING,
                val: qtExame.toString(),
            },
            ':IE_ORIGEM_PROCED': {
                dir: oracledb.BIND_IN,
                type: oracledb.NUMBER,
                val: ieOrigemProced,
            },
            ':NR_SEQ_EXAME_LAB': {
                dir: oracledb.BIND_IN,
                type: oracledb.STRING,
                val: nrSeqExameLab.toString(),
            },
            ':CD_PROCEDIMENTO': {
                dir: oracledb.BIND_IN,
                type: oracledb.NUMBER,
                val: cdProcedimento,
            },
            ':CD_MATERIAL_EXAME': {
                dir: oracledb.BIND_IN,
                type: oracledb.STRING,
                val: cdMaterialExame,
            },
        };
    } else {
        sql = `INSERT INTO tasy.PEDIDO_EXAME_EXTERNO_ITEM ( DS_JUSTIFICATIVA , CD_MATERIAL_EXAME , NR_SEQ_TOPOGRAFIA , IE_URGENTE , NM_USUARIO_NREC , QT_EXAME , NR_SEQ_PEDIDO , DT_ATUALIZACAO_NREC , NM_USUARIO , IE_ORIGEM_PROCED , NR_SEQ_GRUPO_EXAME , CD_CGC , NR_SEQ_EXAME_LAB , NR_PROC_INTERNO , CD_PROCEDIMENTO , NR_SEQUENCIA , NR_SEQ_APRESENT , DT_EXECUCAO , DT_ATUALIZACAO , IE_LADO , DS_EXAME_SEM_CAD , NR_DOC_CONVENIO )
        VALUES ( null , null , null , 'N' , :NM_USUARIO , :QT_EXAME , :NR_SEQ_PEDIDO , sysdate , :NM_USUARIO , :IE_ORIGEM_PROCED , null , null , null , :NR_PROC_INTERNO , :CD_PROCEDIMENTO , tasy.PEDIDO_EXAME_EXTERNO_ITEM_seq.nextval , 100 , null , sysdate , null , null , null)`;

        bind = {
            ':NM_USUARIO': {
                dir: oracledb.BIND_IN,
                type: oracledb.STRING,
                val: nmUsuario.toString(),
            },
            ':NR_SEQ_PEDIDO': {
                dir: oracledb.BIND_IN,
                type: oracledb.NUMBER,
                val: parseInt(nrSeqPedido),
            },
            ':QT_EXAME': {
                dir: oracledb.BIND_IN,
                type: oracledb.NUMBER,
                val: Number(qtExame),
            },
            ':IE_ORIGEM_PROCED': {
                dir: oracledb.BIND_IN,
                type: oracledb.NUMBER,
                val: parseInt(ieOrigemProced),
            },
            ':CD_PROCEDIMENTO': {
                dir: oracledb.BIND_IN,
                type: oracledb.NUMBER,
                val: parseInt(cdProcedimento),
            },
            ':NR_PROC_INTERNO': {
                dir: oracledb.BIND_IN,
                type: oracledb.STRING,
                val: nrProcInterno.toString(),
            },
        };
    }

    const db = await oracledb.getConnection();
    await db
        .execute(sql, bind, {
            outFormat: oracledb.OBJECT,
            autoCommit: true,
        })
        .then(result => {
            if (result.rowsAffected > 0) {
                (retorno.status = true),
                (retorno.msg = 'Sucesso ao salvar item especifico');
            }
        })
        .finally(function() {
            db.close();
        })
        .catch(err => {
            console.log(`Erro ao salvar item especifico: ${err}`);
            retorno.msg = `Erro ao salvar item especifico`;
        });
    return retorno;
}

async function excluirItemEspecifico(nrSeqItem, nrSeqSolicitacao) {
    let retorno = {};
    retorno = await deleteItemEspecificoSolicitacao(
        nrSeqItem,
        nrSeqSolicitacao,
    );
    if (!retorno.status) {
        retorno.status = false;
        retorno.msg = retorno.msg;
    }

    return retorno;
}

async function deleteItemEspecificoSolicitacao(item, pedido) {
    let retorno = {
        status: false,
        msg: '',
        itemFalho: [],
    };

    const db = await oracledb.getConnection();
    await db
        .execute(
            `DELETE
    FROM TASY.PEDIDO_EXAME_EXTERNO_ITEM
    WHERE 1 = 1
        AND	NR_SEQUENCIA = :NR_SEQUENCIA
        AND NR_SEQ_PEDIDO = :NR_SEQ_PEDIDO`, {
                ':NR_SEQUENCIA': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: item.toString(),
                },
                ':NR_SEQ_PEDIDO': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: pedido.toString(),
                },
            }, {
                outFormat: oracledb.OBJECT,
                autoCommit: true,
            },
        )
        .then(result => {
            if (result.rowsAffected == 0) {
                (retorno.status = false),
                (retorno.msg = `Item não foi deletado, verifique se os parametros foram passados corretamente ou item já foi deletado`);
                return;
            }
            (retorno.status = true),
            (retorno.msg = 'Sucesso ao deletar item da solicitação');
        })
        .finally(function() {
            db.close();
        })
        .catch(err => {
            console.log(`Erro ao deletar item da solicitação: ${err}`);
            retorno.msg = `Erro ao deletar item da solicitação`;
        });
    return retorno;
}

async function obterDadosGuiaInternacao(nrAtendimento) {
    let retorno = {
        status: false,
        msg: '',
    };

    const db = await oracledb.getConnection();
    await db
        .execute(
            `select
                        --> Dados Paciente
                        a.nr_atendimento                            AS NR_ATENDIMENTO,
                        nvl(w.cd_autorizacao, b.cd_autorizacao)     AS CD_AUTORIACAO,
                        nvl(w.cd_senha, b.cd_senha)                 AS CD_SENHA,
                        P.nm_pessoa_fisica                          AS NM_PESSOA_FISICA,
                        a.cd_pessoa_fisica                          AS CD_PESSOA_FISICA,
                        e.cd_usuario_plano                          AS CARTEIRINHA,
                        nvl(to_char(e.dt_validade_carteira, 'DD/MM/YYYY'),
                            to_char(y.dt_validade_carteira, 'DD/MM/YYYY'))
                                                                    AS DT_VALIDADE_CARTEIRA,
                        P.nr_cartao_nac_sus                         AS CARTAO_SUS,
                        case
                            when tasy.obter_dados_pf(a.cd_pessoa_fisica, 'I') < 1 then 'S'
                                                                                else 'N'
                        END                                         AS ATENDIMENTO_RN,

                        --> Dados Médico
                        b.cd_medico_solicitante                     AS CD_MEDICO_SOLICITANTE,
                        f.nm_guerra                                 AS NM_MEDICO,
                        f.nr_crm                                    AS NR_CRM,
                        g.nr_seq_conselho                           AS NR_SEQ_CONSELHO,

                        --> Descricoes
                        c.ds_solicitacao                            AS DS_SOLICITACAO,
                        c.ds_dados_clinicos                         AS DS_DADOS_CLINICOS,
                        c.ds_cid                                    AS DS_CID,
                        c.ds_justificativa                          AS DS_JUSTIFICATIVA,
                        b.ds_cbo_tiss                               AS DS_CBO_TISS,
                        r.ds_indicacao                              AS DS_INCICACAO_CLINICA,

                        --> Dados Guia
                        b.ie_tipo_guia                              AS EI_TIPO_GUIA,
                        b.nr_prescricao                             AS NR_PRESCRICAO,
                        b.cd_tipo_acomodacao                        AS CD_TIPO_ACOMODACAO,
                        b.cd_procedimento_principal                 AS CD_PROCEDIMENTO_PRINCIPAL,
                        b.cd_tipo_acomodacao                        AS CD_TIPO_ACOMODACAO,
                        b.nr_seq_autor_cirurgia                     AS NR_SEQ_AUTOR_CIRURGIA,
                        b.cd_cgc_prestador                          AS CD_CGC_PRESTADOR,
                        b.cd_setor_origem                           AS CD_SETOR_ORIGEM,
                        b.cd_estabelecimento                        AS CD_ESTABELECIMENTO,
                        b.dt_validade_guia                          AS DT_VALIDADE_GUIA,
                        c.cd_doenca                                 AS CD_DOENCA,
                        c.dt_solicitacao                            AS DT_SOLICITACAO,
                        c.dt_atualizacao                            AS DT_ATUALIZACAO_PEDIDO_EXAME_EXTERNO,
                        b.dt_atualizacao                            AS DT_ATUALIZACAO_AUT_CONV,
                        w.nr_guia_prestador                         AS NR_GUIA_PRESTADOR,
                        w.nr_sequencia                              AS NR_SEQ_GUIA,
                        r.cd_cid                                    AS CID_10_PRINCIPAL,
                        z.cd_cid_2                                  AS CID_2,
                        z.cd_cid_3                                  AS CID_3,
                        z.cd_cid_4                                  AS CID_4,
                        r.ie_tipo_acidente                          AS INDICACAO_ACIDENTE,
                        q.cd_cbo_saude                              AS CD_CBO,
                        q.uf_crm                                    AS UF_CRM,
                        case
                            when r.ie_carater_solic = 'E' then '1'
                            when r.ie_carater_solic = 'U' then '2'
                            else 'Não encontrado'
                        end                                         AS CARATER_ATENDIMENTO,
                        r.ie_tipo_internacao                        AS TIPO_INTERNACAO,
                        r.ie_regime_internacao                      AS REGIME_INTERNACAO,
                        r.qt_dia_solicitado                         AS QTD_DIARIAS_SOLICITADAS,
                        nvl(r.ie_previsao_uso_opme,'N')             AS PREVISAO_USO_OPME,
                        nvl(r.ie_previsao_uso_quimio,'N')           AS PREVISAO_USO_QUIMIO,

                        --> Convenio
                        b.cd_convenio                               AS CD_CONVENIO,
                        h.ds_convenio                               AS DS_CONVENIO,
                        b.dt_inicio_vigencia                        AS DT_INICIO_VIGENCIA,
                        b.dt_fim_vigencia                           AS DT_FIM_VIGENCIA,

                        --> Dados Procedimentos
                        t.cd_procedimento                           AS CD_PROCEDIMENTO,
                        t.ds_procedimento                           AS DS_PROCEDIMENTO,
                        t.qt_solicitada                             AS QT_SOLICITADA,
                        t.qt_autorizada                             AS QT_AUTORIZADA,
                        t.cd_edicao_amb                             AS NR_TABELA_34,

                        --> Dados Solicitante/Contratado
                        nvl(q.cd_interno, q.cd_cgc)                 AS CD_CGC_SOLICITANTE_CONTRATADO,
                        q.nm_contratado                             AS NM_SOLICITANTE_CONTRATADO,
                        q.dt_sugerida_int                           AS DT_SUGERIDA_INTERNACAO,

                        --> Dados Solicitado/Contratado
                        nvl(q.cd_interno_internacao,
                            q.cd_cgc_internacao)                    AS CD_CGC_SOLICITADO_CONTRATADO,
                        q.nm_contratado_internacao                  AS NM_SOLICITADO_CONTRATADO,

                        --> Dados da Autorização
                        x.cd_cnes                                   AS CD_CNES_CONTRATADO,
                        x.dt_admissao                               AS DT_PROVAVEL_ADMISSAO_HOSPITALAR,
                        x.qt_dia_autorizado                         AS QTDE_DIARIAS_AUTORIZADAS,
                        x.ds_tipo_acomodacao                        AS TIPO_ACOMODACAO_AUTORIZADA,
                        nvl(x.cd_interno, x.cd_cgc)                 AS CD_OPERADORA_CNPJ_AUTORIZADO,
                        x.nm_contratado                             AS NM_HOSPITAL_LOCAL_AUTORIZADO,

                        --> Outros
                        (select cd_ans from tasy.pls_outorgante)    AS REGISTRO_ANS,
                        z.ie_regime_internacao                      AS IE_REGIME_INTERNACAO,

                        --> Dumb
                        sysdate as DATA_ATUAL

                    from tasy.atendimento_paciente          a
                    join tasy.pessoa_fisica                 P on a.cd_pessoa_fisica = P.cd_pessoa_fisica
                    left join tasy.autorizacao_convenio     b on a.nr_atendimento = b.nr_atendimento
                    left join tasy.PEDIDO_EXAME_EXTERNO     c on b.NR_ATENDIMENTO = c.NR_ATENDIMENTO
                    left join tasy.w_tiss_guia              w on a.nr_atendimento = w.nr_atendimento
                    left join tasy.w_tiss_autorizacao       x on w.nr_sequencia = x.nr_seq_guia
                    left join tasy.w_tiss_beneficiario      y on w.nr_sequencia = y.nr_seq_guia
                    left join tasy.w_tiss_internacao        z on w.nr_sequencia = z.nr_seq_guia
                    left join tasy.w_tiss_proc_solic        t on w.nr_sequencia = t.nr_seq_guia
                    left join tasy.w_tiss_contratado_solic  q on w.nr_sequencia = q.nr_seq_guia
                    left join tasy.w_tiss_solicitacao       r on w.nr_sequencia = r.nr_seq_guia
                    left join tasy.pls_segurado             d on a.cd_pessoa_fisica = d.cd_pessoa_fisica
                    left join tasy.pls_segurado_carteira    e on d.nr_sequencia = e.nr_seq_segurado
                    left join tasy.medico                   f on b.cd_medico_solicitante = f.cd_pessoa_fisica
                    left join tasy.pessoa_fisica            g on f.cd_pessoa_fisica = g.cd_pessoa_fisica
                    left join tasy.convenio                 h on b.cd_convenio = h.cd_convenio
                    left join tasy.pls_prestador            i on b.cd_cgc_prestador = i.cd_cgc

                    where 1 = 1
                    and a.nr_atendimento = :NR_ATENDIMENTO
                    order by w.dt_atualizacao desc
                    fetch first 1 rows only`, {
                ':NR_ATENDIMENTO': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: nrAtendimento.toString(),
                },
            }, {
                outFormat: oracledb.OBJECT,
                autoCommit: true,
            },
        )
        .then(result => {
            (retorno.status = true),
            (retorno.msg = 'Sucesso ao obter guia de internação');
            retorno.dados = result.rows;
        })
        .finally(function() {
            db.close();
        })
        .catch(err => {
            retorno.msg = `Erro ao obter guia de internação`;
        });
    return retorno;
}

async function excluirPedidoSolicitacao(nrSequenciaPedido) {
    let retorno = {};
    if (nrSequenciaPedido) {
        retorno = await deletePedidoSolicitacao(nrSequenciaPedido);
        if (!retorno.status) {
            retorno.itemFalho.push(nrSequenciaPedido);
            retorno.status = false;
            retorno.msg = retorno.msg;
        }
    }

    return retorno;
}

async function deletePedidoSolicitacao(solicitacao) {
    let retorno = {
        status: false,
        msg: '',
        itemFalho: [],
    };

    const db = await oracledb.getConnection();
    await db
        .execute(
            `DELETE 
    FROM	TASY.PEDIDO_EXAME_EXTERNO
    WHERE 1 = 1
        AND	NR_SEQUENCIA = :NR_SEQUENCIA
        AND CD_PESSOA_FISICA = :CD_PESSOA_FISICA
    `, {
                ':NR_SEQUENCIA': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: solicitacao.nrSeqPedido.toString(),
                },
                ':CD_PESSOA_FISICA': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: solicitacao.cdPessoaFisica.toString(),
                },
            }, {
                outFormat: oracledb.OBJECT,
                autoCommit: true,
            },
        )
        .then(result => {
            if (result.rowsAffected == 0) {
                (retorno.status = false),
                (retorno.msg = `Pedido não foi deletado, verifique se os parametros foram passados corretamente`);
                return;
            }
            (retorno.status = true),
            (retorno.msg = 'Sucesso ao deletar pedido de solicitação');
        })
        .finally(function() {
            db.close();
        })
        .catch(err => {
            console.log(`Erro ao deletar pedido de solicitação: ${err}`);
            retorno.msg = `Erro ao deletar pedido de solicitação`;
        });
    return retorno;
}

async function pesquisarProcInterno(dsItem) {
    let retorno = {
        status: false,
        msg: '',
    };

    const itemPesquisa = `%${dsItem}%`;

    const db = await oracledb.getConnection();
    await db
        .execute(
            `SELECT 
                        DS_PROC_EXAME NM_EXAME,
                        NR_SEQUENCIA NR_SEQ_PROC_INTERNO, 
                        NR_SEQUENCIA NR_EXAME,
                        IE_ORIGEM_PROC_TUSS IE_ORIGEM_PROCED, 
                        CD_PROCEDIMENTO_TUSS CD_PROCEDIMENTO
                    FROM	tasy.proc_interno
                    WHERE ie_tipo = 'O'
                        AND	(upper(DS_PROC_EXAME) like upper(:DS_ITEM) OR CD_PROCEDIMENTO like :DS_ITEM)
                        AND	IE_SITUACAO = 'A'
                    and tasy.obter_se_proc_int_lib_estab(nr_sequencia,1) = 'S'
                    and ie_localizador = 'S'
                    and ie_situacao = 'A'
                    and IE_ORIGEM_PROC_TUSS = 8
                    and nr_seq_exame_lab is null
                    and ie_tipo_util <> 'C'
                    ORDER BY ds_proc_exame
                    FETCH FIRST 5 ROWS ONLY`, {
                ':DS_ITEM': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: itemPesquisa.toString(),
                },
            }, {
                outFormat: oracledb.OBJECT,
                autoCommit: true,
            },
        )
        .then(result => {
            (retorno.status = true),
            (retorno.msg = 'Sucesso ao pesquisar procedimento interno');
            retorno.dados = result.rows;
        })
        .finally(function() {
            db.close();
        })
        .catch(err => {
            console.log(`Erro ao pesquisar procedimento interno: ${err}`);
            retorno.msg = `Erro ao pesquisar procedimento interno`;
        });
    return retorno;
}

async function pesquisarCirurgias(){
    let retorno = {
        status: false, 
        msg: '',
    }

    // const itemPesquisa = `%${dsItem}%`

    const db = await oracledb.getConnection();
    await db.execute(`SELECT 
                            DS_PROC_EXAME NM_EXAME,
                            NR_SEQUENCIA NR_SEQ_PROC_INTERNO, 
                            NR_SEQUENCIA NR_EXAME,
                            IE_ORIGEM_PROC_TUSS IE_ORIGEM_PROCED, 
                            CD_PROCEDIMENTO_TUSS CD_PROCEDIMENTO
                        FROM	tasy.proc_interno
                        WHERE ie_tipo = 'O'
                            --AND	(upper(DS_PROC_EXAME) like upper(:DS_ITEM) OR CD_PROCEDIMENTO like :DS_ITEM)
                            AND	IE_SITUACAO = 'A'
                            and tasy.obter_se_proc_int_lib_estab(nr_sequencia,1) = 'S'
                            and ie_localizador = 'S'
                            and ie_situacao = 'A'
                            and IE_ORIGEM_PROC_TUSS = 8
                            and nr_seq_exame_lab is null
                            and ie_tipo_util = 'C'
                            ORDER BY ds_proc_exame
                            --FETCH FIRST 5 ROWS ONLY`,
    { 
        // ":DS_ITEM": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": itemPesquisa.toString() }
    },
    { 
        outFormat: oracledb.OBJECT,
        autoCommit: true
    })
    .then(result => {
        retorno.status = true,
        retorno.msg = 'Sucesso ao pesquisar procedimento interno'
        retorno.dados = result.rows
    })
    .finally(function(){
        db.close()
    })
    .catch(err => { 
        console.log(`Erro ao pesquisar procedimento interno: ${err}`)
        retorno.msg = `Erro ao pesquisar procedimento interno`
    })
    return retorno
}

async function medGrupo(nrAtendimento, cdMedico){
    let retorno = {
        status: false,
        msg: '',
    };

    const db = await oracledb.getConnection();
    await db
        .execute(
            `SELECT a.ds_grupo_exame,
                        a.nr_sequencia nr_seq_grupo,
                        'U' ie_exame,
                        cd_estabelecimento
                    FROM	tasy.med_grupo_exame a
                    WHERE (('U'  = 'U'
                        and cd_medico  = :CD_MEDICO)
                        or ('U'  = 'I'
                        and ((cd_estabelecimento = 1
                        and cd_medico is null) 
                        or (cd_estabelecimento is null
                        and cd_medico is null))))
                        and exists (SELECT 1
                            FROM tasy.med_exame_padrao x
                            WHERE x.nr_seq_grupo = a.nr_sequencia
                            AND	x.ie_pedido = 'S')
                        and tasy.obter_se_grupo_exame_lib(a.nr_sequencia,:NR_ATENDIMENTO) = 'S'
                        AND	NVL(a.ie_situacao,'A') = 'A'
                        ORDER BY nvl(nr_seq_apresent, 0),  
                            a.ds_grupo_exame, 
                            a.nr_sequencia`, 
    { 
        ":NR_ATENDIMENTO": { "dir": oracledb.BIND_IN, "type": oracledb.NUMBER, "val": Number(nrAtendimento) },
        ":CD_MEDICO": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": cdMedico }
    },
    { 
        outFormat: oracledb.OBJECT,
        autoCommit: true
    })
    .then(result => {
        retorno.status = true,
        retorno.dados = result.rows
    })
    .finally(function(){
        db.close()
    })
    .catch(err => { 
        console.log(`Erro ao obter medGrupo ddd: ${err}`)
        retorno.status = false
        retorno.msg = `Erro ao obter medGrupo`
    })
    return retorno
}

async function medGrupoInstituicao() {
    let retorno = {
        status: false,
        msg: '',
    };

    const db = await oracledb.getConnection();
    await db
        .execute(
            `select distinct a.nr_sequencia, 
                        a.ds_grupo_exame
                    from tasy.MED_GRUPO_EXAME a
                    where a.ie_situacao = 'A'
                    and a.cd_medico is null
                    and exists (SELECT 1
                                            FROM tasy.med_exame_padrao x
                                            WHERE x.nr_seq_grupo = a.nr_sequencia
                                            AND	x.ie_pedido = 'S')`, 
    { 
        //":NR_ATENDIMENTO": { "dir": oracledb.BIND_IN, "type": oracledb.NUMBER, "val": Number(nrAtendimento) },
        //":CD_MEDICO": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": cdMedico }
    },
    { 
        outFormat: oracledb.OBJECT,
        autoCommit: true
    })
    .then(result => {
        retorno.status = true,
        retorno.dados = result.rows
    })
    .finally(function(){
        db.close()
    })
    .catch(err => { 
        console.log(`Erro ao obter medGrupo ccc: ${err}`)
        retorno.status = false
        retorno.msg = `Erro ao obter medGrupo`
    })
    return retorno
}

async function listarHemoterapia(nrAtendimento){
    let retorno = {
        status: false, 
        msg: '',
    }

    const sql = `
    select
        b.nr_prescricao,
        substr(tasy.obter_nome_pessoa_fisica(a.cd_medico, null),1,200) NM_MEDICO,
        substr(tasy.Obter_Desc_CID_Doenca(a.CD_DOENCA_CID),1,200) DS_DIAGNOSTICO,
        a.CD_DEPARTAMENTO,
        a.CD_DOENCA_CID,
        a.CD_EVOLUCAO,
        a.CD_FUNCAO_ORIGEM,
        a.CD_MEDICO,
        a.CD_PERFIL_ATIVO,
        a.CD_PESSOA_FISICA,
        a.CD_PROCEDIMENTO,
        a.CD_SETOR_ATENDIMENTO,
        a.DS_HORARIOS,
        a.DS_JUSTIFICATIVA,
        a.DT_ALTA_MEDICO,
        to_char(a.DT_ATUALIZACAO, 'DD/MM/YYYY - HH24:MI') as DT_ATUALIZACAO,
        to_char(a.DT_FIM, 'DD/MM/YYYY - HH24:MI') as DT_FIM,
        to_char(a.DT_SUSPENSAO, 'DD/MM/YYYY - HH24:MI') as DT_SUSPENSAO,
        to_char(a.DT_INICIO, 'DD/MM/YYYY - HH24:MI') as DT_INICIO,
        to_char(a.DT_LIBERACAO, 'DD/MM/YYYY') as DT_LIBERACAO2,
        to_char(a.DT_LIBERACAO_ENF, 'DD/MM/YYYY - HH24:MI') as DT_LIBERACAO_ENF,
        to_char(a.DT_PROGRAMADA, 'DD/MM/YYYY') as DT_PROGRAMADA2,
        to_char(a.DT_PROX_GERACAO, 'DD/MM/YYYY - HH24:MI') as DT_PROX_GERACAO,
        a.NM_USUARIO,
        a.NM_USUARIO_LIB_ENF,
        a.NM_USUARIO_NREC,
        a.IE_UNID_MED_HEMO,
        a.IE_VIA_APLICACAO,
        a.IE_TRANS_ANTERIOR,
        a.IE_ORIGEM_PROCED,
        a.*
    
    from tasy.cpoe_hemoterapia a
    join samel.prontuario_log_solic_bco_sangue b on a.nr_sequencia = b.nr_seq_cpoe_hemoterapia
    where 1 = 1
        and a.nr_atendimento = :nr_atendimento
        and DT_SUSPENSAO is null
    order by a.nr_sequencia desc
    `;
    const db = await oracledb.getConnection();
    await db.execute(sql, 
    { 
        ":nr_atendimento": { "dir": oracledb.BIND_IN, "type": oracledb.NUMBER, "val": parseInt(nrAtendimento) }
    },
    { 
        outFormat: oracledb.OBJECT,
        autoCommit: true
    })
    .then(result => {
        retorno.status = true,
        retorno.dados = result.rows
    })
    .finally(function(){
        db.close()
    })
    .catch(err => { 
        console.log(`Erro ao obter medGrupo bbb : ${err}`)
        retorno.status = false
        retorno.msg = `Erro ao obter medGrupo`
    })
    return retorno
}

async function examesGrupos(cdMedico) {
    let retorno = {
        status: false,
        msg: '',
    };

    const db = await oracledb.getConnection();
    await db
        .execute(
            `with material_exame as (
                select nr_seq_exame, nr_seq_material, ie_prioridade
                           from EXAME_LAB_MATERIAL where ie_prioridade = 1 and ie_situacao = 'A'
            ),
            exames_instuticao_rotinas as (                                        
                            SELECT distinct 
                                   CASE WHEN B.nr_seq_exame IS NULL THEN 'OUTROS EXAMES' ELSE 'EXAMES LABORATORIAIS' END AS TIPO,
                                   1 as ordem,
                                   nvl(nvl(a.ds_reduzida_exame,a.ds_exame), '') ds_exame,
                                   --nvl(ie_lado,'N') ie_lado,
                                   --nvl(IE_QUEST_QUANTIDADE,'N') IE_QUEST_QUANTIDADE,
                                   --nvl(IE_QUESTIONA_DATA,'N') ie_questiona_data,
                                   --nvl(IE_QUEST_JUSTIF,'N') ie_quest_justif,
                                   --nvl(DS_JUSTIFICATIVA,'') ds_justificativa,
                                   --nvl(QT_EXAME,0) qt_exame,
                                   nvl(a.nr_proc_interno,0) nr_proc_interno,
                                   --nr_seq_grupo,
                                   --a.nr_seq_exame 
                                    a.nr_sequencia as nr_exame_padrao,
                                    nvl(B.nr_seq_exame, a.nr_seq_exame) as nr_seq_lab,
                                    null as ie_origem_proced,
                                    null cd_procedimento, 
                                    me.nr_seq_material, me.ie_prioridade
                            FROM	tasy.med_exame_padrao a
                                left join exame_laboratorio b on ((a.nr_seq_exame = B.nr_seq_exame OR a.nr_proc_interno = B.nr_seq_proc_interno) and b.ie_situacao = 'A')
                                join tasy.med_grupo_exame c on (c.nr_sequencia = a.nr_seq_grupo)
                                left join  material_exame me on (me.nr_seq_exame = a.nr_seq_exame)
                            WHERE --(
                                  --          ('I'   = 'U'  and a.cd_medico   = :CD_MEDICO )
                                  --                   or 
                                  --          ('I'   = 'I' and (  (a.cd_estabelecimento  = 1  and cd_medico   is null)
                                  --                                      or 
                                  --                              (a.cd_estabelecimento  is null and cd_medico   is null)
                                  --                           )
                                  --          )
                            --)
                            1=1
                            -- 340 corresponde ao grupo de exames laboratoriais. nesse caso grupo EXAMES_LABORATORIAIS da instituizcao
                            -- 341 corresponde ao grupo de exame nao laboratoriais. nesse caso grupo EXAMES_NAO_LABORATORIAIS da instituizcao
                            and (c.cd_medico is null and c.nr_sequencia in ( 340,341)) 
                            --and nr_seq_grupo   = :NR_SEQ_GRUPO
                            and a.ie_pedido   = 'S'
                            and nvl(nvl(a.ds_reduzida_exame,a.ds_exame), '') is not null
                            and tasy.obter_se_perfil_exame(a.nr_sequencia,tasy.wheb_usuario_pck.get_cd_perfil) = 'S'
                            and tasy.obter_se_espec_exame(a.nr_sequencia, :CD_MEDICO)    = 'S'
                            and  nvl(a.ie_situacao,'A') = 'A'
                            and a.nr_seq_grupo in (select nr_sequencia from tasy.MED_GRUPO_EXAME where ie_situacao = 'A')
                        ), 
                        exames_laboratoriais as (
                             select 
                               distinct 
                               'EXAMES LABORATORIAIS' as tipo,
                               2 as ordem,
                               a.nm_exame, 
                               nvl(a.nr_seq_proc_interno,0) as nr_proc_interno, 
                               0 as nr_seq_exame_padrao,
                               a.nr_seq_exame,
                                ie_origem_proced,
                                cd_procedimento,
                                me.nr_seq_material, me.ie_prioridade
                            from tasy.exame_laboratorio a 
                            join  material_exame me on (me.nr_seq_exame = a.nr_seq_exame)
                            where a.ie_situacao = 'A' 
                                  and a.ie_origem_proced = 8 
                                  and ie_solicitacao = 'S'
                                  and ie_situacao = 'A'
                                  and (a.nr_seq_proc_interno not in (select nr_proc_interno from exames_instuticao_rotinas)
                                            or 
                                      a.nr_seq_exame not in (select aa.nr_seq_lab from exames_instuticao_rotinas aa)
                                      )
                             union all 
                            select distinct 
                                'EXAMES LABORATORIAIS' as tipo,
                                2 as ordem,
                                ds_proc_exame as nm_exame,
                                a.nr_sequencia as nr_proc_interno,
                                0 as nr_seq_exame_padrao,
                                a.nr_seq_exame_lab,
                                b.ie_origem_proced,
                                b.cd_procedimento,
                                me.nr_seq_material, me.ie_prioridade
                                        --ds_proc_exame || ' (' || tasy.obter_valor_dominio(95, cd_tipo_procedimento) || ')' as ds_Exame, 
                                        --ie_tipo_util, 
                                        --b.cd_tipo_procedimento,
                                        --tasy.obter_valor_dominio(95, cd_tipo_procedimento) as tipo_proc,
                                        
                                        
                                    from tasy.proc_interno a
                                      join tasy.procedimento b on a.cd_procedimento = b.cd_procedimento and a.ie_origem_proced = b.ie_origem_proced
                                      join tasy.exame_laboratorio el on (a.nr_seq_exame_lab = el.nr_seq_exame)
                                      join material_exame me on (el.nr_seq_exame = me.nr_seq_exame)
                                   where  
                                   a.ie_situacao = 'A'
                                    and a.ie_localizador = 'S'
                                    and b.ie_origem_proced in (8)
                                    and a.nr_seq_exame_lab is null
                                    and ie_tipo = 'O'
                                    and ie_tipo_util <> 'C'
                                    and b.cd_tipo_procedimento   in (20 )
                                    and (a.nr_sequencia not in (select nr_proc_interno from exames_instuticao_rotinas)
                                             --   or 
                                           --a.nr_seq_exame_lab not in (select nr_sequencia from exames_laboratoriais)
                                             --   or
                                           --a.nr_seq_exame_lab not in (select nr_seq_exame from exames_instuticao_rotinas)
                                           
                                          )
                                        
                        ),
                        exames_nao_laboratoriais as (
                            select distinct 
                                    'OUTROS EXAMES' as tipo,
                                    3 as ordem,
                                    ds_proc_exame || ' (' || tasy.obter_valor_dominio(95, cd_tipo_procedimento) || ')' as ds_Exame, 
                                    
                                    a.nr_sequencia as nr_proc_interno,
                                    null as nr_Seq_exame_padrao,
                                    a.nr_seq_exame_lab,
                                    a.ie_origem_proced as ie_origem_proced,
                                    a.cd_procedimento as cd_procedimento,
                                    null nr_seq_material, null ie_prioridade
                                from tasy.proc_interno a
                                join tasy.procedimento b on a.cd_procedimento = b.cd_procedimento and a.ie_origem_proced = b.ie_origem_proced
                                where a.ie_situacao = 'A'
                                and a.ie_localizador = 'S'
                                --and a.ie_origem_proced = 8
                                and a.nr_seq_exame_lab is null
                                and ie_tipo = 'O'
                                and ie_tipo_util <> 'C'
                         --       and b.cd_tipo_procedimento  not in (37, 38, 20, 99 )
                                and b.cd_tipo_procedimento   in (2, 3, 4, 10, 34, 85, 84, 92, 96 )
                                and (  --a.nr_sequencia not in (select nr_proc_interno from exames_instuticao_rotinas)
                                       --       or 
                                       NVL(a.nr_seq_exame_lab, 0) not in (select nr_sequencia from exames_laboratoriais)
                                       --     or
                                       -- a.nr_seq_exame_lab not in (select nr_seq_exame from exames_instuticao_rotinas)
                                       
                                    )
                        ),
                        
                        resumo as (
                        select distinct * from exames_instuticao_rotinas
                            union  
                        select * from exames_laboratoriais
                            union  
                        select * from exames_nao_laboratoriais
                        order by 2 asc, 1 asc,  3 asc)
                        select distinct 
                                rownum as id,
                                tipo, 
                                ds_Exame, 
                                nr_proc_interno, 
                                nr_exame_padrao as nr_sequencia,
                                nr_seq_lab,
                                ie_origem_proced, 
                                cd_procedimento ,
                                nr_seq_material cd_material,    ---preciso do codigo do material do exame
                                0 as is_existe_resultado_exame  ---preciso se tem resultado de exames nos ultimos 30 dias: 0 = NAO e 1 = SIM
                                
                        from resumo`, 
    { 
        //":NR_ATENDIMENTO": { "dir": oracledb.BIND_IN, "type": oracledb.NUMBER, "val": Number(nrAtendimento) },
        ":CD_MEDICO": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": cdMedico }
    },
    { 
        outFormat: oracledb.OBJECT,
        autoCommit: true
    })
    .then(result => {
        retorno.status = true,
        retorno.dados = result.rows
    })
    .finally(function(){
        db.close()
    })
    .catch(err => { 
        console.log(`Erro ao obter medGrupo ccc: ${err}`)
        retorno.status = false
        retorno.msg = `Erro ao obter medGrupo`
    })
    return retorno
}

async function buscarPrescrProc(nrPrescricao){
    let retorno = {
        status: false, 
        msg: '',
    }

    const db = await oracledb.getConnection();
    await db.execute(`select * from tasy.prescr_procedimento where nr_prescricao = :nr_prescricao`, 
    { 
        ":nr_prescricao": { "dir": oracledb.BIND_IN, "type": oracledb.NUMBER, "val": parseInt(nrPrescricao) }
    },
    { 
        outFormat: oracledb.OBJECT,
        autoCommit: true
    })
    .then(result => {
        retorno.status = true,
        retorno.dados = result.rows
    })
    .finally(function(){
        db.close()
    })
    .catch(err => { 
        console.log(`Erro ao obter medGrupo aaa: ${err}`)
        retorno.status = false
        retorno.msg = `Erro ao obter medGrupo`
    })
    return retorno
}

async function buscarPrescrBcoSangue(nrPrescricao){
    let retorno = {
        status: false, 
        msg: '',
    }

    const db = await oracledb.getConnection();
    await db.execute(`select 
                        a.nm_usuario_nrec,
                        a.nm_usuario,
                        a.ie_tipo,
                        a.ie_porte_cirurgico,
                        a.ie_gravidez,
                        a.dt_programada,
                        a.qt_hemoglobina,
                        a.qt_gravidez,
                        a.ie_reserva,
                        a.ds_diagnostico,
                        a.qt_aborto,
                        a.ie_tipo_paciente,
                        a.dt_ultima_transf,
                        a.qt_hematocrito,
                        a.ie_trans_anterior,
                        a.qt_transf_anterior,
                        a.nr_prescricao,
                        a.qt_plaqueta,
                        a.cd_doenca_cid
                        --a.*
                        from tasy.prescr_solic_bco_sangue a where nr_prescricao = :nr_prescricao`, 
    { 
        ":nr_prescricao": { "dir": oracledb.BIND_IN, "type": oracledb.NUMBER, "val": parseInt(nrPrescricao) }
    },
    { 
        outFormat: oracledb.OBJECT,
        autoCommit: true
    })
    .then(result => {
        retorno.status = true,
        retorno.dados = result.rows
    })
    .finally(function(){
        db.close()
    })
    .catch(err => { 
        console.log(`Erro ao obter medGrupo: ${err}`)
        retorno.status = false
        retorno.msg = `Erro ao obter medGrupo`
    })
    return retorno
}

async function gerarNovaPrescricao(cd_estabelecimento_p, cd_funcao_p, cd_medico_p, cd_perfil_p, cd_pessoa_fisica_p, cd_setor_prescr_p, ie_adep_p, ie_motivo_prescr_p, ie_prescr_emergencia_p, ie_substitui_p, nm_usuario_p, nr_atendimento_p, nr_horas_validade_p, nr_nova_prescr_p, nr_prescr_orig_p, qt_dias_extensao_p){
    let retorno = {
        status: false, 
        msg: '',
        novo_nr_prescricao: ''
    }

    const db = await oracledb.getConnection();
    await db.execute(`begin
                        gerar_nova_prescricao(
                            nr_atendimento_p => :NR_ATENDIMENTO,
                            cd_setor_prescr_p => 115,
                            dt_prescricao_p => sysdate,
                            ie_substitui_p => 'N',
                            nr_prescr_orig_p => 1,
                            hr_prescricao_p => to_char(sysdate, 'hh24:mi'),
                            ie_adep_p => 'S',
                            nm_usuario_p => :NM_USUARIO_P,
                            ie_prescr_emergencia_p => 'N',
                            cd_funcao_p => 950,
                            nr_nova_prescr_p => :NOVO_NR_PRESCRICAO,
                            ie_motivo_prescr_p => '',
                            cd_pessoa_fisica_p => :CD_PESSOA_FISICA_P,
                            cd_perfil_p => 2250,
                            cd_estabelecimento_p => 1,
                            cd_medico_p => '',
                            qt_dias_extensao_p => 0,
                            nr_horas_validade_p => ''
                        );
                        end;`, 
    { 
        ":NR_ATENDIMENTO": { "dir": oracledb.BIND_IN, "type": oracledb.NUMBER, "val":  parseInt(nr_atendimento_p) },
        ":NM_USUARIO_P": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": nm_usuario_p },
        ":CD_PESSOA_FISICA_P": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": cd_pessoa_fisica_p },
        ":NOVO_NR_PRESCRICAO": {"dir": oracledb.BIND_OUT, "type": oracledb.STRING}
        //":CD_MEDICO": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": cdMedico }
    },
    { 
        outFormat: oracledb.OBJECT,
        autoCommit: true
    })
    .then(result => {
        retorno.status = true,
        retorno.novo_nr_prescricao = result.outBinds[':NOVO_NR_PRESCRICAO']
    })
    .finally(function(){
        db.close()
    })
    .catch(err => { 
        console.log(`Erro ao obter medGrupo hemoterapia gerarNovaPrescr: ${err}`)
        retorno.status = false
        retorno.msg = `Erro ao obter medGrupo`
    })
    return retorno
}

async function gerarEvolucaoPaciente(nm_usuario_p, cd_medico_p, cd_pessoa_fisica_p, cd_setor_atendimento, nr_atendimento_p){
    let retorno = {
        status: false, 
        msg: ''
    }

    const db = await oracledb.getConnection();
    await db.execute(`INSERT INTO tasy.EVOLUCAO_PACIENTE (
                        CD_PERFIL_ATIVO,
                        IE_RESTRICAO_VISUALIZACAO,
                        IE_EVOLUCAO_CLINICA,
                        IE_EVOLUCAO_DOR,
                        IE_TIPO_EVOLUCAO,
                        NM_USUARIO_NREC,
                        DT_ATUALIZACAO_NREC,
                        NM_USUARIO,
                        CD_ESPECIALIDADE,
                        NR_SEQ_EVOL_GRAV,
                        DT_LIBERACAO_AUX,
                        DT_EVOLUCAO,
                        CD_MEDICO,
                        CD_MEDICO_PARECER,
                        QT_CARACTERES,
                        IE_RECEM_NATO,
                        IE_SITUACAO,
                        CD_PESSOA_FISICA,
                        NR_RECEM_NATO,
                        DS_LISTA_PROBLEMAS,
                        CD_ESPECIALIDADE_MEDICO,
                        IE_AVALIADOR_AUX,
                        DS_EVOLUCAO,
                        CD_SETOR_ATENDIMENTO,
                        DT_LIBERACAO,
                        DT_ATUALIZACAO,
                        DS_IMPRESSAO,
                        CD_EVOLUCAO,
                        NR_ATENDIMENTO,
                        IE_RELEV_RESUMO_ALTA )
                    VALUES ( 
                        1848,
                        'T',
                        'E',
                        'N',
                        '1',
                        :NM_USUARIO,
                        sysdate,
                        :NM_USUARIO,
                        null,
                        null,
                        null,
                        sysdate,
                        :CD_MEDICO,
                        null,
                        1,
                        'N',
                        'A',
                        :CD_PESSOA_FISICA,
                        null,
                        null,
                        111,
                        'N',
                        '',
                        :CD_SETOR_ATENDIMENTO,
                        null,
                        sysdate,
                        null,
                        tasy.EVOLUCAO_PACIENTE_SEQ.nextval,
                        :NR_ATENDIMENTO,
                        'N')
                        RETURNING CD_EVOLUCAO into :AUDIT_LOG_ID
                        `,
    { 
        ":NM_USUARIO": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": nm_usuario_p.toString() },
        ":CD_MEDICO": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": cd_medico_p.toString()},
        ":CD_PESSOA_FISICA": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": cd_pessoa_fisica_p.toString()},
        ":CD_SETOR_ATENDIMENTO": { "dir": oracledb.BIND_IN, "type": oracledb.NUMBER, "val": parseInt(cd_setor_atendimento)},
        ":NR_ATENDIMENTO": { "dir": oracledb.BIND_IN, "type": oracledb.NUMBER, "val": parseInt(nr_atendimento_p)},
        ":AUDIT_LOG_ID": {"dir": oracledb.BIND_OUT, "type": oracledb.NUMBER}
    },
    { 
        outFormat: oracledb.OBJECT,
        autoCommit: true
    })
    .then(result => {
        retorno.status = true,
        retorno.msg = "Successo inserir evolução"
        let vari = []
        vari = result.outBinds[':AUDIT_LOG_ID']
        vari.map((dado) =>{
            retorno.cd_evolucao = dado
        })
    })
    .finally(function(){
        db.close()
    })
    .catch(err => { 
        retorno.status = false
        retorno.msg = "Erro ao inserir Evolução!" + err
    })
    return retorno
}

async function updateLiberarEvolucaoPaciente(cd_evolucao){
    let retorno = {
        status: false, 
        msg: ''
    }

    const db = await oracledb.getConnection();
    await db.execute(`UPDATE EVOLUCAO_PACIENTE
                        SET DT_EVOLUCAO = sysdate
                        WHERE 1 = 1 
                            AND	CD_EVOLUCAO = :cd_evolucao`,
    { 
        ":cd_evolucao": { "dir": oracledb.BIND_IN, "type": oracledb.NUMBER, "val": cd_evolucao },
        // ":AUDIT_LOG_ID": {"dir": oracledb.BIND_OUT, "type": oracledb.NUMBER}
    },
    { 
        outFormat: oracledb.OBJECT,
        autoCommit: true
    })
    .then(result => {
        retorno.status = true,
        retorno.msg = "Data da Evolução alterada com sucesso"
    })
    .finally(function(){
        db.close()
    })
    .catch(err => { 
        retorno.status = false
        retorno.msg = "Erro ao alterar data da liberação da Evolução!" + err
    })
    return retorno
}

async function liberarEvolucaoPaciente(cd_evolucao, nm_usuario_p){
    let retorno = {
        status: false, 
        msg: ''
    }

    const db = await oracledb.getConnection();
    await db.execute(`begin
                        Liberar_Evolucao(
                            cd_evolucao_p => :cd_evolucao,
                            nm_usuario_p => :nm_usuario_p
                        );
                        end;`,
    {
        ":cd_evolucao": { "dir": oracledb.BIND_IN, "type": oracledb.NUMBER, "val": cd_evolucao },
        ":nm_usuario_p": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": nm_usuario_p }
    },
    { 
        outFormat: oracledb.OBJECT,
        autoCommit: true
    })
    .then(result => {
        retorno.status = true,
        retorno.msg = "Sucesso ao liberar Evolução"
    })
    .finally(function(){
        db.close()
    })
    .catch(err => { 
        retorno.status = false
        retorno.msg = "Erro ao alterar data da liberação da Evolução!" + err
    })
    return retorno
}

async function prescrSolBsIndicacao(nr_seq_solic_sangue, nm_usuario, ie_grupo_hemocom, nr_seq_indicacao, cd_perfil_ativo){
    let retorno = {
        status: false, 
        msg: ''
    }

    const db = await oracledb.getConnection();
    await db.execute(`INSERT INTO tasy.prescr_sol_bs_indicacao (
                            nr_sequencia,
                            nr_seq_solic_bs,
                            dt_atualizacao,
                            nm_usuario,
                            ie_grupo_hemocom,
                            nr_seq_indicacao,
                            dt_atualizacao_nrec,
                            nm_usuario_nrec,
                            cd_perfil_ativo
                        )VALUES(
                            tasy.PRESCR_SOL_BS_INDICACAO_SEQ.nextVal,
                            :nr_seq_solic_sangue,
                            sysdate,
                            :nm_usuario,
                            :ie_grupo_hemocom,
                            :nr_seq_indicacao,
                            sysdate,
                            :nm_usuario,
                            :cd_perfil_ativo)`,
    {
        ":nr_seq_solic_sangue": { "dir": oracledb.BIND_IN, "type": oracledb.NUMBER, "val": parseInt(nr_seq_solic_sangue) },
        ":nm_usuario": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": nm_usuario.toString() },
        ":ie_grupo_hemocom": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": ie_grupo_hemocom.toString() },
        ":nr_seq_indicacao": { "dir": oracledb.BIND_IN, "type": oracledb.NUMBER, "val": parseInt(nr_seq_indicacao) },
        ":cd_perfil_ativo": { "dir": oracledb.BIND_IN, "type": oracledb.NUMBER, "val": parseInt(cd_perfil_ativo) }
    },
    { 
        outFormat: oracledb.OBJECT,
        autoCommit: true
    })
    .then(result => {
        retorno.status = true,
        retorno.msg = "Sucesso ao inserir"
        console.log("---------DEU CERTO PORRA, VAI TOMAR NO CU---------")
    })
    .finally(function(){
        db.close()
    })
    .catch(err => { 
        retorno.status = false
        retorno.msg = "Erro ao alterar data da liberação da Evolução!" + err
    })
    return retorno
}

async function prescrSolicBcoSangue(cd_doenca_cid, cd_perfil_ativo, ds_cirurgia, ds_coagulopatia, ds_diagnostico, ds_hemocomp_reacao, ds_observacao, ds_pre_medicacao, dt_atualizacao, dt_atualizacao_nrec, dt_cirurgia, dt_programada, dt_ultima_transf, ie_coombs_direto, ie_gravidez, ie_horario_susp, ie_porte_cirurgico, ie_pre_medicacao, ie_reserva, ie_tipo, ie_tipo_paciente, ie_trans_anterior, nm_usuario, nm_usuario_nrec, nr_prescricao, nr_seq_reacao, nr_sequencia, qt_aborto, qt_albumina, qt_altura_cm, qt_bilirrubina_dir, qt_bilirrubina_ind, qt_calcio, qt_fibrinogenio, qt_freq_cardiaca, qt_gravidez, qt_hematocrito, qt_hemoglobina, qt_hemoglobina_s, qt_imc, qt_leucocitos, qt_magnesio, qt_pa_diastolica, qt_pa_sistolica, qt_peso, qt_plaqueta, qt_tap, qt_tap_inr, qt_temp, qt_transf_anterior, qt_ttpa, qt_ttpa_rel){
    let retorno = {
        status: false, 
        msg: ''
    }

    const db = await oracledb.getConnection();
    await db.execute(`INSERT INTO tasy.prescr_solic_bco_sangue (
                        dt_atualizacao,
                        nr_prescricao,
                        nm_usuario,
                        ie_tipo,
                        nr_sequencia,
                        ie_gravidez,
                        ie_tipo_paciente,
                        ie_trans_anterior,
                        ds_diagnostico,
                        qt_transf_anterior,
                        --nr_seq_reacao,
                        ie_porte_cirurgico,
                        dt_programada,
                        qt_plaqueta,
                        qt_hemoglobina,
                        qt_hematocrito,
                        --qt_tap,
                        --qt_tap_inr,
                        ds_coagulopatia,
                        dt_ultima_transf,
                        --dt_atualizacao_nrec,
                        nm_usuario_nrec,
                        ds_observacao,
                        --ie_pre_medicacao,
                        --ds_pre_medicacao,
                        --qt_fibrinogenio,
                        qt_gravidez,
                        qt_aborto,
                        cd_perfil_ativo,
                        ie_reserva,
                        --qt_ttpa,
                        --qt_imc,
                        --qt_peso,
                        --qt_altura_cm,
                        --dt_cirurgia,
                        --ds_cirurgia,
                        --ds_hemocomp_reacao,
                        --qt_hemoglobina_s,
                        --qt_albumina,
                        --qt_bilirrubina_dir,
                        --qt_bilirrubina_ind,
                        --qt_magnesio,
                        --qt_calcio,
                        --ie_coombs_direto,
                        --qt_freq_cardiaca,
                        --qt_pa_sistolica,
                        --qt_pa_diastolica,
                        --qt_ttpa_rel,
                        --qt_temp,
                        --qt_leucocitos,
                        --ie_horario_susp,
                        cd_doenca_cid
                    ) VALUES ( 
                        SYSDATE,
                        :nr_prescricao,
                        :nm_usuario,
                        :ie_tipo,
                        tasy.prescr_solic_bco_sangue_seq.nextval,
                        :ie_gravidez,
                        :ie_tipo_paciente,
                        :ie_trans_anterior,
                        :ds_diagnostico,
                        :qt_transf_anterior,
                        --:nr_seq_reacao,
                        :ie_porte_cirurgico,
                        TO_DATE(:dt_programada, 'dd/mm/yyyy hh24:mi:ss'),
                        :qt_plaqueta,
                        :qt_hemoglobina,
                        :qt_hematocrito,
                        --:qt_tap,
                        --:qt_tap_inr,
                        :ds_coagulopatia,
                        TO_DATE(:dt_ultima_transf, 'dd/mm/yyyy hh24:mi:ss'),
                        --dt_atualizacao_nrec,
                        :nm_usuario_nrec,
                        :ds_observacao,
                        --:ie_pre_medicacao,
                        --:ds_pre_medicacao,
                        --:qt_fibrinogenio,
                        :qt_gravidez,
                        :qt_aborto,
                        :cd_perfil_ativo,
                        :ie_reserva,
                        --:qt_ttpa,
                        --:qt_imc,
                        --:qt_peso,
                        --:qt_altura_cm,
                        --:dt_cirurgia,
                        --:ds_cirurgia,
                        --:ds_hemocomp_reacao,
                        --:qt_hemoglobina_s,
                        --:qt_albumina,
                        --:qt_bilirrubina_dir,
                        --:qt_bilirrubina_ind,
                        --:qt_magnesio,
                        --:qt_calcio,
                        --:ie_coombs_direto,
                        --:qt_freq_cardiaca,
                        --:qt_pa_sistolica,
                        --:qt_pa_diastolica,
                        --:qt_ttpa_rel,
                        --:qt_temp,
                        --:qt_leucocitos,
                        --:ie_horario_susp,
                        :cd_doenca_cid
                    )
                    returning nr_sequencia into :nr_seq_solic_sangue`, 
    { 
        ":nr_prescricao": { "dir": oracledb.BIND_IN, "type": oracledb.NUMBER, "val":  parseInt(nr_prescricao) },
        ":nm_usuario": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": nm_usuario.toString() },
        ":ie_tipo_paciente": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": ie_tipo_paciente.toString() },
        ":ie_tipo": { "dir": oracledb.BIND_IN, "type": oracledb.NUMBER, "val": parseInt(ie_tipo) },
        ":ie_trans_anterior": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": ie_trans_anterior.toString() },
        ":ie_gravidez": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": ie_gravidez.toString() },

        ":ds_diagnostico": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": ds_diagnostico.toString() },
        ":qt_transf_anterior": { "dir": oracledb.BIND_IN, "type": oracledb.NUMBER, "val": parseInt(qt_transf_anterior) },
        // ":nr_seq_reacao": { "dir": oracledb.BIND_IN, "type": oracledb.NUMBER, "val": parseInt(nr_seq_reacao) },
        ":ie_porte_cirurgico": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": ie_porte_cirurgico.toString() },
        ":dt_programada": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": dt_programada.toString() },
        ":qt_plaqueta": { "dir": oracledb.BIND_IN, "type": oracledb.NUMBER, "val": parseInt(qt_plaqueta) },
        ":qt_hemoglobina": { "dir": oracledb.BIND_IN, "type": oracledb.NUMBER, "val": parseInt(qt_hemoglobina) },
        ":qt_hematocrito": { "dir": oracledb.BIND_IN, "type": oracledb.NUMBER, "val": parseInt(qt_hematocrito) },
        // ":qt_tap": { "dir": oracledb.BIND_IN, "type": oracledb.NUMBER, "val": parseInt(qt_tap) },
        // ":qt_tap_inr": { "dir": oracledb.BIND_IN, "type": oracledb.NUMBER, "val": parseInt(qt_tap_inr) },
        ":ds_coagulopatia": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": ds_coagulopatia.toString() },
        ":dt_ultima_transf": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": dt_ultima_transf },
        // ":dt_atualizacao_nrec": { "dir": oracledb.BIND_IN, "type": oracledb.DATE, "val": dt_atualizacao_nrec },
        ":nm_usuario_nrec": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": nm_usuario_nrec.toString() },
        ":ds_observacao": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": ds_observacao.toString() },
        // ":ie_pre_medicacao": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": ie_pre_medicacao.toString() },
        // ":ds_pre_medicacao": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": ds_pre_medicacao.toString() },
        // ":qt_fibrinogenio": { "dir": oracledb.BIND_IN, "type": oracledb.NUMBER, "val": parseInt(qt_fibrinogenio) },
        ":qt_gravidez": { "dir": oracledb.BIND_IN, "type": oracledb.NUMBER, "val": parseInt(qt_gravidez) },
        ":qt_aborto": { "dir": oracledb.BIND_IN, "type": oracledb.NUMBER, "val": parseInt(qt_aborto) },
        ":cd_perfil_ativo": { "dir": oracledb.BIND_IN, "type": oracledb.NUMBER, "val": parseInt(cd_perfil_ativo) },
        ":ie_reserva": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": ie_reserva.toString() },
        // ":qt_ttpa": { "dir": oracledb.BIND_IN, "type": oracledb.NUMBER, "val": parseInt(qt_ttpa) },
        // ":qt_imc": { "dir": oracledb.BIND_IN, "type": oracledb.NUMBER, "val": parseInt(qt_imc) },
        // ":qt_peso": { "dir": oracledb.BIND_IN, "type": oracledb.NUMBER, "val": parseInt(qt_peso) },
        // ":qt_altura_cm": { "dir": oracledb.BIND_IN, "type": oracledb.NUMBER, "val": parseInt(qt_altura_cm) },
        // ":dt_cirurgia": { "dir": oracledb.BIND_IN, "type": oracledb.DATE, "val": dt_cirurgia },
        // ":ds_cirurgia": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": ds_cirurgia.toString() },
        // ":ds_hemocomp_reacao": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": ds_hemocomp_reacao.toString() },
        // ":qt_hemoglobina_s": { "dir": oracledb.BIND_IN, "type": oracledb.NUMBER, "val": parseInt(qt_hemoglobina_s) },
        // ":qt_albumina": { "dir": oracledb.BIND_IN, "type": oracledb.NUMBER, "val": parseInt(qt_albumina) },
        // ":qt_bilirrubina_dir": { "dir": oracledb.BIND_IN, "type": oracledb.NUMBER, "val": parseInt(qt_bilirrubina_dir) },
        // ":qt_bilirrubina_ind": { "dir": oracledb.BIND_IN, "type": oracledb.NUMBER, "val": parseInt(qt_bilirrubina_ind) },
        // ":qt_magnesio": { "dir": oracledb.BIND_IN, "type": oracledb.NUMBER, "val": parseInt(qt_magnesio) },
        // ":qt_calcio": { "dir": oracledb.BIND_IN, "type": oracledb.NUMBER, "val": parseInt(qt_calcio) },
        // ":ie_coombs_direto": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": ie_coombs_direto.toString() },
        // ":qt_freq_cardiaca": { "dir": oracledb.BIND_IN, "type": oracledb.NUMBER, "val": parseInt(qt_freq_cardiaca) },
        // ":qt_pa_sistolica": { "dir": oracledb.BIND_IN, "type": oracledb.NUMBER, "val": parseInt(qt_pa_sistolica) },
        // ":qt_pa_diastolica": { "dir": oracledb.BIND_IN, "type": oracledb.NUMBER, "val": parseInt(qt_pa_diastolica) },
        // ":qt_ttpa_rel": { "dir": oracledb.BIND_IN, "type": oracledb.NUMBER, "val": parseInt(qt_ttpa_rel) },
        // ":qt_temp": { "dir": oracledb.BIND_IN, "type": oracledb.NUMBER, "val": parseInt(qt_temp) },
        // ":qt_leucocitos": { "dir": oracledb.BIND_IN, "type": oracledb.NUMBER, "val": parseInt(qt_leucocitos) },
        // ":ie_horario_susp": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": ie_horario_susp.toString() },
        ":cd_doenca_cid": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": cd_doenca_cid.toString() },
        ":nr_seq_solic_sangue": {"dir": oracledb.BIND_OUT,"type": oracledb.NUMBER }
    },
    { 
        outFormat: oracledb.OBJECT,
        autoCommit: true
    })
    .then(result => {
        retorno.status = true,
        retorno.nr_seq_solic_sangue = result.outBinds[':nr_seq_solic_sangue']
    })
    .finally(function(){
        db.close()
    })
    .catch(err => { 
        console.log(`Erro prescrSolicBcoSangue: ${err}`)
        retorno.status = false
        retorno.msg = `Erro prescrSolicBcoSangue`
    })
    return retorno
}

async function countNrPrescrProcedimento(nr_prescricao){
    retorno = {
        status: false, 
        msg: '',
        dados: []
    }

    const db = await oracledb.getConnection();
    await db.execute(`select count(nr_prescricao) nr_seq from tasy.prescr_procedimento
                        where nr_prescricao = :nr_prescricao`,
    { 
        ":nr_prescricao": { "dir": oracledb.BIND_IN, "type": oracledb.NUMBER, "val": parseInt(nr_prescricao) }
    },
    { 
        outFormat: oracledb.OBJECT
    })
    .then(result => {
        retorno = result.rows[0]
    })
    .finally(function(){
        db.close()
    })
    .catch(err => { 
        console.log(`Erro ao obter atestados: ${err}`)
        retorno.msg = 'Erro ao obter atestados'
    })
    return retorno
}

async function prescr_procedimento(ie_irradiado, ie_lavado, ie_origem_inf, qt_hora_infusao, cd_motivo_baixa, dt_atualizacao, ie_suspenso, cd_setor_atendimento, ie_aprovacao_execucao, ie_tipo_proced, qt_tempo_infusao, ie_util_hemocomponente, nr_seq_interno, ie_se_necessario, nr_prescricao, ds_horarios, ie_autorizacao, ie_unid_med_hemo, ie_alterar_horario, qt_vol_hemocomp, ie_imagem_pacs, ie_anestesia, cd_intervalo, cd_perfil_ativo, qt_procedimento, nr_seq_derivado, ie_mostrar_web, ie_filtrado, ds_justificativa, ie_bolus, ie_descricao_cirurgica, ie_modificado, ds_observacao, nr_seq_solic_sangue, cd_procedimento, ie_status_atend, ie_pendente_amostra, ie_emite_mapa, ie_origem_proced, ie_fenotipado, ie_avisar_result, ie_proced_bloqueado, ie_status_execucao, ie_lavado_justificativa, ie_aberto, ie_externo, ie_exige_liberacao, qt_veloc_inf_hemo, cd_unid_med_sangue, ie_amostra, ie_aliquotado, nr_sequencia, ie_via_aplicacao, ie_urgencia, ie_acm, nm_usuario, dt_atualizacao_nrec, nm_usuario_nrec, ie_horario_susp, ie_exame_bloqueado, dt_prev_execucao, ie_executar_leito, nr_seq_proc_interno, ie_cobra_paciente, dt_programada, dt_fim){
    let retorno = {
        status: false,
        cdProcedimento: cd_procedimento
    }

    const db = await oracledb.getConnection();
    await db.execute(`INSERT INTO tasy.prescr_procedimento (
                        nr_prescricao,
                        nr_sequencia,
                        cd_procedimento,
                        qt_procedimento,
                        dt_atualizacao,
                        nm_usuario,
                        ie_origem_inf,
                        ie_cobra_paciente,
                        nr_seq_proc_interno,
                        ie_executar_leito,
                        dt_prev_execucao,
                        ie_exame_bloqueado,
                        ie_horario_susp,
                        nm_usuario_nrec,
                        dt_atualizacao_nrec,
                        ie_acm,
                        ie_urgencia,
                        ie_via_aplicacao,
                        ie_aliquotado,
                        ie_amostra,
                        cd_unid_med_sangue,
                        --qt_veloc_inf_hemo,
                        ie_exige_liberacao,
                        ie_externo,
                        ie_aberto,
                        ie_lavado_justificativa,
                        ie_status_execucao,
                        ie_proced_bloqueado,
                        ie_avisar_result,
                        ie_fenotipado,
                        ie_origem_proced,
                        ie_emite_mapa,
                        ie_pendente_amostra,
                        ie_status_atend,
                        nr_seq_solic_sangue,
                        ds_observacao,
                        ie_modificado,
                        ie_descricao_cirurgica,
                        ie_bolus,
                        ds_justificativa,
                        ie_filtrado,
                        ie_mostrar_web,
                        nr_seq_derivado,
                        cd_perfil_ativo,
                        --cd_intervalo,
                        ie_anestesia,
                        ie_imagem_pacs,
                        qt_vol_hemocomp,
                        ie_alterar_horario,
                        ie_unid_med_hemo,
                        ie_autorizacao,
                        ds_horarios,
                        ie_se_necessario,
                        nr_seq_interno,
                        ie_util_hemocomponente,
                        qt_tempo_infusao,
                        ie_tipo_proced,
                        ie_aprovacao_execucao,
                        cd_setor_atendimento,
                        ie_suspenso,
                        cd_motivo_baixa,
                        --qt_hora_infusao,
                        ie_lavado,
                        ie_irradiado,
                        dt_inicio,
                        dt_fim

                    ) VALUES ( 
                        :nr_prescricao,
                        :nr_sequencia,--tasy.prescr_procedimento_seq.nextval,
                        :cd_procedimento,
                        :qt_procedimento,
                        SYSDATE,
                        :nm_usuario,
                        :ie_origem_inf,
                        :ie_cobra_paciente,
                        :nr_seq_proc_interno,
                        :ie_executar_leito,
                        TO_DATE(:dt_prev_execucao, 'dd/mm/yyyy hh24:mi:ss'),
                        :ie_exame_bloqueado,
                        :ie_horario_susp,
                        :nm_usuario_nrec,
                        TO_DATE(:dt_atualizacao_nrec, 'dd/mm/yyyy hh24:mi:ss'),
                        :ie_acm,
                        :ie_urgencia,
                        :ie_via_aplicacao,
                        :ie_aliquotado,
                        :ie_amostra,
                        :cd_unid_med_sangue,
                        --:qt_veloc_inf_hemo,
                        :ie_exige_liberacao,
                        :ie_externo,
                        :ie_aberto,
                        :ie_lavado_justificativa,
                        :ie_status_execucao,
                        :ie_proced_bloqueado,
                        :ie_avisar_result,
                        :ie_fenotipado,
                        :ie_origem_proced,
                        :ie_emite_mapa,
                        :ie_pendente_amostra,
                        :ie_status_atend,
                        :nr_seq_solic_sangue,
                        :ds_observacao,
                        :ie_modificado,
                        :ie_descricao_cirurgica,
                        :ie_bolus,
                        :ds_justificativa,
                        :ie_filtrado,
                        :ie_mostrar_web,
                        :nr_seq_derivado,
                        :cd_perfil_ativo,
                        --:cd_intervalo,
                        :ie_anestesia,
                        :ie_imagem_pacs,
                        :qt_vol_hemocomp,
                        :ie_alterar_horario,
                        :ie_unid_med_hemo,
                        :ie_autorizacao,
                        :ds_horarios,
                        :ie_se_necessario,
                        tasy.prescr_procedimento_seq.nextval,
                        :ie_util_hemocomponente,
                        :qt_tempo_infusao,
                        :ie_tipo_proced,
                        :ie_aprovacao_execucao,
                        :cd_setor_atendimento,
                        :ie_suspenso,
                        :cd_motivo_baixa,
                        --:qt_hora_infusao,
                        :ie_lavado,
                        :ie_irradiado,
                        TO_DATE(:dt_programada, 'dd/mm/yyyy hh24:mi:ss'),
                        TO_DATE(:dt_fim, 'dd/mm/yyyy hh24:mi:ss')

                    ) returning nr_sequencia into :nr_seq_presc_procedimento`, 
    { 
        ":nr_prescricao": { "dir": oracledb.BIND_IN, "type": oracledb.NUMBER, "val": parseInt(nr_prescricao) },
        ":nr_sequencia": { "dir": oracledb.BIND_IN, "type": oracledb.NUMBER, "val": parseInt(nr_sequencia) },
        ":cd_procedimento": { "dir": oracledb.BIND_IN, "type": oracledb.NUMBER, "val": parseInt(cd_procedimento) },
        ":qt_procedimento": { "dir": oracledb.BIND_IN, "type": oracledb.NUMBER, "val": parseInt(qt_procedimento) },
        ":nm_usuario": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": nm_usuario.toString() },
        ":ie_origem_inf": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": ie_origem_inf.toString() },

        ":ie_cobra_paciente": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": ie_cobra_paciente.toString() },
        ":nr_seq_proc_interno": { "dir": oracledb.BIND_IN, "type": oracledb.NUMBER, "val": parseInt(nr_seq_proc_interno) },
        ":ie_executar_leito": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": ie_executar_leito.toString() },
        ":dt_prev_execucao": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": dt_prev_execucao.toString() },
        ":ie_exame_bloqueado": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": ie_exame_bloqueado.toString() },
        ":ie_horario_susp": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": ie_horario_susp.toString() },
        ":nm_usuario_nrec": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": nm_usuario_nrec.toString() },
        ":dt_atualizacao_nrec": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": dt_atualizacao_nrec.toString() },
        ":ie_acm": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": ie_acm.toString() },
        ":ie_urgencia": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": ie_urgencia.toString() },
        ":ie_via_aplicacao": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": ie_via_aplicacao.toString() },
        ":ie_aliquotado": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": ie_aliquotado.toString() },
        ":ie_amostra": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": ie_amostra.toString() },
        ":cd_unid_med_sangue": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": cd_unid_med_sangue.toString() },
        // ":qt_veloc_inf_hemo": { "dir": oracledb.BIND_IN, "type": oracledb.NUMBER, "val": parseInt(qt_veloc_inf_hemo) },
        ":ie_exige_liberacao": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": ie_exige_liberacao.toString() },
        ":ie_externo": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": ie_externo.toString() },
        ":ie_aberto": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": ie_aberto.toString() },
        ":ie_lavado_justificativa": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": ie_lavado_justificativa.toString() },
        ":ie_status_execucao": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": ie_status_execucao.toString() },
        ":ie_proced_bloqueado": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": ie_proced_bloqueado.toString() },
        ":ie_avisar_result": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": ie_avisar_result.toString() },
        ":ie_fenotipado": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": ie_fenotipado.toString() },

        ":ie_origem_proced": { "dir": oracledb.BIND_IN, "type": oracledb.NUMBER, "val": parseInt(ie_origem_proced) },
        ":ie_emite_mapa": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": ie_emite_mapa.toString() },
        ":ie_pendente_amostra": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": ie_pendente_amostra.toString() },
        ":ie_status_atend": { "dir": oracledb.BIND_IN, "type": oracledb.NUMBER, "val": parseInt(ie_status_atend) },
        ":nr_seq_solic_sangue": { "dir": oracledb.BIND_IN, "type": oracledb.NUMBER, "val": parseInt(nr_seq_solic_sangue) },
        ":ds_observacao": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": ds_observacao.toString() },
        ":ie_modificado": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": ie_modificado.toString() },
        ":ie_descricao_cirurgica": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": ie_descricao_cirurgica.toString() },
        ":ie_bolus": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": ie_bolus.toString() },
        ":ds_justificativa": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": ds_justificativa.toString() },
        ":ie_filtrado": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": ie_filtrado.toString() },
        ":ie_mostrar_web": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": ie_mostrar_web.toString() },
        ":nr_seq_derivado": { "dir": oracledb.BIND_IN, "type": oracledb.NUMBER, "val": parseInt(nr_seq_derivado) },
        ":cd_perfil_ativo": { "dir": oracledb.BIND_IN, "type": oracledb.NUMBER, "val": parseInt(cd_perfil_ativo) },
        // ":cd_intervalo": { "dir": oracledb.BIND_IN, "type": oracledb.NUMBER, "val": parseInt(cd_intervalo) },
        ":ie_anestesia": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": ie_anestesia.toString() },
        ":ie_imagem_pacs": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": ie_imagem_pacs.toString() },
        ":qt_vol_hemocomp": { "dir": oracledb.BIND_IN, "type": oracledb.NUMBER, "val": parseInt(qt_vol_hemocomp) },
        ":ie_alterar_horario": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": ie_alterar_horario.toString() },
        ":ie_unid_med_hemo": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": ie_unid_med_hemo.toString() },
        ":ie_autorizacao": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": ie_autorizacao.toString() },
        ":ds_horarios": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": ds_horarios.toString() },
        ":ie_se_necessario": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": ie_se_necessario.toString() },
        ":ie_util_hemocomponente": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": ie_util_hemocomponente.toString() },
        ":qt_tempo_infusao": { "dir": oracledb.BIND_IN, "type": oracledb.NUMBER, "val": parseInt(qt_tempo_infusao) },
        ":ie_tipo_proced": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": ie_tipo_proced.toString() },
        ":ie_aprovacao_execucao": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": ie_aprovacao_execucao.toString() },
        ":cd_setor_atendimento": { "dir": oracledb.BIND_IN, "type": oracledb.NUMBER, "val": parseInt(cd_setor_atendimento) },
        ":ie_suspenso": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": ie_suspenso.toString() },
        
        
        
        ":cd_motivo_baixa": { "dir": oracledb.BIND_IN, "type": oracledb.NUMBER, "val": parseInt(cd_motivo_baixa) },
        // ":qt_hora_infusao": { "dir": oracledb.BIND_IN, "type": oracledb.NUMBER, "val": parseInt(qt_hora_infusao) },
        ":ie_lavado": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": ie_lavado.toString() },
        ":ie_irradiado": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": ie_irradiado.toString() },
        ":dt_programada": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": dt_programada.toString() },
        ":dt_fim": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": dt_fim.toString() },
        ":nr_seq_presc_procedimento": { "dir": oracledb.BIND_OUT, "type": oracledb.STRING }
    },
    { 
        outFormat: oracledb.OBJECT,
        autoCommit: true
    })
    .then(result => {
        retorno.status = true
        retorno.dados = result.outBinds[':nr_seq_presc_procedimento'];
    })
    .finally(function(){
        db.close()
    })
    .catch(err => { 
        console.log(`Erro prescr_procedimento: ${err}`)
        retorno.status = false
        retorno.msg = `Erro prescr_procedimento`
    })
    return retorno
}

const procedureInserirHemoterapiaAntCPOE = async (nr_atendimento, cd_pessoa_fisica, nr_prescricao, cd_medico, nr_seq_presc_procedimento, nm_usuario, cd_perfil, cd_estabelecimento, dt_programada) => {
    const retorno = new Object;
    retorno.status = false

    const sql = `
    begin
        tasy.cpoe_inserir_hemoterapia_ant(
        nr_atendimento_p => :nr_atendimento,
        nr_atendimento_ant_p => :nr_atendimento_ant,
        cd_pessoa_fisica_p => :cd_pessoa_fisica,
        nr_prescricao_p => :nr_prescricao,
        nr_sequencia_p => :nr_seq_presc_procedimento,
        nm_usuario_p => :nm_usuario,
        cd_perfil_p => :cd_perfil,
        cd_estabelecimento_p => :cd_estabelecimento,
        nr_seq_transcricao_p => null,
        ie_item_alta_p => 'N',
        ie_prescritor_aux_p => 'N',
        cd_medico_p	=> :cd_medico_p,
        ie_retrogrado_p => 'S',
        dt_inicio_p => to_date(:dt_inicio_p, 'dd/mm/yyyy hh24:mi:ss'),
        nr_seq_pepo_p => null,
        nr_cirurgia_p => null,
        nr_cirurgia_patologia_p => null,
        nr_seq_agenda_p => null,
        nr_seq_conclusao_apae_p=> null,
        ie_futuro_p => 'S',
        nr_seq_cpoe_order_unit_p => null,
        nr_seq_item_gerado_p => :out_nr_seq_item_gerado_p
        );
    end;
    `;

    const db = await oracledb.getConnection();

    await db.execute(sql,
        {
            ":nr_atendimento":              { "dir": oracledb.BIND_IN, "type": oracledb.NUMBER, "val": nr_atendimento },
            ":nr_atendimento_ant":          { "dir": oracledb.BIND_IN, "type": oracledb.NUMBER, "val": nr_atendimento },
            ":cd_pessoa_fisica":            { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": cd_pessoa_fisica.toString() },
            ":nr_prescricao":               { "dir": oracledb.BIND_IN, "type": oracledb.NUMBER, "val": nr_prescricao },
            ":nr_seq_presc_procedimento":   { "dir": oracledb.BIND_IN, "type": oracledb.NUMBER, "val": Number(nr_seq_presc_procedimento) },
            ":nm_usuario":                  { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": 'daniel.fonseca' },
            ":dt_inicio_p":                 { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": dt_programada.toString() },
            ":cd_perfil":                   { "dir": oracledb.BIND_IN, "type": oracledb.NUMBER, "val": cd_perfil },
            ":cd_medico_p":                 { "dir": oracledb.BIND_IN, "type": oracledb.NUMBER, "val": Number(cd_medico) },
            ":cd_estabelecimento":          { "dir": oracledb.BIND_IN, "type": oracledb.NUMBER, "val": cd_estabelecimento },
            ":out_nr_seq_item_gerado_p":    { "dir": oracledb.BIND_OUT, "type": oracledb.STRING }
        },
        {
            outFormat: oracledb.OBJECT, autoCommit: true
        } 
    )
    .then(result => {
        // console.log('DANIEL >>> ', result);
        retorno.status = true
        retorno.nr_seq_cpoe_hemoterapia = result.outBinds[':out_nr_seq_item_gerado_p']
    })
    .finally(() => db.close())
    .catch(err => {
        console.error('Erro em procedureInserirHemoterapiaAntCPOE aaaa > ', err)
        retorno.dados = [];
        retorno.msg = `Erro ao executar a procedure procedureInserirHemoterapiaAntCPOE > ${err}`
        retorno.status = false
    })

    return retorno;
}

async function updateCpoe(nr_seq_cpoe_hemoterapia){
    retorno = {
        status: false, 
        msg: '',
    }

    const db = await oracledb.getConnection();
    await db.execute(`UPDATE tasy.cpoe_hemoterapia
                        SET  ie_futuro = 'N'
                        WHERE 1 = 1 
                            AND	nr_sequencia = :nr_seq_cpoe_hemoterapia`, 
    { 
        ":nr_seq_cpoe_hemoterapia": { "dir": oracledb.BIND_IN, "type": oracledb.NUMBER, "val": parseInt(nr_seq_cpoe_hemoterapia) }
    },
    { 
        outFormat: oracledb.OBJECT,
        autoCommit: true
    })
    .then(result => {
        retorno.status = true,
        retorno.msg = 'Sucesso ao dar update na cpoe'
        retorno.dados = result.rows
    })
    .finally(function(){
        db.close()
    })
    .catch(err => { 
        console.log(`Erro ao dar update na cpoe: ${err}`)
        retorno.msg = `Erro ao dar update na cpoe`
    })
    return retorno
}

async function procedureLiberarHemoterapia(cd_estabelecimento_p, cd_setor_atendimento_p, cd_perfil_p, nr_atendimento_p, itens_liberar_p, nm_usuario_p, cd_pessoa_fisica_p, cd_medico_p, nr_prescricao_p ){
    let retorno = {
        status: false, 
        msg: '',
    }

    const db = await oracledb.getConnection();
    await db.execute(`  begin
                            CPOE_Liberacao(
                                cd_estabelecimento_p=> :cd_estabelecimento_p,
                                cd_setor_atendimento_p=> :cd_setor_atendimento_p,
                                cd_perfil_p=> :cd_perfil_p,
                                nr_atendimento_p=> :nr_atendimento_p,
                                itens_liberar_p=> :itens_liberar_p,
                                nm_usuario_p=> :nm_usuario_p,
                                ds_itens_liberados_p=> :ds_itens_liberados,
                                ie_inconsistencia_out_p=> :ie_inconsistencia_out,
                                cd_pessoa_fisica_p=> :cd_pessoa_fisica_p,
                                itens_recalcular_p=> '',
                                ie_interv_farmacia_p=> 'N',
                                ie_liberacao_ang_p=> 'N',
                                ie_motivo_prescr_p=> '',
                                cd_medico_p=> :cd_medico_p,
                                nr_prescricao_out_p=> :nr_prescricao_out,
                                ds_lista_proc_susp_out_p=> :ds_lista_proc_susp_out,
                                ds_inconsist_lib_out_p=> :ds_inconsist_lib_out,
                                nr_prescricao_p=> :nr_prescricao_p,
                                nr_seq_consulta_oft_p=> null,
                                nr_seq_pend_pac_acao_p=> null,
                                ie_adep_p=> 'S',
                                nr_seq_revalidation_rule_p=> null,
                                cd_departamento_p=> null,
                                ds_prescr_geradas_full_p=> :ds_prescr_geradas_full,
                                nm_usuario_validacao_p=> :nm_usuario_p,
                                ie_copia_diaria_p=> 'N',
                                ie_prescr_adep_p=> ''
                            );
                            end;`, 
    { 
        ":cd_estabelecimento_p": { "dir": BIND_IN, "type": oracledb.NUMBER, "val": parseInt(cd_estabelecimento_p) },
        ":cd_setor_atendimento_p": { "dir": BIND_IN, "type": oracledb.NUMBER, "val": parseInt(cd_setor_atendimento_p) },
        ":cd_perfil_p": { "dir": BIND_IN, "type": oracledb.NUMBER, "val": parseInt(cd_perfil_p) },
        ":nr_atendimento_p": { "dir": BIND_IN, "type": oracledb.NUMBER, "val": parseInt(nr_atendimento_p) },
        ":itens_liberar_p": { "dir": BIND_IN, "type": oracledb.STRING, "val": itens_liberar_p.toString() },
        ":nm_usuario_p": { "dir": BIND_IN, "type": oracledb.STRING, "val": nm_usuario_p.toString() },
        ":cd_pessoa_fisica_p": { "dir": BIND_IN, "type": oracledb.STRING, "val": cd_pessoa_fisica_p.toString() },
        ":cd_medico_p": { "dir": BIND_IN, "type": oracledb.STRING, "val": cd_medico_p.toString() },
        ":nr_prescricao_p": { "dir": BIND_IN, "type": oracledb.NUMBER, "val": parseInt(nr_prescricao_p) },

        ":nr_prescricao_out": { "dir": BIND_OUT, "type": oracledb.NUMBER },
        ":ds_lista_proc_susp_out": { "dir": BIND_OUT, "type": oracledb.STRING },
        ":ds_inconsist_lib_out": { "dir": BIND_OUT, "type": oracledb.STRING },
        ":ds_itens_liberados": { "dir": BIND_OUT, "type": oracledb.STRING },
        ":ds_prescr_geradas_full": { "dir": BIND_OUT, "type": oracledb.STRING },
        ":ie_inconsistencia_out": { "dir": BIND_OUT, "type": oracledb.STRING }
    },
    { 
        outFormat: oracledb.OBJECT,
        autoCommit: true
    })
    .then(result => {
        retorno.status = true,
        retorno.msg = 'Sucesso ao liberar hemoterapia'
        retorno.nr_prescricao_out = result.outBinds[':nr_prescricao_out']
        retorno.st = 200
    })
    .finally(function(){
        db.close()
    })
    .catch(err => { 
        console.log(`Erro ao liberar hemoterapia: ${err}`)
        retorno.msg = `ao liberar hemoterapia`
        retorno.st = 400
    })
    return retorno
}


async function verificarProcedimentos(cdPessoaFisica, value, nmUsuario){
    let retorno = {
        cdProcedimento: value,
        realizados: []
    };

    const db = await oracledb.getConnection();
    await db
        .execute(
            `select 
            pm.nr_prescricao,  
            pm.nr_atendimento,
            dt_aprovacao,
            rl.DT_ATUALIZACAO,
            rl.DT_COLETA,
            rl.NM_USUARIO,
            rl.NR_SEQUENCIA,
            rl.NR_SEQ_EXAME
            --rl.* 
            from tasy.prescr_medica pm
            join tasy.result_laboratorio rl on (rl.nr_prescricao = pm.nr_prescricao)
            join tasy.exame_lab_resultado elr on (elr.nr_prescricao = pm.nr_prescricao)
            join tasy.exame_lab_result_item elri on (elr.nr_seq_resultado = elri.nr_seq_resultado and elri.nr_seq_prescr = rl.nr_seq_prescricao)
            where 1=1
                and pm.cd_pessoa_fisica = :CD_PESSOA_FISICA 
                and rl.ie_origem_proced =  8
                and rl.cd_procedimento = :CD_PROCEDIMENTO
                and dt_aprovacao is not null
            order by 3`, 
            {
                ':CD_PESSOA_FISICA': {dir: oracledb.BIND_IN, type: oracledb.NUMBER, val: parseInt(cdPessoaFisica)},
                ':CD_PROCEDIMENTO': {dir: oracledb.BIND_IN, type: oracledb.NUMBER, val: parseInt(value)},
            }, {
                outFormat: oracledb.OBJECT,
                autoCommit: true,
            },
        )
        .then(result => {
            retorno.realizados = result.rows
            // (retorno.status = true), (retorno.dados = result.rows);
        })
        .finally(function() {
            db.close();
        })
        .catch(err => {
            console.log(`Erro ao obter exame padrão: ${err}`);
            retorno.msg = `Erro ao obter exame padrão`;
        });
    return retorno;
}


async function examePadrao(cdMedico, nrSeqGrupo){
    let retorno = {
        status: false,
    };

    console.log({ cdMedico, nrSeqGrupo });

    const db = await oracledb.getConnection();
    await db
        .execute(
            `SELECT nvl(nvl(ds_reduzida_exame,ds_exame), '') ds_exame,
                        nr_sequencia,
                        nvl(ie_lado,'N') ie_lado,
                        rownum as id,
                        nvl(IE_QUEST_QUANTIDADE,'N') IE_QUEST_QUANTIDADE,
                        nvl(IE_QUESTIONA_DATA,'N') ie_questiona_data,
                        nvl(IE_QUEST_JUSTIF,'N') ie_quest_justif,
                        nvl(DS_JUSTIFICATIVA,'') ds_justificativa,
                        nvl(QT_EXAME,0) qt_exame,
                        nvl(nr_proc_interno,0) nr_proc_interno
                    FROM	tasy.med_exame_padrao
                    WHERE (('U'   = 'U'
                        and cd_medico   = :CD_MEDICO)
                        or ('U'   = 'I'
                        and ((cd_estabelecimento  = 1
                        and cd_medico   is null)
                        or (cd_estabelecimento  is null
                        and cd_medico   is null))))
                        and nr_seq_grupo   = :NR_SEQ_GRUPO
                        and ie_pedido   = 'S'
                        and nvl(nvl(ds_reduzida_exame,ds_exame), '') is not null
                        and tasy.obter_se_perfil_exame(nr_sequencia,tasy.wheb_usuario_pck.get_cd_perfil) = 'S'
                        and tasy.obter_se_espec_exame(nr_sequencia,:CD_MEDICO)    = 'S'
                        and  nvl(ie_situacao,'A') = 'A'
                    ORDER BY nr_seq_apresent`, {
                ':CD_MEDICO': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: cdMedico,
                },
                ':NR_SEQ_GRUPO': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.NUMBER,
                    val: Number(nrSeqGrupo),
                },
            }, {
                outFormat: oracledb.OBJECT,
                autoCommit: true,
            },
        )
        .then(result => {
            (retorno.status = true), (retorno.dados = result.rows);
        })
        .finally(function() {
            db.close();
        })
        .catch(err => {
            console.log(`Erro ao obter exame padrão: ${err}`);
            retorno.status = false;
            retorno.msg = `Erro ao obter exame padrão`;
        });
    return retorno;
}

async function examePadraoInstituicao(cdMedico, nrSeqGrupo) {
    let retorno = {
        status: false,
    };

    const db = await oracledb.getConnection();
    await db
        .execute(
            `SELECT nvl(nvl(ds_reduzida_exame,ds_exame), '') ds_exame,
                        nr_sequencia,
                        nvl(ie_lado,'N') ie_lado,
                        nvl(IE_QUEST_QUANTIDADE,'N') IE_QUEST_QUANTIDADE,
                        nvl(IE_QUESTIONA_DATA,'N') ie_questiona_data,
                        nvl(IE_QUEST_JUSTIF,'N') ie_quest_justif,
                        nvl(DS_JUSTIFICATIVA,'') ds_justificativa,
                        nvl(QT_EXAME,0) qt_exame,
                        nvl(1,0) nr_proc_interno
                    FROM	tasy.med_exame_padrao
                    WHERE (('I'   = 'U'
                    and cd_medico   = :CD_MEDICO)
                    or ('I'   = 'I'
                    and ((cd_estabelecimento  = 1
                    and cd_medico   is null)
                    or (cd_estabelecimento  is null
                    and cd_medico   is null))))
                    and nr_seq_grupo   = :NR_SEQ_GRUPO
                    and ie_pedido   = 'S'
                    and nvl(nvl(ds_reduzida_exame,ds_exame), '') is not null
                    and tasy.obter_se_perfil_exame(nr_sequencia,tasy.wheb_usuario_pck.get_cd_perfil) = 'S'
                    and tasy.obter_se_espec_exame(nr_sequencia, :CD_MEDICO)    = 'S'
                    and  nvl(ie_situacao,'A') = 'A'
                    ORDER BY nr_seq_apresent`, {
                ':CD_MEDICO': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: cdMedico,
                },
                ':NR_SEQ_GRUPO': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.NUMBER,
                    val: Number(nrSeqGrupo),
                },
            }, {
                outFormat: oracledb.OBJECT,
                autoCommit: true,
            },
        )
        .then(result => {
            (retorno.status = true), (retorno.dados = result.rows);
        })
        .finally(function() {
            db.close();
        })
        .catch(err => {
            console.log(`Erro ao obter exame padrão: ${err}`);
            retorno.status = false;
            retorno.msg = `Erro ao obter exame padrão`;
        });
    return retorno;
}

async function apagarReceita(nrSeqReceita) {
    let retorno = {
        status: false,
        msg: '',
    };

    const db = await oracledb.getConnection();
    await db
        .execute(
            `DELETE FROM tasy.MED_RECEITA
                        WHERE 1 = 1 
                        AND	NR_SEQUENCIA = :NR_SEQ_RECEITA`, {
                ':NR_SEQ_RECEITA': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.NUMBER,
                    val: nrSeqReceita,
                },
            }, {
                outFormat: oracledb.OBJECT,
                autoCommit: true,
            },
        )
        .then(result => {
            if (result.rowsAffected > 0) {
                (retorno.status = true),
                (retorno.msg = 'Sucesso ao apagar receita');
            } else {
                retorno.msg = 'Erro ao apagar receita';
            }
        })
        .finally(function() {
            db.close();
        })
        .catch(err => {
            console.log(`Erro ao apagar receita: ${err}`);
            retorno.msg = `Erro ao apagar receita`;
        });
    return retorno;
}

async function liberarReceita(nrSeqReceita) {
    retorno = {
        status: false,
        msg: '',
    };

    const db = await oracledb.getConnection();
    await db
        .execute(
            `begin
                        tasy.LIBERAR_RECEITA_PAC(:NR_SEQ_RECEITA);
                      end;`, {
                ':NR_SEQ_RECEITA': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.NUMBER,
                    val: nrSeqReceita,
                },
            }, {
                outFormat: oracledb.OBJECT,
                autoCommit: true,
            },
        )
        .then(result => {
            (retorno.status = true),
            (retorno.msg = 'Sucesso ao liberar receita');
        })
        .finally(function() {
            db.close();
        })
        .catch(err => {
            console.log(`Erro ao liberar receita: ${err}`);
            retorno.msg = `Erro ao liberar receita`;
        });
    return retorno;
}

async function buscarSolicitacoesExamePaciente(cdPessoaFisica, nmUsuario) {
    let retorno = {
        status: false,
        msg: '',
        dados: [],
    };

    const db = await oracledb.getConnection();
    // 11111111111111111111111111111111
    await db.execute(`  SELECT /*+ first_rows(100) */ a.* ,
                            substr(ds_cid,1,255) DS_CID_GRID,
                            substr(ds_diagnostico_cid,1,255) DS_DIAGNOSTICO_CID_GRID,
                            substr(tasy.obter_nome_pf(CD_PROFISSIONAL),1,80) NM_PROFISSIONAL,
                            tasy.OBTER_DATA_ASSINATURA_DIGITAL(nr_seq_assinatura) DT_ASSINATURA,
                            tasy.OBTER_DATA_ASSINATURA_DIGITAL(nr_seq_assinat_inativacao) DT_ASSINATURA_INATIVACAO,
                            SUBSTR(tasy.obter_pendencia_assinatura(tasy.wheb_usuario_pck.get_nm_usuario,nr_sequencia,'PEE'),1,1) IE_PENDENCIA_ASSINATURA
                        FROM	tasy.PEDIDO_EXAME_EXTERNO a
                        WHERE 1 = 1 
                        AND	cd_pessoa_fisica = :CD_PESSOA_FISICA 
                        AND	((dt_liberacao is not Null) OR (nm_usuario = :NM_USUARIO))
                        ORDER BY DT_SOLICITACAO desc`, 
    { 
        ":CD_PESSOA_FISICA": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": cdPessoaFisica },
        ":NM_USUARIO": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": nmUsuario },
    },
    { 
        outFormat: oracledb.OBJECT,
    })
    .then(result => {
        retorno.status = true
        retorno.msg = 'Sucesso ao obter lista de solicitacoes'
        retorno.dados = result.rows
    })
    .finally(function(){
        db.close()
    })
    .catch(err => { 
        console.log(`Erro ao obter lista de solicitacoes: ${err}`)
        retorno.status = false
        retorno.msg = `Erro ao obter lista de solicitacoes`
    })
    return retorno
}


async function buscarSolicitacoesExamePaciente2(cdPessoaFisica, nmUsuario){
    let retorno = {
        status: false, 
        msg: '',
        dados: []
    }


    const db = await oracledb.getConnection();
    // 222222222222222222222222222222222
    await db.execute(`SELECT /*+ first_rows(100) */ a.* ,
                            substr(ds_cid,1,255) DS_CID_GRID,
                            substr(ds_diagnostico_cid,1,255) DS_DIAGNOSTICO_CID_GRID,
                            substr(tasy.obter_nome_pf(CD_PROFISSIONAL),1,80) NM_PROFISSIONAL,
                            tasy.OBTER_DATA_ASSINATURA_DIGITAL(nr_seq_assinatura) DT_ASSINATURA,
                            tasy.OBTER_DATA_ASSINATURA_DIGITAL(nr_seq_assinat_inativacao) DT_ASSINATURA_INATIVACAO,
                            SUBSTR(tasy.obter_pendencia_assinatura(tasy.wheb_usuario_pck.get_nm_usuario,nr_sequencia,'PEE'),1,1) IE_PENDENCIA_ASSINATURA
                        FROM	tasy.PEDIDO_EXAME_EXTERNO a
                        WHERE 1 = 1 
                        AND	cd_pessoa_fisica = :CD_PESSOA_FISICA 
                        AND	((dt_liberacao is not Null) OR (nm_usuario = :NM_USUARIO))
                        ORDER BY DT_SOLICITACAO desc`, 
    { 
        ":CD_PESSOA_FISICA": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": cdPessoaFisica },
        ":NM_USUARIO": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": nmUsuario },
    },
    { 
        outFormat: oracledb.OBJECT,
    })
    .then(result => {
        retorno.status = true
        retorno.msg = 'Sucesso ao obter lista de solicitacoes'
        retorno.dados = result.rows
    })
    .finally(function(){
        db.close()
    })
    .catch(err => { 
        console.log(`Erro ao obter lista de solicitacoes: ${err}`)
        retorno.status = false
        retorno.msg = `Erro ao obter lista de solicitacoes`
    })
    return retorno
}

async function buscarExameParaSolicitacao(descricaoExame){
    let retorno = {
        status: false, 
        msg: '',
        dados: []
    }

    descricaoExame = `%${descricaoExame}%`;

    const db = await oracledb.getConnection();
    await db
        .execute(
            `SELECT cd_doenca_cid cd_doenca,
                        ds_doenca_cid,
                        ie_situacao,
                        ie_cad_interno,
                        ie_codificacao,
                        ds_categoria_cid
                    FROM	tasy.cid_doenca_v
                    WHERE (tasy.obter_se_versao_cid_vigente(cd_doenca_cid,tasy.obter_data_referencia_proc(null))) = 'S'
                        
                        AND	NVL(IE_SITUACAO,'A') = 'A' 
                        AND	IE_TUMOR <> 'X' 
                        AND	NVL(IE_CAD_INTERNO,'N') = 'N' 
                        AND UPPER(CD_DOENCA) LIKE UPPER(:DESCRICAO_EXAME) OR UPPER(DS_DOENCA_CID) LIKE UPPER(:DESCRICAO_EXAME) OR UPPER(DS_CATEGORIA_CID) LIKE UPPER(:DESCRICAO_EXAME)
                    ORDER BY 2
                    FETCH FIRST 5 ROWS ONLY`, {
                ':DESCRICAO_EXAME': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: descricaoExame.toString(),
                },
            }, {
                outFormat: oracledb.OBJECT,
            },
        )
        .then(result => {
            // retorno.status = true;
            // retorno.msg = 'Sucesso ao obter lista de exames para solicitação';
            retorno = result.rows;
        })
        .finally(function() {
            db.close();
        })
        .catch(err => {
            console.log(
                `Erro ao obter lista de exames para solicitação: ${err}`,
            );
            retorno.status = false;
            retorno.msg = `Erro ao obter lista de exames para solicitação`;
        });
    return retorno;
}

async function salvarSolicitacaoExame(DS_JUSTIFICATIVA, CD_PROFISSIONAL, CD_DOENCA, IE_NIVEL_ATENCAO, NM_USUARIO_NREC, DS_DADOS_CLINICOS, NM_USUARIO, CD_PERFIL_ATIVO, IE_SITUACAO, CD_PESSOA_FISICA, DS_SOLICITACAO, DS_SOLICITACAO_MATERIAL_CIRURGICO, NR_ATENDIMENTO, IE_FICHA_UNIMED){
    let retorno = {
        status: false,
        msg: '',
    };

    if (!DS_SOLICITACAO) {
        DS_SOLICITACAO = '';
    }

    const db = await oracledb.getConnection();
    await db
        .execute(
            `INSERT INTO tasy.PEDIDO_EXAME_EXTERNO ( 
                        DS_JUSTIFICATIVA, 
                        IE_RN,
                        CD_PROFISSIONAL, 
                        DS_EXAME_ANT,
                        CD_DOENCA,
                        IE_NIVEL_ATENCAO,
                        DT_SOLICITACAO,
                        DS_CID,
                        NM_USUARIO_NREC,
                        DS_DADOS_CLINICOS,
                        DT_ATUALIZACAO_NREC,
                        NM_USUARIO,
                        CD_PERFIL_ATIVO,
                        CD_AUTORIZACAO,
                        NR_SEQUENCIA,
                        DT_ATUALIZACAO,
                        IE_SITUACAO,
                        CD_PESSOA_FISICA,
                        DS_SOLICITACAO,
                        DS_DIAGNOSTICO_CID,
                        NR_ATENDIMENTO,
                        IE_FICHA_UNIMED )
                        VALUES ( 
                            :DS_JUSTIFICATIVA,
                        null,
                        :CD_PROFISSIONAL,
                        null,
                        :CD_DOENCA,
                        :IE_NIVEL_ATENCAO,
                        sysdate,
                        null,
                        :NM_USUARIO_NREC,
                        :DS_DADOS_CLINICOS,
                        sysdate,
                        :NM_USUARIO,
                        :CD_PERFIL_ATIVO,
                        null,
                        tasy.PEDIDO_EXAME_EXTERNO_seq.nextval,
                        sysdate,
                        :IE_SITUACAO,
                        :CD_PESSOA_FISICA,
                        :DS_SOLICITACAO,
                        :DS_DIAGNOSTICO_CID,
                        :NR_ATENDIMENTO,
                        :IE_FICHA_UNIMED)
    `, 
    { 
        ":DS_JUSTIFICATIVA": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": DS_JUSTIFICATIVA },
        ":CD_PROFISSIONAL": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": CD_PROFISSIONAL.toString() },
        ":CD_DOENCA": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": CD_DOENCA },
        ":IE_NIVEL_ATENCAO": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": IE_NIVEL_ATENCAO },
        ":NM_USUARIO_NREC": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": NM_USUARIO_NREC },
        ":DS_DADOS_CLINICOS": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": DS_DADOS_CLINICOS },
        ":NM_USUARIO": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": NM_USUARIO },
        ":CD_PERFIL_ATIVO": { "dir": oracledb.BIND_IN, "type": oracledb.NUMBER, "val": CD_PERFIL_ATIVO },
        ":IE_SITUACAO": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": IE_SITUACAO },
        ":CD_PESSOA_FISICA": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": CD_PESSOA_FISICA.toString() },
        ":DS_SOLICITACAO": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": DS_SOLICITACAO },
        ":DS_DIAGNOSTICO_CID": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": DS_SOLICITACAO_MATERIAL_CIRURGICO },
        ":NR_ATENDIMENTO": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": NR_ATENDIMENTO.toString() },
        ":IE_FICHA_UNIMED": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": IE_FICHA_UNIMED },
    },
    { 
        outFormat: oracledb.OBJECT,
        autoCommit: true
    })
    .then(result => {
        if(result.rowsAffected > 0){
            retorno.status = true
            retorno.msg = 'Sucesso ao inserir solicitação de exame'
        }
    })
    .finally(function(){
        db.close()
    })
    .catch(err => { 
        console.log(`Erro ao inserir solicitação de exame: ${err}`)
        retorno.status = false
        retorno.msg = `Erro ao inserir solicitação de exame`
    })
    return retorno
}


async function salvarSolicitacaoExameJustificativa( DS_JUSTIFICATIVA, NR_SEQUENCIA ){
    let retorno = {
        status: false,
        msg: '',
    };

    const db = await oracledb.getConnection();
    await db
        .execute(
            `UPDATE tasy.PEDIDO_EXAME_EXTERNO
            SET   
                DS_JUSTIFICATIVA = :DS_JUSTIFICATIVA 
            WHERE 1 = 1 
                AND	NR_SEQUENCIA = :NR_SEQUENCIA
            `, 
    { 
        ":DS_JUSTIFICATIVA": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": DS_JUSTIFICATIVA.toString() },
        ":NR_SEQUENCIA": { "dir": oracledb.BIND_IN, "type": oracledb.NUMBER, "val": NR_SEQUENCIA },
    },
    { 
        outFormat: oracledb.OBJECT,
        autoCommit: true
    })
    .then(result => {
        if(result.rowsAffected > 0){
            retorno.status = true
            retorno.msg = 'Sucesso ao inserir solicitação de exame'
        }
    })
    .finally(function(){
        db.close()
    })
    .catch(err => { 
        console.log(`Erro ao inserir solicitação de exame: ${err}`)
        retorno.status = false
        retorno.msg = `Erro ao inserir solicitação de exame`
    })
    return retorno
}

async function liberarSolicitacaoExame(nrSeqSolicitacao, nmUsuario) {
    retorno = {
        status: false,
        msg: '',
    };

    const db = await oracledb.getConnection();
    await db
        .execute(
            `  begin
                            tasy.LIBERAR_INFORMACAO(
                                QT_CHAVE_P => :NR_SEQ_SOLICITACAO,
                                NM_CHAVE_P => 'NR_SEQUENCIA',
                                NM_USUARIO_P => :NM_USUARIO, 
                                NM_TABELA_P => 'PEDIDO_EXAME_EXTERNO');
                        end;`, {
                ':NR_SEQ_SOLICITACAO': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: nrSeqSolicitacao.toString(),
                },
                ':NM_USUARIO': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: nmUsuario,
                },
            }, {
                outFormat: oracledb.OBJECT,
                autoCommit: true,
            },
        )
        .then(result => {
            (retorno.status = true),
            (retorno.msg = 'Sucesso ao liberar solicitação de exame');
        })
        .finally(function() {
            db.close();
        })
        .catch(err => {
            console.log(`Erro ao liberar solicitação de exame: ${err}`);
            retorno.msg = `Erro ao liberar solicitação de exame`;
        });
    return retorno;
}

async function buscarItemSolicitacaoExamePaciente(nrSeqPedido) {
    let retorno = {
        status: false,
        msg: '',
        dados: [],
    };

    const sql = `
                select distinct 
                case
                    when
                        (select ds_material_exame from tasy.material_exame_lab where 1 = 1 and cd_material_exame = b.cd_material_exame) is not null
                            then (select ds_material_exame from tasy.material_exame_lab where 1 = 1 and cd_material_exame = b.cd_material_exame)
                    else '-'
                end as ds_material_exame,
                b.nr_sequencia, 
                p.CD_TIPO_PROCEDIMENTO,
                case 
                    when p.CD_TIPO_PROCEDIMENTO = 20 then 'LABORATORIAL'
                    when p.CD_TIPO_PROCEDIMENTO = 2 then 'ULTRASONOGRAFIA'
                    when p.CD_TIPO_PROCEDIMENTO = 33 then 'CARDIOLOGIA'    
                    when p.CD_TIPO_PROCEDIMENTO = 92  then 'ENDOSCOPIA'    
                    when p.CD_TIPO_PROCEDIMENTO = 34 then 'RAIO X '  
                    when p.CD_TIPO_PROCEDIMENTO = 3  then 'TOMOGRAFIA '  
                    when p.CD_TIPO_PROCEDIMENTO = 4 then 'RESSONANCIA '
                    when p.CD_TIPO_PROCEDIMENTO = 0  then 'SEM GRUPO' 
                    else 'OUTROS EXAMES'
                end ds_grupo,
                substr(tasy.Obter_Med_Exame_Externo(b.nr_sequencia),1,255) DS_EXAME,
                substr(tasy.obter_descricao_procedimento(b.CD_PROCEDIMENTO,b.IE_ORIGEM_PROCED),1,240) DS_PROCEDIMENTO,
                b.*
            from
                tasy.med_grupo_exame                d,
                tasy.med_exame_padrao               c,
                tasy.exame_laboratorio              e,
                tasy.pedido_exame_externo_item      b,
                tasy.procedimento                   p,
                tasy.pedido_exame_externo           a,
                tasy.exame_lab_material             lm
            where 1 = 1
                and a.nr_sequencia      = :NR_SEQ_PEDIDO
                and a.nr_sequencia      = b.nr_seq_pedido
                and b.nr_seq_exame_lab  = e.nr_seq_exame(+) 
                and b.nr_seq_exame      = c.nr_sequencia(+)
                and c.nr_seq_grupo      = d.nr_sequencia(+)
                and p.IE_ORIGEM_PROCED  = 8
                and p.cd_procedimento   = b.cd_procedimento
            order by p.CD_TIPO_PROCEDIMENTO`;

    const db = await oracledb.getConnection();
    await db
        .execute(
            sql, {
                ':NR_SEQ_PEDIDO': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: nrSeqPedido,
                },
            }, {
                outFormat: oracledb.OBJECT,
            },
        )
        .then(result => {
            retorno.status = true;
            retorno.msg = 'Sucesso ao obter itens solicitacao';
            retorno.dados = result.rows;
        })
        .finally(function() {
            db.close();
        })
        .catch(err => {
            console.log(`Erro ao obter itens solicitacao: ${err}`);
            retorno.status = false;
            retorno.msg = `Erro ao obter itens solicitacao`;
        });
    return retorno;
}


async function buscarExamesParaSolicitacao(cdMedico){
    retorno = {
        status: false,
        msg: '',
    };

    const db = await oracledb.getConnection();
    await db
        .execute(
            `SELECT nvl(nvl(ds_reduzida_exame,ds_exame), '') ds_exame,
                        nr_sequencia,
                        nvl(ie_lado,'N') ie_lado,
                        nvl(IE_QUEST_QUANTIDADE,'N') IE_QUEST_QUANTIDADE,
                        nvl(IE_QUESTIONA_DATA,'N') ie_questiona_data,
                        nvl(IE_QUEST_JUSTIF,'N') ie_quest_justif,
                        nvl(DS_JUSTIFICATIVA,'') ds_justificativa,
                        nvl(QT_EXAME,0) qt_exame,
                        nvl(nr_proc_interno,0) nr_proc_interno,
                        'Lab' as tipo,
                        1  as tipo_exame
                    FROM	tasy.med_exame_padrao
                    WHERE (('I'   = 'U'
                    and cd_medico   = :CD_MEDICO)
                    or ('I'   = 'I'
                    and ((cd_estabelecimento  = 1
                    and cd_medico   is null)
                    or (cd_estabelecimento  is null
                    and cd_medico   is null))))
                    and nr_seq_grupo   = 340
                    and ie_pedido   = 'S'
                    and nvl(nvl(ds_reduzida_exame,ds_exame), '') is not null
                    and tasy.obter_se_perfil_exame(nr_sequencia,tasy.wheb_usuario_pck.get_cd_perfil) = 'S'
                    and tasy.obter_se_espec_exame(nr_sequencia, :CD_MEDICO)    = 'S'
                    and  nvl(ie_situacao,'A') = 'A'         
                    union all          
                    SELECT nvl(nvl(ds_reduzida_exame,ds_exame), '') ds_exame,              
                        nr_sequencia,
                        nvl(ie_lado,'N') ie_lado,
                        nvl(IE_QUEST_QUANTIDADE,'N') IE_QUEST_QUANTIDADE,
                        nvl(IE_QUESTIONA_DATA,'N') ie_questiona_data,
                        nvl(IE_QUEST_JUSTIF,'N') ie_quest_justif,
                        nvl(DS_JUSTIFICATIVA,'') ds_justificativa,
                        nvl(QT_EXAME,0) qt_exame,
                        nvl(nr_proc_interno,0) nr_proc_interno,
                        'IMG' as tipo,
                        2 as tipo_exame
                    FROM	tasy.med_exame_padrao
                    WHERE (('I'   = 'U'
                    and cd_medico   = :CD_MEDICO)
                    or ('I'   = 'I'
                    and ((cd_estabelecimento  = 1
                    and cd_medico   is null)
                    or (cd_estabelecimento  is null
                    and cd_medico   is null))))
                    and nr_seq_grupo   = 341
                    and ie_pedido   = 'S'
                    and nvl(nvl(ds_reduzida_exame,ds_exame), '') is not null
                    --and tasy.obter_se_perfil_exame(nr_sequencia,tasy.wheb_usuario_pck.get_cd_perfil) = 'S'
                    and tasy.obter_se_perfil_exame(nr_sequencia, 2339) = 'S'
                    and tasy.obter_se_espec_exame(nr_sequencia, :CD_MEDICO)    = 'S'
                    and  nvl(ie_situacao,'A') = 'A'`, {
                ':CD_MEDICO': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: cdMedico,
                },
            }, {
                outFormat: oracledb.OBJECT,
                autoCommit: true,
            },
        )
        .then(result => {
            const listaExames = result.rows;
            let examesLaboratoriais = [];
            let examesNaoLaboratoriais = [];

            listaExames.map(item => {
                if (item.TIPO_EXAME == 1) {
                    examesLaboratoriais.push(item);
                } else {
                    examesNaoLaboratoriais.push(item);
                }
            });

            (retorno.status = true),
            (retorno.msg =
                'Sucesso ao obter lista de exames para solicitacao');
            retorno.dados = {
                examesLaboratoriais,
                examesNaoLaboratoriais,
            };
        })
        .finally(function() {
            db.close();
        })
        .catch(err => {
            console.log(`Erro ao salvar item: ${err}`);
            retorno.msg = `Erro ao salvar item`;
        });
    return retorno;
}

async function salvarItemSolicitacaoExame(nrSeqPedido, nmUsuario, nrSeqExame, qt_exame) {
    let retorno = {
        status: false,
        msg: '',
    };

    console.log("se inseriu, deu certo porra")

    const db = await oracledb.getConnection();
    await db
    ///////inserir pedido de exames pelo exame lab
        .execute(
            `  begin
                            tasy.INSERIR_PEDIDO_EXAME(
                                QT_EXAME_P => :QT_EXAME,
                                CD_TOPOGRAFIA_P => '',  
                                NR_SEQ_PEDIDO_P => :NR_SEQ_PEDIDO,
                                NM_USUARIO_P => :NM_USUARIO, 
                                NR_SEQ_EXAME_P => :NR_SEQ_EXAME,
                                NR_SEQ_DENTE_P => '',
                                DT_EXECUCAO_P => '',
                                DS_JUSTIFICATIVA_P => '',
                                IE_LADO_P => '',
                                DS_FRASE_P => '');
                        end;`, {
                ':QT_EXAME': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.NUMBER,
                    val: qt_exame,
                },
                ':NR_SEQ_PEDIDO': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.NUMBER,
                    val: nrSeqPedido,
                },
                ':NM_USUARIO': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: nmUsuario,
                },
                ':NR_SEQ_EXAME': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.NUMBER,
                    val: nrSeqExame,
                },
            }, {
                outFormat: oracledb.OBJECT,
                autoCommit: true,
            },
        )
        .then(result => {
            console.log('result > ', result);
            (retorno.status = true), (retorno.msg = 'Sucesso ao salvar item');
        })
        .finally(function() {
            db.close();
        })
        .catch(err => {
            console.log(`Erro ao salvar item: ${err}`);
            retorno.msg = `Erro ao salvar item`;
        });
    return retorno;
}

async function buscarResultadoExames(cdPessoaFisica, nmUsuario) {
    let retorno = {
        status: false,
        msg: '',
        dados: [],
    };

    const db = await oracledb.getConnection();
    await db
        .execute(
            `SELECT b.dt_prescricao,
                        a.ie_final,
                        c.nr_seq_interno,
                        c.cd_procedimento cr_procedimento,
                        c.ie_origem_proced ie_origem_proced,
                        0 nr_seq_result_ext,
                        0 nr_seq_ext,
                        b.nr_prescricao,
                        a.nr_sequencia,
                        '',
                        substr(tasy.obter_descricao_procedimento(c.cd_procedimento,c.ie_origem_proced),1,200) ds_procedimento,
                        substr(tasy.obter_desc_exame(nvl(a.nr_seq_exame,c.nr_seq_exame)),1,200) ds_exame,
                        0 z1,
                        nvl(a.nr_seq_exame,c.nr_seq_exame) nr_seq_exame,
                        0 z2,
                        b.nr_atendimento,
                        b.ie_recem_nato,
                        substr(tasy.Obter_Desc_Grupo_Exame_lab(tasy.Obter_Grupo_Exame_lab(c.nr_seq_exame)),1,80) ds_grupo_exame,
                        a.ie_status,
                        a.nr_sequencia nr_seq_result,
                        substr(tasy.obter_nome_medico(b.cd_medico,'N'),1,60) nm_medico,
                        nvl(c.dt_coleta,a.dt_coleta) dt_coleta,
                        nvl(c.nr_controle_ext,nvl(b.nr_controle,0)) nr_controle,
                        substr(tasy.Obter_Material_Exame_Lab(tasy.Obter_Mat_Exame_Lab_prescr(c.nr_prescricao, c.nr_sequencia, 1),null,3),1,90) ds_material,
                        c.nr_sequencia nr_seq_prescr_proc,
                        to_char(dt_prev_execucao,'dd/mm/yyyy hh24:mi:ss') dt_prev_execucao,
                        tasy.Obter_data_aprov_lab(b.nr_prescricao,c.nr_sequencia) dt_aprovacao,
                        tasy.obter_data_impressao_result(c.nr_sequencia,b.nr_prescricao,0) dt_impressao,
                        c.dt_emissao_resultado,
                        substr(tasy.obter_nome_usuario(tasy.obter_usuario_aprov_lab(b.nr_prescricao,c.nr_sequencia)),1,255) nm_usuario_aprovacao,
                        substr(tasy.obter_nome_usuario(tasy.obter_usuario_liberacao_lab(b.nr_prescricao,c.nr_sequencia)),1,255) nm_usuario_liberacao,
                        substr(tasy.Obter_Valor_Dominio_Status_LIS(c.ie_status_atend),1,100) ds_status_lab,
                        c.nr_sequencia nr_seq_proc,
                        nvl(substr(tasy.obter_material_exame_lab(a.nr_seq_material_integr,null,3),1,90),substr(tasy.obter_material_exame_lab(tasy.obter_mat_exame_lab_prescr(c.nr_prescricao,c.nr_sequencia,1),null,3),1,90)) ds_material_integr,
                        a.nr_sequencia nr_seq_resultado,
                        c.dt_baixa,
                        c.ie_status_atend,
                        substr(tasy.Obter_se_contem_proced_adic(a.nr_prescricao,c.nr_sequencia),1,10) ds_proced_adic,
                        substr(tasy.obter_cor_exame_lab(c.nr_seq_exame),1,60) ds_cor_fundo,
                        substr(tasy.obter_lab_execucao_etapa(b.nr_prescricao, c.nr_sequencia, '40', 'D'),1,20) dt_liberacao,
                        c.ds_observacao_coleta,
                        b.nr_recem_nato,
                        a.dt_atualizacao,
                        tasy.obter_data_assinatura_digital(tasy.obter_assinatura_dig_exame_lab(b.nr_prescricao,c.nr_sequencia)) dt_assinatura,
                        c.ie_suspenso,
                        tasy.obter_legenda_exames_lab(a.nr_prescricao,a.nr_seq_prescricao) ie_desaprovado,
                        null dt_visualizacao,
                        0 nr_seq_prescr_ext,
                        b.nm_medico_externo,
                        b.crm_medico_externo,
                        substr(tasy.obter_codigo_integracao_result(a.nr_sequencia, a.cd_Exame_integracao),1,100) ds_exame_ext
                    FROM	tasy.result_laboratorio a,
                    tasy.prescr_procedimento c,
                    tasy.prescr_medica b
                    WHERE c.nr_prescricao  = a.nr_prescricao(+) 
                    AND	c.nr_sequencia = a.nr_seq_prescricao(+) 
                    AND	c.nr_prescricao  = b.nr_prescricao 
                    AND	nr_atendimento in (SELECT nr_atendimento
                    FROM	tasy.atendimento_paciente
                    WHERE cd_pessoa_fisica = :CD_PESSOA_FISICA ) 
                    AND	((0 = (SELECT x.nr_seq_grupo
                    FROM	tasy.exame_laboratorio x
                    WHERE x.nr_seq_exame = c.nr_seq_exame)) OR (0 = 0)) 
                    AND	((b.cd_medico = 0) OR ('0' = 0)) 
                    AND	((b.cd_setor_atendimento = 0) OR (0 = 0)) 
                    AND	1 in (1,7) 
                    AND	((a.ds_resultado is not null) OR ('N' = 'S') 
                    AND	c.nr_seq_exame is not null) 
                    AND	(('S' = 'S') OR ((nvl(c.ie_exame_bloqueado,'N') <> 'S') 
                    AND	(tasy.Obter_se_exame_bloq_result(c.nr_prescricao, c.nr_sequencia) <> 'S'))) 
                    AND	'S' = tasy.Obter_Se_Permite_Result_Novo(b.nr_atendimento,b.nr_prescricao,c.nr_sequencia,c.nr_seq_exame,2339, :NM_USUARIO) 
                    AND	c.ie_status_atend >= 35 
                    AND	(('N' = 'S') OR (('N' = 'N') 
                    AND	(nvl(a.ie_status,'A') <> 'I')) OR (('N' = 'T') 
                    AND	(nvl(a.ie_status,'A') <> 'I') 
                    AND	(c.ie_suspenso = 'N') )) 
                    AND	b.dt_suspensao is null
                    ORDER BY dt_prescricao desc,
                    ds_procedimento asc`, {
                ':CD_PESSOA_FISICA': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: cdPessoaFisica,
                },
                ':NM_USUARIO': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: nmUsuario,
                },
            }, {
                outFormat: oracledb.OBJECT,
                autoCommit: true,
            },
        )
        .then(result => {
            (retorno.status = true),
            (retorno.msg = 'Sucesso ao buscar resultados de exame');
            retorno.dados = result.rows;
        })
        .finally(function() {
            db.close();
        })
        .catch(err => {
            console.log(`Erro ao buscar resultados de exame: ${err}`);
            retorno.msg = `Erro ao buscar resultados de exame`;
        });
    return retorno;
}

async function buscarArquivoResultadoExame(nrSeqItem) {
    let retorno = {
        status: false,
        msg: '',
        dados: [],
    };

    const db = await oracledb.getConnection();
    await db
        .execute(
            `SELECT a.ds_resultado ds_resultado,
                        a.ie_formato_texto ie_formato_texto,
                        (SELECT count(*) 
                        FROM	tasy.result_laboratorio_evol 
                        WHERE nr_seq_result_lab = :NR_SEQUENCIA_ITEM) qt_item_evol,
                        (SELECT count(1)
                        FROM	tasy.result_laboratorio_pdf
                        WHERE nr_seq_resultado = a.nr_sequencia
                        AND	  ds_pdf_serial is not null) qt_pdf_serial
                        FROM	 tasy.result_laboratorio a
                     WHERE  a.nr_sequencia = :NR_SEQUENCIA_ITEM`, {
                ':NR_SEQUENCIA_ITEM': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: nrSeqItem,
                },
            }, {
                outFormat: oracledb.OBJECT,
                autoCommit: true,
            },
        )
        .then(result => {
            (retorno.status = true),
            (retorno.msg = 'Sucesso ao buscar arquivo de exame');
            retorno.dados = result.rows;
        })
        .finally(function() {
            db.close();
        })
        .catch(err => {
            console.log(`Erro ao buscar arquivo de exame: ${err}`);
            retorno.msg = `Erro ao buscar arquivo de exame`;
        });
    return retorno;
}

async function buscarArquivoResultadoExame2(nrSeqItem) {
let retorno = {
        status: false,
        msg: '',
        dados: [],
    };

    const db = await oracledb.getConnection();
    await db
        .execute(
            `SELECT a.*,
                        a.ie_formato_texto ie_formato_texto,
                        (SELECT count(*) 
                        FROM	tasy.result_laboratorio_evol 
                        WHERE nr_seq_result_lab = :NR_PRESCRICAO) qt_item_evol,
                        (SELECT count(1)
                        FROM	tasy.result_laboratorio_pdf
                        WHERE nr_seq_resultado = a.nr_sequencia
                        AND	  ds_pdf_serial is not null) qt_pdf_serial
                        FROM	 tasy.result_laboratorio a
                     WHERE  a.nr_prescricao = :NR_PRESCRICAO`, {
                ':NR_PRESCRICAO': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: nrSeqItem,
                },
            }, {
                outFormat: oracledb.OBJECT,
                autoCommit: true,
            },
        )
        .then(result => {
            (retorno.status = true),
            (retorno.msg = 'Sucesso ao buscar arquivo de exame');
            retorno.dados = result.rows;
        })
        .finally(function() {
            db.close();
        })
        .catch(err => {
            console.log(`Erro ao buscar arquivo de exame: ${err}`);
            retorno.msg = `Erro ao buscar arquivo de exame`;
        });
    return retorno;
}

async function buscarMotivoMudancaStatus(nmUsuario) {
    let retorno = {
        status: false,
        msg: '',
        dados: [],
    };

    const db = await oracledb.getConnection();
    await db
        .execute(
            `SELECT cd_motivo cd,
                        ds_motivo ds
                    FROM	tasy.agenda_motivo_cancelamento
                    WHERE ((cd_estabelecimento = 1) OR (cd_estabelecimento is null))
                        and ie_agenda in ('C','T')
                        and ie_situacao = 'A'
                        and tasy.obter_se_motcanc_agenda_regra(2339, nr_sequencia, 'C', :NM_USUARIO, 1) = 'N'
                    ORDER BY ds`, {
                ':NM_USUARIO': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: nmUsuario,
                },
            }, {
                outFormat: oracledb.OBJECT,
            },
        )
        .then(result => {
            retorno.status = true;
            retorno.msg = 'Sucesso ao obter motivos';
            retorno.dados = result.rows;
        })
        .finally(function() {
            db.close();
        })
        .catch(err => {
            console.log(`Erro ao obter motivos: ${err}`);
            retorno.msg = 'Erro ao obter motivos';
        });
    return retorno;
}

async function mudarStatusConsulta(cdAgenda, nmUsuario, nrSeqAgenda, ieStatus, dsMotivo, cdMotivo, nrAtendimento){
    let sql = ''
    let bind = ''
    let retorno = {
        status: false, 
        msg: ''    
    }
    
    if(ieStatus == 'AC'){
        sql = `begin
                tasy.ALTERAR_STATUS_AGENDA_PEP(
                NM_USUARIO_P => :NM_USUARIO_PP,
                IE_STATUS_AGENDA_P => :IE_STATUS_AGENDA_PP,
                NR_SEQ_AGENDA_P => :NR_SEQ_AGENDA_PP);
            end;`;
        bind = {
            ':NM_USUARIO_PP': {
                dir: oracledb.BIND_IN,
                type: oracledb.STRING,
                val: nmUsuario,
            },
            ':IE_STATUS_AGENDA_PP': {
                dir: oracledb.BIND_IN,
                type: oracledb.STRING,
                val: ieStatus,
            },
            ':NR_SEQ_AGENDA_PP': {
                dir: oracledb.BIND_IN,
                type: oracledb.STRING,
                val: nrSeqAgenda,
            },
        };
    } else if (ieStatus == 'C') {
        sql = `begin
                    tasy.ALTERAR_STATUS_AGECONS(
                    DS_MOTIVO_P => :DS_MOTIVO_PP, --obrigatorio para cancelar
                    CD_AGENDA_P => :CD_AGENDA_PP,
                    NM_USUARIO_P => :NM_USUARIO_PP,
                    CD_MOTIVO_P => :CD_AGENDA_PP, --obrigatorio para cancelar, pegar da lista -> agenda_motivo_cancelamento
                    NR_SEQ_FORMA_CONF_P => '',
                    NR_SEQ_AGENDA_P => :NR_SEQ_AGENDA_PP,
                    IE_STATUS_P => :IE_STATUS_PP,
                    IE_AGENDA_DIA_P => '');
                end;` 
        bind = { 
            ":CD_AGENDA_PP": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": cdAgenda },
            ":NM_USUARIO_PP": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": nmUsuario },
            ":NR_SEQ_AGENDA_PP": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": nrSeqAgenda },
            ":IE_STATUS_PP": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": ieStatus },
            ":DS_MOTIVO_PP": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": dsMotivo },
            ":CD_AGENDA_PP": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": cdMotivo }
        } 
    }else if (ieStatus == 'E') {
        const callGerarAltaPaciente = await gerarAltaPaciente(nrAtendimento, nmUsuario, 19);
        retorno.alta_paciente = callGerarAltaPaciente;

        sql = `begin
                    tasy.ALTERAR_STATUS_AGECONS(
                    DS_MOTIVO_P => '', --obrigatorio para cancelar
                    CD_AGENDA_P => :CD_AGENDA_PP,
                    NM_USUARIO_P => :NM_USUARIO_PP,
                    CD_MOTIVO_P => '', --obrigatorio para cancelar, pegar da lista -> agenda_motivo_cancelamento
                    NR_SEQ_FORMA_CONF_P => '',
                    NR_SEQ_AGENDA_P => :NR_SEQ_AGENDA_PP,
                    IE_STATUS_P => :IE_STATUS_PP,
                    IE_AGENDA_DIA_P => '');
                end;` 
        bind = { 
            ":CD_AGENDA_PP": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": cdAgenda },
            ":NM_USUARIO_PP": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": nmUsuario },
            ":NR_SEQ_AGENDA_PP": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": nrSeqAgenda },
            ":IE_STATUS_PP": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": ieStatus },
        }
    } else if (ieStatus == 'F') {
        const callGerarAltaPaciente = await gerarAltaPaciente(nrAtendimento, nmUsuario, 6);
        retorno.alta_paciente = callGerarAltaPaciente;

        sql = `begin
                    tasy.ALTERAR_STATUS_AGECONS(
                    DS_MOTIVO_P => '', --obrigatorio para cancelar
                    CD_AGENDA_P => :CD_AGENDA_PP,
                    NM_USUARIO_P => :NM_USUARIO_PP,
                    CD_MOTIVO_P => '', --obrigatorio para cancelar, pegar da lista -> agenda_motivo_cancelamento
                    NR_SEQ_FORMA_CONF_P => '',
                    NR_SEQ_AGENDA_P => :NR_SEQ_AGENDA_PP,
                    IE_STATUS_P => :IE_STATUS_PP,
                    IE_AGENDA_DIA_P => '');
                end;` 
        bind = { 
            ":CD_AGENDA_PP": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": cdAgenda },
            ":NM_USUARIO_PP": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": nmUsuario },
            ":NR_SEQ_AGENDA_PP": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": nrSeqAgenda },
            ":IE_STATUS_PP": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": ieStatus },
        }
    } else {
        sql = `begin
                    tasy.ALTERAR_STATUS_AGECONS(
                    DS_MOTIVO_P => '', --obrigatorio para cancelar
                    CD_AGENDA_P => :CD_AGENDA_PP,
                    NM_USUARIO_P => :NM_USUARIO_PP,
                    CD_MOTIVO_P => '', --obrigatorio para cancelar, pegar da lista -> agenda_motivo_cancelamento
                    NR_SEQ_FORMA_CONF_P => '',
                    NR_SEQ_AGENDA_P => :NR_SEQ_AGENDA_PP,
                    IE_STATUS_P => :IE_STATUS_PP,
                    IE_AGENDA_DIA_P => '');
                end;` 
        bind = { 
            ":CD_AGENDA_PP": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": cdAgenda },
            ":NM_USUARIO_PP": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": nmUsuario },
            ":NR_SEQ_AGENDA_PP": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": nrSeqAgenda },
            ":IE_STATUS_PP": { "dir": oracledb.BIND_IN, "type": oracledb.STRING, "val": ieStatus },
        }

    }  

    const db = await oracledb.getConnection();
    await db
        .execute(sql, bind, {
            outFormat: oracledb.OBJECT,
        })
        .then(result => {
            retorno.status = true;
            retorno.msg = 'Sucesso ao mudar o status da agenda';
        })
        .finally(function() {
            db.close();
        })
        .catch(err => {
            console.log(`Erro ao mudar status da agenda: ${err}`);
            retorno.msg = 'Erro ao mudar status da agenda';
        });
    return retorno;
}

async function obterDadosAtendimento(nrAtendimento) {
    retorno = {
        status: false,
        msg: '',
    };

    const db = await oracledb.getConnection();
    await db
        .execute(
            `SELECT ie_tipo_atendimento,
                        ie_tipo_convenio,
                        cd_convenio,
                        cd_categoria,
                        cd_estabelecimento,
                        tasy.obter_se_obriga_lado_exame(null) ie_obriga_lado
                    FROM	tasy.atendimento_paciente_v
                    WHERE (nr_atendimento is not null and(nr_atendimento = :NR_ATENDIMENTO)
                        OR (cd_pessoa_fisica is not null and(cd_pessoa_fisica = null)))
                    ORDER BY nr_atendimento desc`, {
                ':NR_ATENDIMENTO': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: nrAtendimento,
                },
            }, {
                outFormat: oracledb.OBJECT,
                autoCommit: true,
            },
        )
        .then(result => {
            (retorno.status = true),
            (retorno.msg = 'Sucesso ao obter dados do atendimento');
            retorno.dados = result.rows;
        })
        .finally(function() {
            db.close();
        })
        .catch(err => {
            console.log(`Erro ao obter dados do atendimento: ${err}`);
            retorno.msg = `Erro ao obter dados do atendimento`;
        });
    return retorno;
}

async function buscarLaudosExamesImagemPaciente(cdPessoaFisica) {
    let retorno = {
        status: false,
        msg: '',
    };

    const db = await oracledb.getConnection();
    await db
        .execute(
            `SELECT a.nr_sequencia,
                        dt_laudo,
                        ds_titulo_laudo,
                        NVL(dt_exame, tasy.obter_dt_exame_externo(a.nr_sequencia)) dt_exame_outro,
                        nm_medico_resp,
                        nm_medico,
                        a.nr_atendimento,
                        a.nr_prescricao,
                        ie_normal,
                        dt_liberacao,
                        a.nm_usuario,
                        qt_imagem,
                        a.nr_controle,
                        a.dt_cancelamento,
                        ie_status_laudo,
                        ds_laudo,
                        nr_laudo,
                        nr_seq_proc,
                        nr_seq_grupo_medida,
                        tasy.obter_se_imagem_laudo(a.nr_sequencia) ie_imagem,
                        tasy.obter_numero_laudo(a.nr_seq_superior) nr_laudo_superior,
                        ie_formato,
                        ie_recem_nato,
                        a.nr_acesso_dicom,
                        a.ie_imagem_pacs,
                        ds_procs_adic,
                        NR_RECEM_NATO,
                        nr_seq_prescricao,
                        a.CD_PESSOA_FISICA,
                        NR_SEQ_INTERNO_PRESCR,
                        to_date(tasy.Obter_Dados_ProPaci('DPF',nr_seq_proc),'dd/mm/yyyy hh24:mi:ss') dt_baixa,
                        tasy.Obter_Dt_prev_prescr(a.nr_prescricao,a.nr_seq_prescricao) dt_prev_execucao,
                        dt_assinatura,
                        ds_arquivo,
                        l.ds_como_realizado,
                        l.ds_metodo_utilizado,
                        l.ds_tempo_realizado,
                        l.ds_local_realiza_exame,
                        l.ds_local_laudo,
                        l.ds_conclusao,
                        tasy.obter_nome_pf((SELECT max(cd_medico_executor)
                    FROM	tasy.procedimento_paciente
                    WHERE nr_laudo = a.nr_sequencia)) nm_medico_executor,  substr(tasy.Obter_nr_Seq_lab(a.nr_prescricao,a.nr_seq_prescricao),1,255)nr_Seq_lab,  substr(tasy.obter_se_existe_copia_laudo(a.nr_sequencia),1,1)ie_copia,  a.nm_medico_resid,   tasy.obter_solicitacao_laudo_pep( a.nr_prescricao, a.nr_atendimento ) ds_solicitacao,   tasy.obter_execucao_laudo_pep( a.nr_prescricao, a.nr_atendimento ) ds_externo,   tasy.Obter_Nome_Usuario(nm_usuario_seg_aprov) nm_usuario_seg_aprov,   substr(tasy.obter_valor_dominio(8390, a.ie_tumor), 1, 255) ie_tumor
                    FROM	tasy.laudo_paciente_v a left join tasy.laudo_pac_inf_estr l on tasy.l.nr_seq_laudo = a.nr_sequencia
                    WHERE a.nr_atendimento in (SELECT p.nr_atendimento
                    FROM	tasy.atendimento_paciente p
                    WHERE p.cd_pessoa_fisica = :CD_PESSOA_FISICA )
                    ORDER BY nr_atendimento desc,
                    nr_laudo desc,
                    dt_laudo`, {
                ':CD_PESSOA_FISICA': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: cdPessoaFisica.toString(),
                },
            }, {
                outFormat: oracledb.OBJECT,
                autoCommit: true,
            },
        )
        .then(result => {
            retorno.status = true;

            let url = '';

            Promise.all(
                result.rows.map(async item => {
                    item.NR_ACESSO_DICOM ?
                        (url = await urlImageGeneratePixeonAurora(
                            hostPixeonAurora,
                            pixeonSecret,
                            item.NR_ACESSO_DICOM,
                            jti,
                        )) :
                        '';

                    item.url = url;

                    return item;
                }),
            );

            retorno.dados = result.rows;

            if (result.rows.length > 0) {
                retorno.msg = 'Sucesso ao obter laudos de exame de imagem';
            } else {
                retorno.msg = 'Sem laudos disponíveis';
            }
        })
        .finally(function() {
            db.close();
        })
        .catch(err => {
            console.log(`Erro ao obter laudos de exame de imagem: ${err}`);
            retorno.msg = `Erro ao obter laudos de exame de imagem`;
        });
    return retorno;
}

async function urlImageGeneratePixeonAurora(
    hostService,
    token,
    accessNumber,
    jti,
) {
    var CryptoJS =
        CryptoJS ||
        (function(h, s) {
            var f = {},
                g = (f.lib = {}),
                q = function() {},
                m = (g.Base = {
                    extend: function(a) {
                        q.prototype = this;
                        var c = new q();
                        a && c.mixIn(a);
                        c.hasOwnProperty('init') ||
                            (c.init = function() {
                                c.$super.init.apply(this, arguments);
                            });
                        c.init.prototype = c;
                        c.$super = this;
                        return c;
                    },
                    create: function() {
                        var a = this.extend();
                        a.init.apply(a, arguments);
                        return a;
                    },
                    init: function() {},
                    mixIn: function(a) {
                        for (var c in a)
                            a.hasOwnProperty(c) && (this[c] = a[c]);
                        a.hasOwnProperty('toString') &&
                            (this.toString = a.toString);
                    },
                    clone: function() {
                        return this.init.prototype.extend(this);
                    },
                }),
                r = (g.WordArray = m.extend({
                    init: function(a, c) {
                        a = this.words = a || [];
                        this.sigBytes = c != s ? c : 4 * a.length;
                    },
                    toString: function(a) {
                        return (a || k).stringify(this);
                    },
                    concat: function(a) {
                        var c = this.words,
                            d = a.words,
                            b = this.sigBytes;
                        a = a.sigBytes;
                        this.clamp();
                        if (b % 4)
                            for (var e = 0; e < a; e++)
                                c[(b + e) >>> 2] |=
                                ((d[e >>> 2] >>> (24 - 8 * (e % 4))) &
                                    255) <<
                                (24 - 8 * ((b + e) % 4));
                        else if (65535 < d.length)
                            for (e = 0; e < a; e += 4)
                                c[(b + e) >>> 2] = d[e >>> 2];
                        else c.push.apply(c, d);
                        this.sigBytes += a;
                        return this;
                    },
                    clamp: function() {
                        var a = this.words,
                            c = this.sigBytes;
                        a[c >>> 2] &= 4294967295 << (32 - 8 * (c % 4));
                        a.length = h.ceil(c / 4);
                    },
                    clone: function() {
                        var a = m.clone.call(this);
                        a.words = this.words.slice(0);
                        return a;
                    },
                    random: function(a) {
                        for (var c = [], d = 0; d < a; d += 4)
                            c.push((4294967296 * h.random()) | 0);
                        return new r.init(c, a);
                    },
                })),
                l = (f.enc = {}),
                k = (l.Hex = {
                    stringify: function(a) {
                        var c = a.words;
                        a = a.sigBytes;
                        for (var d = [], b = 0; b < a; b++) {
                            var e = (c[b >>> 2] >>> (24 - 8 * (b % 4))) & 255;
                            d.push((e >>> 4).toString(16));
                            d.push((e & 15).toString(16));
                        }
                        return d.join('');
                    },
                    parse: function(a) {
                        for (var c = a.length, d = [], b = 0; b < c; b += 2)
                            d[b >>> 3] |=
                            parseInt(a.substr(b, 2), 16) <<
                            (24 - 4 * (b % 8));
                        return new r.init(d, c / 2);
                    },
                }),
                n = (l.Latin1 = {
                    stringify: function(a) {
                        var c = a.words;
                        a = a.sigBytes;
                        for (var d = [], b = 0; b < a; b++)
                            d.push(
                                String.fromCharCode(
                                    (c[b >>> 2] >>> (24 - 8 * (b % 4))) & 255,
                                ),
                            );
                        return d.join('');
                    },
                    parse: function(a) {
                        for (var c = a.length, d = [], b = 0; b < c; b++)
                            d[b >>> 2] |=
                            (a.charCodeAt(b) & 255) << (24 - 8 * (b % 4));
                        return new r.init(d, c);
                    },
                }),
                j = (l.Utf8 = {
                    stringify: function(a) {
                        try {
                            return decodeURIComponent(escape(n.stringify(a)));
                        } catch (c) {
                            throw Error('Malformed UTF-8 data');
                        }
                    },
                    parse: function(a) {
                        return n.parse(unescape(encodeURIComponent(a)));
                    },
                }),
                u = (g.BufferedBlockAlgorithm = m.extend({
                    reset: function() {
                        this._data = new r.init();
                        this._nDataBytes = 0;
                    },
                    _append: function(a) {
                        'string' == typeof a && (a = j.parse(a));
                        this._data.concat(a);
                        this._nDataBytes += a.sigBytes;
                    },
                    _process: function(a) {
                        var c = this._data,
                            d = c.words,
                            b = c.sigBytes,
                            e = this.blockSize,
                            f = b / (4 * e),
                            f = a ?
                            h.ceil(f) :
                            h.max((f | 0) - this._minBufferSize, 0);
                        a = f * e;
                        b = h.min(4 * a, b);
                        if (a) {
                            for (var g = 0; g < a; g += e)
                                this._doProcessBlock(d, g);
                            g = d.splice(0, a);
                            c.sigBytes -= b;
                        }
                        return new r.init(g, b);
                    },
                    clone: function() {
                        var a = m.clone.call(this);
                        a._data = this._data.clone();
                        return a;
                    },
                    _minBufferSize: 0,
                }));
            g.Hasher = u.extend({
                cfg: m.extend(),
                init: function(a) {
                    this.cfg = this.cfg.extend(a);
                    this.reset();
                },
                reset: function() {
                    u.reset.call(this);
                    this._doReset();
                },
                update: function(a) {
                    this._append(a);
                    this._process();
                    return this;
                },
                finalize: function(a) {
                    a && this._append(a);
                    return this._doFinalize();
                },
                blockSize: 16,
                _createHelper: function(a) {
                    return function(c, d) {
                        return new a.init(d).finalize(c);
                    };
                },
                _createHmacHelper: function(a) {
                    return function(c, d) {
                        return new t.HMAC.init(a, d).finalize(c);
                    };
                },
            });
            var t = (f.algo = {});
            return f;
        })(Math);
    (function(h) {
        for (
            var s = CryptoJS,
                f = s.lib,
                g = f.WordArray,
                q = f.Hasher,
                f = s.algo,
                m = [],
                r = [],
                l = function(a) {
                    return (4294967296 * (a - (a | 0))) | 0;
                },
                k = 2,
                n = 0; 64 > n;

        ) {
            var j;
            a: {
                j = k;
                for (var u = h.sqrt(j), t = 2; t <= u; t++)
                    if (!(j % t)) {
                        j = !1;
                        break a;
                    }
                j = !0;
            }
            j &&
                (8 > n && (m[n] = l(h.pow(k, 0.5))),
                    (r[n] = l(h.pow(k, 1 / 3))),
                    n++);
            k++;
        }
        var a = [],
            f = (f.SHA256 = q.extend({
                _doReset: function() {
                    this._hash = new g.init(m.slice(0));
                },
                _doProcessBlock: function(c, d) {
                    for (
                        var b = this._hash.words,
                            e = b[0],
                            f = b[1],
                            g = b[2],
                            j = b[3],
                            h = b[4],
                            m = b[5],
                            n = b[6],
                            q = b[7],
                            p = 0; 64 > p; p++
                    ) {
                        if (16 > p) a[p] = c[d + p] | 0;
                        else {
                            var k = a[p - 15],
                                l = a[p - 2];
                            a[p] =
                                (((k << 25) | (k >>> 7)) ^
                                    ((k << 14) | (k >>> 18)) ^
                                    (k >>> 3)) +
                                a[p - 7] +
                                (((l << 15) | (l >>> 17)) ^
                                    ((l << 13) | (l >>> 19)) ^
                                    (l >>> 10)) +
                                a[p - 16];
                        }
                        k =
                            q +
                            (((h << 26) | (h >>> 6)) ^
                                ((h << 21) | (h >>> 11)) ^
                                ((h << 7) | (h >>> 25))) +
                            ((h & m) ^ (~h & n)) +
                            r[p] +
                            a[p];
                        l =
                            (((e << 30) | (e >>> 2)) ^
                                ((e << 19) | (e >>> 13)) ^
                                ((e << 10) | (e >>> 22))) +
                            ((e & f) ^ (e & g) ^ (f & g));
                        q = n;
                        n = m;
                        m = h;
                        h = (j + k) | 0;
                        j = g;
                        g = f;
                        f = e;
                        e = (k + l) | 0;
                    }
                    b[0] = (b[0] + e) | 0;
                    b[1] = (b[1] + f) | 0;
                    b[2] = (b[2] + g) | 0;
                    b[3] = (b[3] + j) | 0;
                    b[4] = (b[4] + h) | 0;
                    b[5] = (b[5] + m) | 0;
                    b[6] = (b[6] + n) | 0;
                    b[7] = (b[7] + q) | 0;
                },
                _doFinalize: function() {
                    var a = this._data,
                        d = a.words,
                        b = 8 * this._nDataBytes,
                        e = 8 * a.sigBytes;
                    d[e >>> 5] |= 128 << (24 - (e % 32));
                    d[(((e + 64) >>> 9) << 4) + 14] = h.floor(b / 4294967296);
                    d[(((e + 64) >>> 9) << 4) + 15] = b;
                    a.sigBytes = 4 * d.length;
                    this._process();
                    return this._hash;
                },
                clone: function() {
                    var a = q.clone.call(this);
                    a._hash = this._hash.clone();
                    return a;
                },
            }));
        s.SHA256 = q._createHelper(f);
        s.HmacSHA256 = q._createHmacHelper(f);
    })(Math);
    (function() {
        var h = CryptoJS,
            s = h.enc.Utf8;
        h.algo.HMAC = h.lib.Base.extend({
            init: function(f, g) {
                f = this._hasher = new f.init();
                'string' == typeof g && (g = s.parse(g));
                var h = f.blockSize,
                    m = 4 * h;
                g.sigBytes > m && (g = f.finalize(g));
                g.clamp();
                for (
                    var r = (this._oKey = g.clone()),
                        l = (this._iKey = g.clone()),
                        k = r.words,
                        n = l.words,
                        j = 0; j < h; j++
                )
                    (k[j] ^= 1549556828), (n[j] ^= 909522486);
                r.sigBytes = l.sigBytes = m;
                this.reset();
            },
            reset: function() {
                var f = this._hasher;
                f.reset();
                f.update(this._iKey);
            },
            update: function(f) {
                this._hasher.update(f);
                return this;
            },
            finalize: function(f) {
                var g = this._hasher;
                f = g.finalize(f);
                g.reset();
                return g.finalize(this._oKey.clone().concat(f));
            },
        });
    })();

    (function() {
        var h = CryptoJS,
            j = h.lib.WordArray;
        h.enc.Base64 = {
            stringify: function(b) {
                var e = b.words,
                    f = b.sigBytes,
                    c = this._map;
                b.clamp();
                b = [];
                for (var a = 0; a < f; a += 3)
                    for (
                        var d =
                            (((e[a >>> 2] >>> (24 - 8 * (a % 4))) & 255) <<
                                16) |
                            (((e[(a + 1) >>> 2] >>>
                                        (24 - 8 * ((a + 1) % 4))) &
                                    255) <<
                                8) |
                            ((e[(a + 2) >>> 2] >>>
                                    (24 - 8 * ((a + 2) % 4))) &
                                255),
                            g = 0; 4 > g && a + 0.75 * g < f; g++
                    )
                        b.push(c.charAt((d >>> (6 * (3 - g))) & 63));
                if ((e = c.charAt(64)))
                    for (; b.length % 4;) b.push(e);
                return b.join('');
            },
            parse: function(b) {
                var e = b.length,
                    f = this._map,
                    c = f.charAt(64);
                c && ((c = b.indexOf(c)), -1 != c && (e = c));
                for (var c = [], a = 0, d = 0; d < e; d++)
                    if (d % 4) {
                        var g = f.indexOf(b.charAt(d - 1)) << (2 * (d % 4)),
                            h = f.indexOf(b.charAt(d)) >>> (6 - 2 * (d % 4));
                        c[a >>> 2] |= (g | h) << (24 - 8 * (a % 4));
                        a++;
                    }
                return j.create(c, a);
            },
            _map: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=',
        };
    })();

    let Base64 = {
        _keyStr: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=',
        encode: function(e) {
            var t = '';
            var n, r, i, s, o, u, a;
            var f = 0;
            e = Base64._utf8_encode(e);
            while (f < e.length) {
                n = e.charCodeAt(f++);
                r = e.charCodeAt(f++);
                i = e.charCodeAt(f++);
                s = n >> 2;
                o = ((n & 3) << 4) | (r >> 4);
                u = ((r & 15) << 2) | (i >> 6);
                a = i & 63;
                if (isNaN(r)) {
                    u = a = 64;
                } else if (isNaN(i)) {
                    a = 64;
                }
                t =
                    t +
                    this._keyStr.charAt(s) +
                    this._keyStr.charAt(o) +
                    this._keyStr.charAt(u) +
                    this._keyStr.charAt(a);
            }
            return t;
        },
        decode: function(e) {
            var t = '';
            var n, r, i;
            var s, o, u, a;
            var f = 0;
            e = e.replace(/[^A-Za-z0-9\+\/\=]/g, '');
            while (f < e.length) {
                s = this._keyStr.indexOf(e.charAt(f++));
                o = this._keyStr.indexOf(e.charAt(f++));
                u = this._keyStr.indexOf(e.charAt(f++));
                a = this._keyStr.indexOf(e.charAt(f++));
                n = (s << 2) | (o >> 4);
                r = ((o & 15) << 4) | (u >> 2);
                i = ((u & 3) << 6) | a;
                t = t + String.fromCharCode(n);
                if (u != 64) {
                    t = t + String.fromCharCode(r);
                }
                if (a != 64) {
                    t = t + String.fromCharCode(i);
                }
            }
            t = Base64._utf8_decode(t);
            return t;
        },
        _utf8_encode: function(e) {
            e = e.replace(/\r\n/g, '\n');
            var t = '';
            for (var n = 0; n < e.length; n++) {
                var r = e.charCodeAt(n);
                if (r < 128) {
                    t += String.fromCharCode(r);
                } else if (r > 127 && r < 2048) {
                    t += String.fromCharCode((r >> 6) | 192);
                    t += String.fromCharCode((r & 63) | 128);
                } else {
                    t += String.fromCharCode((r >> 12) | 224);
                    t += String.fromCharCode(((r >> 6) & 63) | 128);
                    t += String.fromCharCode((r & 63) | 128);
                }
            }
            return t;
        },
        _utf8_decode: function(e) {
            var t = '';
            var n = 0;
            var r = (c1 = c2 = 0);
            while (n < e.length) {
                r = e.charCodeAt(n);
                if (r < 128) {
                    t += String.fromCharCode(r);
                    n++;
                } else if (r > 191 && r < 224) {
                    c2 = e.charCodeAt(n + 1);
                    t += String.fromCharCode(((r & 31) << 6) | (c2 & 63));
                    n += 2;
                } else {
                    c2 = e.charCodeAt(n + 1);
                    c3 = e.charCodeAt(n + 2);
                    t += String.fromCharCode(
                        ((r & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63),
                    );
                    n += 3;
                }
            }
            return t;
        },
    };

    function to_urlbase64(text) {
        return text.replace(/\+/g, '-').replace(/\//g, '_').replace(/\=+$/, '');
    }

    function make_token(
        secret,
        user_id,
        user_name,
        accessionnumber,
        study_instance_uid,
        series_instance_uid,
        sopinstanceuid,
    ) {
        iat = Math.round(Date.now() / 1000);

        data = {
            iss: 'Integration tests',
            aud: 'XVIEWER',
            user: { id: user_id, name: user_name },
            iat: iat,
            exp: iat + 24 * 60 * 60,
            jti: jti, //"1892ASD8ASDA9SDA98SD7"
        };

        if (study_instance_uid !== '') {
            data['studyinstanceuid'] = study_instance_uid;
            if (series_instance_uid !== '') {
                data['seriesinstanceuid'] = series_instance_uid;
                if (sop_instance_uid !== '') {
                    data['sopinstanceuid'] = sop_instance_uid;
                }
            }
        } else if (accessionnumber != '') {
            data['accessionnumber'] = accessionnumber;
        }

        let header = to_urlbase64(
            Base64.encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })),
        );
        let payload = to_urlbase64(Base64.encode(JSON.stringify(data)));
        let hash = to_urlbase64(
            CryptoJS.enc.Base64.stringify(
                CryptoJS.HmacSHA256(header + '.' + payload, secret),
            ),
        );

        return header + '.' + payload + '.' + hash;
    }

    function get_url(
        host,
        secret,
        user_id,
        user_name,
        accessionnumber,
        study_instance_uid,
        series_instance_uid,
        sopinstanceuid,
    ) {
        return (
            host +
            '/open?token=' +
            make_token(
                secret,
                user_id,
                user_name,
                accessionnumber,
                study_instance_uid,
                series_instance_uid,
                sopinstanceuid,
            )
        );
    }

    function make() {
        let host = hostService;
        let secret = token;
        let user_id = '';
        let user_name = '';
        let accession = accessNumber;
        let study = '';
        let series = '';

        let new_url = get_url(
            host,
            secret,
            user_id,
            user_name,
            accession,
            study,
            series,
        );

        return new_url;
    }
    let url = make(); //Gera a Url
    return url;
}

async function listarHorariosDisponiveis(
    idConvenio,
    idEspecialidade,
    idProfissional,
    idCliente,
) {
    // padrao do retorno da api v1
    let retorno = {
        codigo: 1,
        sucesso: false,
        mensagem: '',
        dados: [],
    };

    let dados = '';

    let queryPrincipal = `with 
    agenda_epecial as (
    select cd_agenda, cd_medico from appv2.VW_PACIENTES_AGENDAS_ESPECIAL 
    where cd_pessoa_fisica = :idCliente
    ),
    agenda_minima_normal as (
        select     
            AC.NR_SEQUENCIA,
            AC.DT_AGENDA as dt_agenda_min, 
            A.CD_ESPECIALIDADE,
            A.CD_PROCEDENCIA, 
            A.CD_AGENDA,
            a.cd_pessoa_fisica as cd_medico,
            a.CD_SETOR_EXCLUSIVO,
            'N' as tipo
        from tasy.agenda_consulta ac
        join tasy.agenda a on a.cd_agenda = ac.cd_agenda
        join tasy.agenda_turno at on ac.cd_agenda = at.cd_agenda 
        
        left join TASY.AGENDA_TURNO_CONV ATC on atc.nr_seq_turno = at.nr_sequencia and atc.cd_agenda = at.cd_agenda
        
        where ac.dt_agenda between nvl(at.dt_inicio_vigencia, trunc(sysdate)) and nvl((at.dt_final_vigencia + 1) - (1/24/60/60), sysdate + (select MAX_DIAS_APRAZ from appv2.parametros_config_sistema) )
            and to_char(ac.dt_agenda, 'hh24:mi') between nvl(to_char( at.hr_inicial, 'HH24:MI' ), '00:00') and nvl(to_char( at.hr_final, 'HH24:MI' ), '23:59')
            and at.IE_DIA_SEMANA    in (to_char(ac.dt_agenda, 'd'), 9)  
            and ac.dt_agenda between sysdate and sysdate + (select MAX_DIAS_APRAZ from appv2.parametros_config_sistema)  
            and ac.ie_status_agenda in ('L')
            
            /* and nvl(atc.QT_PERMISSAO, 1) > 0
            and nvl(IE_ATENDE_CONVENIO, 'S') = 'S'
            */
            AND A.IE_SITUACAO      = 'A' 
            AND A.IE_AGENDA_WEB    = 'S' 
            AND A.CD_SETOR_EXCLUSIVO IS NOT NULL
            
            AND (
                NOT(atc.ie_atende_convenio = 'N' AND atc.cd_convenio = :idConvenio)        
                OR(nvl(atc.ie_atende_convenio, 'S') = 'S' AND nvl(atc.cd_convenio, :idConvenio) = :idConvenio)
           )
            and a.cd_especialidade = :idEspecialidade
            and a.cd_pessoa_fisica = :idProfissional
            
            and not exists(select  1 
                            from tasy.agenda_bloqueio ab 
                            where ab.cd_agenda = a.cd_agenda and ac.dt_agenda between ab.dt_inicial and (ab.dt_final + 1) - (1/24/60/60)
                                and to_char(ac.dt_agenda, 'hh24:mi') between nvl(to_char(ab.HR_INICIO_BLOQUEIO, 'hh24:mi'), '00:00') and nvl(to_char(ab.HR_FINAL_BLOQUEIO, 'hh24:mi'), '23:59')           
                            )
            
        
    ),
    agenda_minima_especial as (
        select    
                AC.NR_SEQUENCIA,
                (AC.DT_AGENDA + 1/24/60) DT_AGENDA_proximo, 
                A.CD_ESPECIALIDADE,
                A.CD_PROCEDENCIA, 
                A.CD_AGENDA,
                a.cd_pessoa_fisica as cd_medico,
                a.CD_SETOR_EXCLUSIVO,
                'S' as tipo
        from tasy.agenda_consulta ac
        join tasy.agenda a on a.cd_agenda = ac.cd_agenda
        join tasy.agenda_turno at on ac.cd_agenda = at.cd_agenda 
        join agenda_epecial ae on ae.cd_agenda = ac.cd_agenda and a.cd_pessoa_fisica = ae.cd_medico
        left join TASY.AGENDA_TURNO_CONV ATC on atc.nr_seq_turno = at.nr_sequencia and atc.cd_agenda = at.cd_agenda
        
        where ac.dt_agenda between nvl(at.dt_inicio_vigencia, trunc(sysdate)) and nvl((at.dt_final_vigencia + 1) - (1/24/60/60), sysdate + (select MAX_DIAS_APRAZ from appv2.parametros_config_sistema) )
            and to_char(ac.dt_agenda, 'hh24:mi') between nvl(to_char( at.hr_inicial, 'HH24:MI' ), '00:00') and nvl(to_char( at.hr_final, 'HH24:MI' ), '23:59')
            and at.IE_DIA_SEMANA    in (to_char(ac.dt_agenda, 'd'), 9)  
            and ac.dt_agenda between (sysdate+1) and sysdate + (select MAX_DIAS_APRAZ from appv2.parametros_config_sistema)  
            and ac.ie_status_agenda in ('M', 'N', 'L')
            
            /*and nvl(atc.QT_PERMISSAO, 1) > 0
            and nvl(IE_ATENDE_CONVENIO, 'S') = 'S'
            */
            AND A.IE_SITUACAO = 'A' 
            AND A.IE_AGENDA_WEB = 'S' 
            AND A.CD_SETOR_EXCLUSIVO IS NOT NULL
            
            AND (
                NOT(atc.ie_atende_convenio = 'N' AND atc.cd_convenio = :idConvenio)        
                OR(nvl(atc.ie_atende_convenio, 'S') = 'S' AND nvl(atc.cd_convenio, :idConvenio) = :idConvenio)
            )
            and a.cd_especialidade = :idEspecialidade
            and a.cd_pessoa_fisica = :idProfissional
            
            and not exists(select  1 
                            from tasy.agenda_bloqueio ab 
                            where ab.cd_agenda = a.cd_agenda and ac.dt_agenda between ab.dt_inicial and (ab.dt_final + 1) - (1/24/60/60)
                                and to_char(ac.dt_agenda, 'hh24:mi') between nvl(to_char(ab.HR_INICIO_BLOQUEIO, 'hh24:mi'), '00:00') and nvl(to_char(ab.HR_FINAL_BLOQUEIO, 'hh24:mi'), '23:59')
                            
                            )
            AND (  select 
                        count(distinct cd_pessoa_fisica) 
                    from samel.agenda_espcecial_controle 
                    where cd_medico = a.cd_pessoa_fisica and dt_agenda between trunc(ac.dt_agenda) and trunc(ac.dt_agenda + 1) - (1/24/60/60)
            ) <= 2 
        order by trunc(ac.DT_AGENDA) asc, ac.DT_AGENDA desc 
        fetch first 1 row only
    )
    select distinct a.nr_sequencia, a.cd_especialidade, 
                    e.ds_especialidade, a.cd_agenda, 
                    to_char(a.dt_agenda_min, 'dd/mm/yyyy hh24:mi') as dt_agenda3, 
                    to_char(a.dt_agenda_min, 'yyyy/mm/dd hh24:mi:ss') as dt_agenda2, 
                    a.dt_agenda_min,
                    initcap(d.nm_pessoa_fisica) as nm_medico,
                    d.cd_pessoa_fisica as cd_medico, 
                    tipo as hora_especial, 
                    c.nm_unidade, 
                    c.cd_unidade 
    from (
        select * from appv2.agenda_minima_normal a
            union all 
        select * from appv2.agenda_minima_especial b
    ) a
    join appv2.tb_unidade_setor b on b.cd_setor       = a.cd_setor_exclusivo
    join appv2.tb_unidade       c on c.cd_unidade     = b.cd_unidade
    join tasy.pessoa_fisica d on d.cd_pessoa_fisica = a.cd_medico
    join tasy.especialidade_medica e on e.cd_especialidade = a.cd_especialidade
    where nvl(a.cd_procedencia, 0) in(17)
    order by hora_especial desc, dt_agenda_min asc`;

    const db = await oracledb.getConnection();
    //valida usuario e senha no banco de dados
    await db
        .execute(
            queryPrincipal, {
                idEspecialidade: {
                    dir: oracledb.BIND_IN,
                    type: oracledb.NUMBER,
                    val: Number(idEspecialidade),
                },
                idProfissional: {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: idProfissional.toString(),
                },
                idConvenio: {
                    dir: oracledb.BIND_IN,
                    type: oracledb.NUMBER,
                    val: Number(idConvenio),
                },
                idCliente: {
                    dir: oracledb.BIND_IN,
                    type: oracledb.NUMBER,
                    val: Number(idCliente),
                },
            }, {
                outFormat: oracledb.OBJECT,
            },
        )
        .then(result => {
            //se encontrou algo entao pega a primeira posicao
            if (result.rows.length > 0) {
                dados = result.rows;

                let horarios = [];

                for (let item of dados) {
                    //reescrevendo para mobile e front
                    let horario = {
                        id: item.NR_SEQUENCIA ? item.NR_SEQUENCIA : 0,
                        idAgenda: item.CD_AGENDA ? item.CD_AGENDA : 0,
                        horaEspecial: item.HORA_ESPECIAL ?
                            item.HORA_ESPECIAL :
                            'N',
                        especialidadeAgenda: {
                            id: item.CD_ESPECIALIDADE ?
                                item.CD_ESPECIALIDADE :
                                0,
                            descricao: item.DS_ESPECIALIDADE ?
                                item.DS_ESPECIALIDADE :
                                '',
                        },
                        nmMedico: item.NM_MEDICO ? item.NM_MEDICO : '',
                        idMedico: item.CD_MEDICO ? item.CD_MEDICO : '',
                        data: item.DT_AGENDA2 ? item.DT_AGENDA2 : '', //para o app
                        data2: item.DT_AGENDA3 ? item.DT_AGENDA3 : '', //para o web
                        unidade: {
                            id: item.CD_UNIDADE ? item.CD_UNIDADE : 0,
                            nome: item.NM_UNIDADE ? item.NM_UNIDADE : '',
                        },
                    };

                    horarios.push(horario);
                }

                retorno.mensagem = 'Sucesso ao listar horarios disponíveis';
                retorno.dados = horarios;
            } else {
                retorno.mensagem = 'Sem horarios disponíveis';
            }

            retorno.codigo = 0;
            retorno.sucesso = true;
        })
        .finally(() => db.close())
        .catch(err => {
            console.log('Erro ao listar horarios disponiveis', err);
            dados = [];
        });

    return retorno;
}

async function buscarDadosPaciente(cdPessoaFisica) {
    let retorno = {
        status: false,
        msg: '',
    };

    const db = await oracledb.getConnection();
    await db
        .execute(
            `
        SELECT  A.CD_CONVENIO,
                '' AS ANO,
                '' AS NR_SEQUENCIA,
                A.NM_PACIENTE,
                A.CD_PESSOA_FISICA CD_PESSOA_FISICA_PACIENTE,
                A.CD_EMPRESA,
                (SELECT A1.NM_EMPRESA FROM tasy.EMPRESA_REFERENCIA A1 WHERE A1.CD_EMPRESA = A.CD_EMPRESA) DS_EMPRESA,
                A.CD_PLANO_CONVENIO,
                (select ds_convenio from tasy.CONVENIO A3 where A3.cd_convenio = A.cd_convenio) DS_CONVENIO,
                A.CD_CATEGORIA,
                A.CD_TIPO_ACOMOD_CONV,
                A.NR_ATENDIMENTO,
                A2.ie_sexo,
                A2.dt_nascimento,
                A2.nr_cpf
        FROM tasy.ATENDIMENTO_PACIENTE_V A
        JOIN tasy.pessoa_fisica A2 ON A2.cd_pessoa_fisica = A.CD_PESSOA_FISICA
        WHERE A.CD_PESSOA_FISICA = :CD_PESSOA_FISICA
        AND A.DT_ALTA IS NOT NULL
        AND A.CD_EMPRESA IS NOT NULL
        ORDER BY A.DT_ENTRADA DESC
        FETCH first 1 rows only
    `, {
                ':CD_PESSOA_FISICA': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: cdPessoaFisica.toString(),
                },
            }, {
                outFormat: oracledb.OBJECT,
                autoCommit: true,
            },
        )
        .then(result => {
            if (result.rows.length > 0) {
                (retorno.status = true),
                (retorno.msg = 'Sucesso ao obter agenda');
                retorno.dados = result.rows;
            } else {
                retorno.msg = 'Médico não possui agenda';
            }
        })
        .finally(function() {
            db.close();
        })
        .catch(err => {
            console.log(`Erro ao obter agenda: ${err}`);
            retorno.msg = `Erro ao obter agenda`;
        });
    return retorno;
}

async function confirmarAgendamentoRetorno(
    idCliente,
    idDependente,
    idConvenio,
    codigoCarteirinha,
    idAgenda,
    dataAgenda,
    idEmpresa,
    tipo,
) {
    // padrao do retorno da api v1
    let retorno = {
        codigo: 1,
        sucesso: false,
        mensagem: '',
        dados: {},
    };

    let dadosLog = {
        idClienteLog: idCliente,
        idDependenteLog: idDependente,
    };

    let idCadastro = '';
    //tratamento para dependente
    if (idCliente == idDependente) {
        idCadastro = idCliente;
    } else {
        idCadastro = idDependente;
    }

    //funcao no momento so está tratando o agendamento de consulta
    let result = await agendamentoRetorno.confirmarConsulta(
        idCadastro,
        idConvenio,
        codigoCarteirinha,
        idAgenda,
        dataAgenda,
        idEmpresa, [],
        0,
        tipo,
        dadosLog,
    );

    //console.log(result)
    retorno.codigo = 0;
    retorno.sucesso = result.situacao == 0 ? true : false;
    retorno.mensagem = result.msg;
    retorno.dados = {
        situacaoAgendamento: result.situacao,
        mensagensErro: result.situacao != 0 ? result.msg : '',
        carencias: result.carencias,
        idhorario: result.idHorario, //usado para cancelar se quiser depois de feito
    };

    return retorno;
}

async function listarHorariosDisponiveisAmb(
    idConvenio,
    idEspecialidade,
    idProfissional,
    idCliente,
) {
    // padrao do retorno da api v1
    let retorno = {
        codigo: 1,
        sucesso: false,
        mensagem: '',
        dados: [],
    };

    let dados = '';

    let queryPrincipal = `
    with 
    agenda_epecial as (
    select cd_agenda, cd_medico from appv2.VW_PACIENTES_AGENDAS_ESPECIAL 
    where cd_pessoa_fisica = :idCliente
    ),
    agenda_minima_normal as (
        select     
            AC.NR_SEQUENCIA,
            AC.DT_AGENDA as dt_agenda_min, 
            A.CD_ESPECIALIDADE,
            A.CD_PROCEDENCIA, 
            A.CD_AGENDA,
            a.cd_pessoa_fisica as cd_medico,
            a.CD_SETOR_EXCLUSIVO,
            'N' as tipo
        from tasy.agenda_consulta ac
        join tasy.agenda a on a.cd_agenda = ac.cd_agenda
        join tasy.agenda_turno at on ac.cd_agenda = at.cd_agenda 
        
        left join TASY.AGENDA_TURNO_CONV ATC on atc.nr_seq_turno = at.nr_sequencia and atc.cd_agenda = at.cd_agenda
        
        where ac.dt_agenda between nvl(at.dt_inicio_vigencia, trunc(sysdate)) and nvl((at.dt_final_vigencia + 1) - (1/24/60/60), sysdate + (select MAX_DIAS_APRAZ from appv2.parametros_config_sistema) )
            and to_char(ac.dt_agenda, 'hh24:mi') between nvl(to_char( at.hr_inicial, 'HH24:MI' ), '00:00') and nvl(to_char( at.hr_final, 'HH24:MI' ), '23:59')
            and at.IE_DIA_SEMANA    in (to_char(ac.dt_agenda, 'd'), 9)  
            and ac.dt_agenda between sysdate and sysdate + (select MAX_DIAS_APRAZ from appv2.parametros_config_sistema)  
            and ac.ie_status_agenda in ('L')
            
            /* and nvl(atc.QT_PERMISSAO, 1) > 0
            and nvl(IE_ATENDE_CONVENIO, 'S') = 'S'
            */
            AND A.IE_SITUACAO      = 'A' 
            --AND A.IE_AGENDA_WEB    = 'S' 
            AND A.CD_SETOR_EXCLUSIVO IS NOT NULL
            
            AND (
                NOT(atc.ie_atende_convenio = 'N' AND atc.cd_convenio = :idConvenio)        
                OR(nvl(atc.ie_atende_convenio, 'S') = 'S' AND nvl(atc.cd_convenio, :idConvenio) = :idConvenio)
           )
            and a.cd_especialidade = :idEspecialidade
            and a.cd_pessoa_fisica = :idProfissional
            
            and not exists(select  1 
                            from tasy.agenda_bloqueio ab 
                            where ab.cd_agenda = a.cd_agenda and ac.dt_agenda between ab.dt_inicial and (ab.dt_final + 1) - (1/24/60/60)
                                and to_char(ac.dt_agenda, 'hh24:mi') between nvl(to_char(ab.HR_INICIO_BLOQUEIO, 'hh24:mi'), '00:00') and nvl(to_char(ab.HR_FINAL_BLOQUEIO, 'hh24:mi'), '23:59')           
                            )
            
        
    ),
    agenda_minima_especial as (
        select    
                AC.NR_SEQUENCIA,
                (AC.DT_AGENDA + 1/24/60) DT_AGENDA_proximo, 
                A.CD_ESPECIALIDADE,
                A.CD_PROCEDENCIA, 
                A.CD_AGENDA,
                a.cd_pessoa_fisica as cd_medico,
                a.CD_SETOR_EXCLUSIVO,
                'S' as tipo
        from tasy.agenda_consulta ac
        join tasy.agenda a on a.cd_agenda = ac.cd_agenda
        join tasy.agenda_turno at on ac.cd_agenda = at.cd_agenda 
        join agenda_epecial ae on ae.cd_agenda = ac.cd_agenda and a.cd_pessoa_fisica = ae.cd_medico
        left join TASY.AGENDA_TURNO_CONV ATC on atc.nr_seq_turno = at.nr_sequencia and atc.cd_agenda = at.cd_agenda
        
        where ac.dt_agenda between nvl(at.dt_inicio_vigencia, trunc(sysdate)) and nvl((at.dt_final_vigencia + 1) - (1/24/60/60), sysdate + (select MAX_DIAS_APRAZ from appv2.parametros_config_sistema) )
            and to_char(ac.dt_agenda, 'hh24:mi') between nvl(to_char( at.hr_inicial, 'HH24:MI' ), '00:00') and nvl(to_char( at.hr_final, 'HH24:MI' ), '23:59')
            and at.IE_DIA_SEMANA    in (to_char(ac.dt_agenda, 'd'), 9)  
            and ac.dt_agenda between (sysdate+1) and sysdate + (select MAX_DIAS_APRAZ from appv2.parametros_config_sistema)  
            and ac.ie_status_agenda in ('M', 'N', 'L')
            
            /*and nvl(atc.QT_PERMISSAO, 1) > 0
            and nvl(IE_ATENDE_CONVENIO, 'S') = 'S'
            */
            AND A.IE_SITUACAO = 'A' 
            --AND A.IE_AGENDA_WEB = 'S' 
            AND A.CD_SETOR_EXCLUSIVO IS NOT NULL
            
            AND (
                NOT(atc.ie_atende_convenio = 'N' AND atc.cd_convenio = :idConvenio)        
                OR(nvl(atc.ie_atende_convenio, 'S') = 'S' AND nvl(atc.cd_convenio, :idConvenio) = :idConvenio)
            )
            and a.cd_especialidade = :idEspecialidade
            and a.cd_pessoa_fisica = :idProfissional
            
            and not exists(select  1 
                            from tasy.agenda_bloqueio ab 
                            where ab.cd_agenda = a.cd_agenda and ac.dt_agenda between ab.dt_inicial and (ab.dt_final + 1) - (1/24/60/60)
                                and to_char(ac.dt_agenda, 'hh24:mi') between nvl(to_char(ab.HR_INICIO_BLOQUEIO, 'hh24:mi'), '00:00') and nvl(to_char(ab.HR_FINAL_BLOQUEIO, 'hh24:mi'), '23:59')
                            
                            )
            AND (  select 
                        count(distinct cd_pessoa_fisica) 
                    from samel.agenda_espcecial_controle 
                    where cd_medico = a.cd_pessoa_fisica and dt_agenda between trunc(ac.dt_agenda) and trunc(ac.dt_agenda + 1) - (1/24/60/60)
            ) <= 2 
        order by trunc(ac.DT_AGENDA) asc, ac.DT_AGENDA desc 
        fetch first 1 row only
    )
    select distinct a.nr_sequencia, a.cd_especialidade, 
                    e.ds_especialidade, a.cd_agenda, 
                    to_char(a.dt_agenda_min, 'dd/mm/yyyy hh24:mi') as dt_agenda3, 
                    to_char(a.dt_agenda_min, 'yyyy/mm/dd hh24:mi:ss') as dt_agenda2, 
                    a.dt_agenda_min,
                    initcap(d.nm_pessoa_fisica) as nm_medico,
                    d.cd_pessoa_fisica as cd_medico, 
                    tipo as hora_especial, 
                    c.nm_unidade, 
                    c.cd_unidade 
    from (
        select * from agenda_minima_normal a
            union all 
        select * from agenda_minima_especial b
    ) a
    join appv2.tb_unidade_setor b on b.cd_setor       = a.cd_setor_exclusivo
    join appv2.tb_unidade       c on c.cd_unidade     = b.cd_unidade
    join tasy.pessoa_fisica d on d.cd_pessoa_fisica = a.cd_medico
    join tasy.especialidade_medica e on e.cd_especialidade = a.cd_especialidade
    where nvl(a.cd_procedencia, 0) not in(17)
    order by hora_especial desc, dt_agenda_min asc
`;

    const db = await oracledb.getConnection();
    await db
        .execute(
            queryPrincipal, {
                idEspecialidade: {
                    dir: oracledb.BIND_IN,
                    type: oracledb.NUMBER,
                    val: Number(idEspecialidade),
                },
                idProfissional: {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: idProfissional.toString(),
                },
                idConvenio: {
                    dir: oracledb.BIND_IN,
                    type: oracledb.NUMBER,
                    val: Number(idConvenio),
                },
                idCliente: {
                    dir: oracledb.BIND_IN,
                    type: oracledb.NUMBER,
                    val: Number(idCliente),
                },
            }, {
                outFormat: oracledb.OBJECT,
            },
        )
        .then(result => {
            //se encontrou algo entao pega a primeira posicao
            if (result.rows.length > 0) {
                dados = result.rows;

                let horarios = [];

                for (let item of dados) {
                    //reescrevendo para mobile e front
                    let horario = {
                        id: item.NR_SEQUENCIA ? item.NR_SEQUENCIA : 0,
                        idAgenda: item.CD_AGENDA ? item.CD_AGENDA : 0,
                        horaEspecial: item.HORA_ESPECIAL ?
                            item.HORA_ESPECIAL :
                            'N',
                        especialidadeAgenda: {
                            id: item.CD_ESPECIALIDADE ?
                                item.CD_ESPECIALIDADE :
                                0,
                            descricao: item.DS_ESPECIALIDADE ?
                                item.DS_ESPECIALIDADE :
                                '',
                        },
                        nmMedico: item.NM_MEDICO ? item.NM_MEDICO : '',
                        idMedico: item.CD_MEDICO ? item.CD_MEDICO : '',
                        data: item.DT_AGENDA2 ? item.DT_AGENDA2 : '', //para o app
                        data2: item.DT_AGENDA3 ? item.DT_AGENDA3 : '', //para o web
                        unidade: {
                            id: item.CD_UNIDADE ? item.CD_UNIDADE : 0,
                            nome: item.NM_UNIDADE ? item.NM_UNIDADE : '',
                        },
                    };
                    horarios.push(horario);
                }
                dados = horarios;
            } else {
                dados = [];
            }
        })
        .finally(() => db.close())
        .catch(err => {
            console.log('Erro ao listar horarios disponiveis', err);
            dados = [];
        });

    retorno.codigo = 0;
    retorno.sucesso = true;
    retorno.mensagem =
        'Sucesso ao listar horarios disponiveis para ambulatorio';
    retorno.dados = dados;

    return retorno;
}

//desenvolvimento
async function obterAgendaMedico(cdAgenda) {
    let retorno = {
        status: false,
        msg: '',
    };

    const db = await oracledb.getConnection();
    await db
        .execute(
            `
	select 
    		a.CD_AGENDA,
		a.NR_SEQUENCIA,
    		a.CD_CONVENIO,
		a.NM_PACIENTE,
		a.IE_STATUS_AGENDA,
    		a.CD_CONVENIO_TURNO,
    		a.CD_EMPRESA_REF,
    		b.CD_ESPECIALIDADE,
    		a.CD_PESSOA_FISICA,
		a.DT_NASCIMENTO_PAC,
    		a.CD_USUARIO_CONVENIO,
    		a.NR_ATENDIMENTO,
		a.DT_AGENDAMENTO,
		to_char(a.dt_agendamento, 'dd/mm/yyyy hh24:mi') as DT_AGENDAMENTO_FORMATADO,
    		a.NR_SEQ_PAC_SENHA_FILA,
    		b.CD_SETOR_EXCLUSIVO,
		a.DT_AGENDA,
		to_char(a.dt_agenda, 'dd/mm/yyyy hh24:mi') as DT_AGENDA_FORMATADA,
    		tasy.obter_ds_setor_atendimento(b.CD_SETOR_EXCLUSIVO) as local,
		a.ie_classif_agenda,
		c.nm_guerra as NM_MEDICO

	from tasy.agenda b
	join tasy.agenda_consulta a on a.cd_agenda = b.cd_agenda
	join tasy.medico c on b.cd_pessoa_fisica = c.cd_pessoa_fisica
	where (b.cd_pessoa_fisica, b.cd_especialidade) in (select cd_pessoa_fisica, cd_especialidade from tasy.agenda where cd_agenda = :cd_agenda)
	and a.IE_STATUS_AGENDA in ('M','N', 'L')
    --and a.IE_STATUS_AGENDA in ('L')
	and a.dt_agenda between trunc(sysdate) and trunc(sysdate) + ( select MAX_DIAS_APRAZ from APPV2.parametros_config_sistema) - (5)
    `, {
                ':CD_AGENDA': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: cdAgenda.toString(),
                },
            }, {
                outFormat: oracledb.OBJECT,
                autoCommit: true,
            },
        )
        .then(result => {
            if (result.rows.length > 0) {
                (retorno.status = true),
                (retorno.msg = 'Sucesso ao obter agenda');
                retorno.dados = result.rows;
            } else {
                retorno.msg = 'Médico não possui agenda';
            }
        })
        .finally(function() {
            db.close();
        })
        .catch(err => {
            console.log(`Erro ao obter agenda: ${err}`);
            retorno.msg = `Erro ao obter agenda`;
        });
    return retorno;
}

async function obterDatasParaEncaixe(cdAgenda) {
    let retorno = {
        status: false,
        msg: '',
    };

    const db = await oracledb.getConnection();
    await db
        .execute(
            `select
                        cd_agenda,
                        dt_agenda,
                        to_char(a.dt_agenda, 'DD/MM/YYYY') as dt_agenda_string,
                        qt_encaixe,
                        qt_encaixes_realizados,
                        to_char(a.hr_inicial_bloqueio, 'HH24:MI') as hr_inicial_bloqueio,
                        to_char(a.hr_final_bloqueio, 'HH24:MI') as hr_final_bloqueio,
                        concat_horario_atendimento
                    from samel.ob_datas_p_encaixe_consulta_v a 
                    where cd_agenda = :CD_AGENDA
                    and concat_horario_atendimento is not null
                    order by a.dt_agenda asc`, {
                ':CD_AGENDA': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: cdAgenda.toString(),
                },
            }, {
                outFormat: oracledb.OBJECT,
                autoCommit: true,
            },
        )
        .then(result => {
            if (result.rows.length > 0) {
                (retorno.status = true),
                (retorno.msg = 'Sucesso ao obter datas para encaixe');
                retorno.dados = result.rows;
            } else {
                retorno.msg = 'Médico não possui datas de encaixe';
            }
        })
        .finally(function() {
            db.close();
        })
        .catch(err => {
            console.log(`Erro ao obter datas para encaixe: ${err}`);
            retorno.msg = `Erro ao obter datas para encaixe`;
        });
    return retorno;
}

async function obterMotivosEncaixe() {
    let retorno = {
        status: false,
        msg: '',
    };

    const db = await oracledb.getConnection();
    await db
        .execute(
            `select  nr_sequencia,
                        ds_motivo_encaixe
                    from    tasy.motivo_encaixe_agenda`, {}, {
                outFormat: oracledb.OBJECT,
                autoCommit: true,
            },
        )
        .then(result => {
            (retorno.status = true),
            (retorno.msg = 'Sucesso ao obter motivos encaixe');
            retorno.dados = result.rows;
        })
        .finally(function() {
            db.close();
        })
        .catch(err => {
            console.log(`Erro ao obter motivos encaixe: ${err}`);
            retorno.msg = `Erro ao obter motivos encaixe`;
        });
    return retorno;
}

async function consistirEncaixe(
    cdAgenda,
    dtAgenda,
    hrEncaixe,
    cdPessoaFisica,
    cdConvenio,
    nmUsuario,
) {
    let retorno = {
        status: false,
        msg: '',
    };

    const db = await oracledb.getConnection();
    await db
        .execute(
            `BEGIN
                        tasy.wheb_usuario_pck.set_cd_perfil(2161);
                        TASY.CONSISTIR_ENCAIXE_AGECONS(cd_agenda_destino_p => :CD_AGENDA,
                                                    nr_seq_origem_p => null,
                                                    dt_encaixe_p => TO_DATE(:DT_AGENDA,'DD/MM/YYYY'),
                                                    ie_encaixe_transf_p => 'N',
                                                    nm_usuario_p => :NM_USUARIO,
                                                    cd_estabelecimento_p => 1,
                                                    hr_encaixe_p => TO_DATE(:HR_ENCAIXE,'DD/MM/YYYY HH24:MI'),
                                                    cd_convenio_p => :CD_CONVENIO,
                                                    cd_plano_convenio_p => '',
                                                    cd_categoria_p => '',
                                                    cd_pessoa_fisica_p => :CD_PESSOA_FISICA,
                                                    ds_aviso_p => :DS_AVISO_O,
                                                    ds_erro_p => :DS_ERRO_O
                                                    );
                    END;`, {
                ':CD_AGENDA': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.NUMBER,
                    val: Number(cdAgenda),
                },
                ':DT_AGENDA': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: dtAgenda,
                },
                ':NM_USUARIO': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: nmUsuario,
                },
                ':HR_ENCAIXE': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: hrEncaixe,
                },
                ':CD_CONVENIO': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.NUMBER,
                    val: Number(cdConvenio),
                },
                ':CD_PESSOA_FISICA': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: cdPessoaFisica.toString(),
                },
                ':DS_AVISO_O': {
                    dir: oracledb.BIND_OUT,
                    type: oracledb.STRING,
                },
                ':DS_ERRO_O': { dir: oracledb.BIND_OUT, type: oracledb.STRING },
            }, {
                outFormat: oracledb.OBJECT,
                autoCommit: true,
            },
        )
        .then(result => {
            if (!result.outBinds[':DS_AVISO_O'] ||
                !result.outBinds[':DS_ERRO_O']
            ) {
                retorno.status = true;
            } else {
                retorno.msg = result.outBinds[':DS_AVISO_O'];
            }
        })
        .finally(function() {
            db.close();
        })
        .catch(err => {
            console.log(`Erro ao consistir encaixe: ${err.message}`);
            console.log(
                'existe -------------------------',
                err.message.includes(
                    'O horário informado já existe para esta agenda',
                ),
            );
            retorno.msg = `Não Foi possível gerar encaixe nesse horário: ${err.message}`;
        });
    return retorno;
}

async function verificarAgendarEncaixe(cdPessoaFisica, cdAgenda, dtAgenda) {
    let retorno = {
        status: false,
        msg: '',
        dados: [],
    };

    const db = await oracledb.getConnection();
    await db
        .execute(
            `select
                        *
                        from APPV2.VW_LISTAR_AGEN_CONSULTA  a
                        where 1 = 1
                        and cd_pessoa_fisica = :CD_PESSOA_FISICA
                        and cd_agenda = :CD_AGENDA
                        and ie_cancelado = 0
                        and trunc(dt_agenda) = to_date(:DT_AGENDA, 'DD-MM-YYYY')`, {
                ':CD_AGENDA': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.NUMBER,
                    val: Number(cdAgenda),
                },
                ':DT_AGENDA': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: dtAgenda,
                },
                ':CD_PESSOA_FISICA': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: cdPessoaFisica.toString(),
                },
            }, {
                outFormat: oracledb.OBJECT,
                autoCommit: true,
            },
        )
        .then(result => {
            retorno.status = true;
            retorno.msg = 'Sucesso verificar agendamento';
            retorno.dados = result.rows;
        })
        .finally(function() {
            db.close();
        })
        .catch(err => {
            console.log(`Erro verificar agendamento: ${err}`);
            retorno.msg = 'Erro ao verificar agenda';
        });
    return retorno;
}

async function gerarEncaixe(
    cdAgenda,
    dtAgenda,
    hrEncaixe,
    cdPessoaFisica,
    nmPessoaFisica,
    cdConvenio,
    cdMedico,
    dsObservacao,
    nmUsuario,
    motivo,
) {
    let retorno = {
        status: false,
        msg: '',
    };

    const db = await oracledb.getConnection();
    await db
        .execute(
            `BEGIN
                        tasy.wheb_usuario_pck.set_cd_perfil(2161);
                        TASY.GERAR_ENCAIXE_AGECONS(cd_estabelecimento_p => 1,
                                                cd_agenda_p => :CD_AGENDA ,
                                                dt_agenda_p => to_date(:DT_AGENDA,'dd/mm/yyyy'),
                                                hr_encaixe_p => to_date(:HR_ENCAIXE,'dd/mm/yyyy hh24:mi'),
                                                qt_duracao_p => 0,
                                                cd_pessoa_fisica_p => :CD_PESSOA_FISICA,
                                                nm_pessoa_fisica_p => :NM_PESSOA_FISICA,
                                                cd_convenio_p => :CD_CONVENIO,
                                                cd_medico_req_p => :CD_MEDICO,
                                                ds_observacao_p => :DS_OBSERVACAO,
                                                nr_seq_agenda_rxt_p	=> 0,
                                                nr_seq_motivo_encaixe_p => :MOTIVO,
                                                ie_classif_agenda_p => 'C',
                                                nm_usuario_p => :NM_USUARIO,
                                                nr_seq_agecir_p => NULL,
                                                nr_seq_encaixe_p => :NR_SEQUENCIA_O,
                                                cd_categoria_p => NULL,
                                                cd_plano_p => NULL,
                                                nr_seq_gercon_p => NULL);
                    END;`, {
                ':CD_AGENDA': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.NUMBER,
                    val: Number(cdAgenda),
                },
                ':DT_AGENDA': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: dtAgenda,
                },
                ':NM_USUARIO': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: nmUsuario,
                },
                ':HR_ENCAIXE': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: hrEncaixe,
                },
                ':CD_CONVENIO': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.NUMBER,
                    val: Number(cdConvenio),
                },
                ':CD_PESSOA_FISICA': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: cdPessoaFisica.toString(),
                },
                ':NM_PESSOA_FISICA': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: nmPessoaFisica,
                },
                ':CD_MEDICO': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.NUMBER,
                    val: Number(cdMedico),
                },
                ':DS_OBSERVACAO': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: dsObservacao,
                },
                ':MOTIVO': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.NUMBER,
                    val: Number(motivo),
                },
                ':NR_SEQUENCIA_O': {
                    dir: oracledb.BIND_OUT,
                    type: oracledb.STRING,
                },
            }, {
                outFormat: oracledb.OBJECT,
                autoCommit: true,
            },
        )
        .then(result => {
            retorno.status = true;
            (retorno.msg = 'Sucesso ao realizar agendamento'),
            (retorno.dados = result.outBinds[':NR_SEQUENCIA_O']);
        })
        .finally(function() {
            db.close();
        })
        .catch(err => {
            console.log(`Erro ao agendar encaixe: ${err}`);
            retorno.msg = 'Erro ao agendar encaixe';
        });
    return retorno;
}

async function obterDadosAgendamento(nrSeqAgendamento) {
    let retorno = {
        status: false,
        msg: '',
    };

    const db = await oracledb.getConnection();
    await db
        .execute(
            `SELECT
                        c.nr_sequencia as nr_seq_agec,
                        nvl(tasy.obter_desc_setor_atend(d.CD_SETOR_EXCLUSIVO),'Ambulatório Matriz') as ds_setor_agenda,
                        to_char(c.dt_agenda,'dd/mm/rrrr hh24:mi') as hr_agenda,
                        tasy.obter_nome_pf(d.cd_pessoa_fisica)||' (CRM '|| tasy.obter_crm_medico(d.cd_pessoa_fisica)||')' as nm_medico,
                        tasy.obter_desc_espec_medica(d.cd_especialidade) as ds_especialidade,
                        tasy.obter_valor_dominio(83,c.ie_status_agenda) as ie_status_agenda,
                        d.cd_agenda
                    FROM
                        tasy.agenda_consulta c
                        inner join tasy.agenda d on (c.cd_agenda = d.cd_agenda)
                        left join tasy.agenda_turno e on (c.nr_seq_turno = e.nr_sequencia)
                        left join tasy.agenda_turno_esp f on (c.nr_seq_turno_esp = f.nr_sequencia)
                    WHERE
                        c.nr_sequencia = :NR_SEQUENCIA`, {
                ':NR_SEQUENCIA': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: nrSeqAgendamento,
                },
            }, {
                outFormat: oracledb.OBJECT,
                autoCommit: true,
            },
        )
        .then(result => {
            retorno.status = true;
            retorno.msg = 'Sucesso ao obter dados do agendamento';
            retorno.dados = result.rows[0];
        })
        .finally(function() {
            db.close();
        })
        .catch(err => {
            console.log(`Erro ao obter dados do agendamento: ${err}`);
            retorno.msg = `Erro ao obter dados do agendamento`;
        });
    return retorno;
}

async function obterTaxaRetorno(cdAgenda) {
    let retorno = {
        status: false,
        msg: '',
    };

    const db = await oracledb.getConnection();
    await db
        .execute(
            `with  agendamentos as (select 
                            a.cd_agenda, 
                            f.nm_pessoa_fisica nm_medico,
                            tasy.obter_nome_especialidade(a.cd_especialidade) ds_especialidade,
                            f.nm_pessoa_fisica||' - '||tasy.obter_nome_especialidade(a.cd_especialidade)||' - '||a.ds_complemento ds_agenda,
                            b.dt_agenda,
                            c.cd_pessoa_fisica cd_paciente,
                            c.nm_pessoa_fisica nm_paciente,
                            tasy.obter_valor_dominio(83,b.ie_status_agenda) ds_status_agenda,
                            
                            (select nvl(max(1),0)
                            from tasy.agenda_consulta x
                            join tasy.atendimento_paciente y on x.nr_atendimento = y.nr_atendimento and y.dt_cancelamento is null
                            where x.cd_pessoa_fisica = b.cd_pessoa_fisica
                            and x.cd_agenda = a.cd_agenda
                            and x.dt_agenda between trunc(b.dt_agenda,'dd') -30 and trunc(b.dt_agenda,'dd')
                            and x.nr_atendimento is not NULL
                            and x.ie_status_agenda in ('E')
                            and b.dt_cancelamento is null
                            ) qt_retorno_30,
                            
                            (select nvl(max(1),0)
                            from tasy.agenda_consulta x
                            join tasy.atendimento_paciente y on x.nr_atendimento = y.nr_atendimento and y.dt_cancelamento is null
                            where x.cd_pessoa_fisica = b.cd_pessoa_fisica
                            and x.cd_agenda = a.cd_agenda
                            and x.dt_agenda between trunc(b.dt_agenda,'dd') -60 and trunc(b.dt_agenda,'dd') -31
                            and x.nr_atendimento is not NULL
                            and x.ie_status_agenda in ('E')
                            and b.dt_cancelamento is null
                            ) qt_retorno_31_a_60,
                            
                            (select nvl(max(1),0)
                            from tasy.agenda_consulta x
                            join tasy.atendimento_paciente y on x.nr_atendimento = y.nr_atendimento and y.dt_cancelamento is null
                            where x.cd_pessoa_fisica = b.cd_pessoa_fisica
                            and x.cd_agenda = a.cd_agenda
                            and x.dt_agenda between trunc(b.dt_agenda,'dd') -90 and trunc(b.dt_agenda,'dd') -61
                            and x.nr_atendimento is not null
                            and x.ie_status_agenda in ('E')
                            and b.dt_cancelamento is null
                            ) qt_retorno_61_a_90,
                            
                            b.nr_sequencia
                            
                            from tasy.agenda a
                            join tasy.agenda_consulta b on a.cd_agenda = b.cd_agenda
                            join tasy.pessoa_fisica c on b.cd_pessoa_fisica = c.cd_pessoa_fisica
                            join tasy.pessoa_fisica f on a.cd_pessoa_fisica = f.cd_pessoa_fisica
                            
                            
                            left join tasy.convenio d on b.cd_convenio = d.cd_convenio
                            left join tasy.atendimento_paciente e on b.nr_atendimento = e.nr_atendimento
                            left join tasy.atendimento_paciente g on b.nr_atendimento = g.nr_atendimento and g.dt_cancelamento is null
                            
                            where b.dt_agenda >= to_date('01/01/2021 00:00:00', 'dd/mm/yyyy hh24:mi:ss')
                            and a.ie_situacao = 'A'
                            and b.ie_status_agenda in ('E')
                            and b.dt_cancelamento is null
                            and a.cd_agenda = :CD_AGENDA
                    ),
                    agendamentos_agrupados as (
                    select cd_agenda, 
                    nm_medico                                                    , 
                    ds_especialidade                                             , 
                    ds_Agenda                                                    , 
                    to_char(dt_agenda, 'mm/yyyy')        as mes_ano              ,

                    sum(qt_retorno_30)                   as qt_retorno_30        ,
                    sum(qt_retorno_31_a_60)              as qt_retorno_31_a_60   ,
                    sum(qt_retorno_61_a_90)              as qt_retorno_61_a_90   ,
                    count(distinct nr_sequencia)         as qtd_pac_atendidos    ,
                    count(distinct trunc(dt_agenda))     as qtd_agendas                 
                    from agendamentos
                    group by nm_medico                                                  , 
                    ds_especialidade                                             , 
                    ds_Agenda                                                    , 
                    to_char(dt_agenda, 'mm/yyyy')                                ,
                    cd_agenda
                    )
                    select cd_agenda, 
                    nm_medico, 
                    ds_Especialidade, 
                    ds_agenda, 
                    mes_ano, 
                    qtd_pac_atendidos,
                    qt_retorno_30,
                    round(((qt_retorno_30   / qtd_pac_atendidos) * 100), 2)      || '%' as qt_retorno_30_percent,
                    qt_retorno_31_a_60,
                    round(((qt_retorno_31_a_60   / qtd_pac_atendidos) * 100), 2) || '%' as qt_retorno_31_a_60_percent,
                    qt_retorno_61_a_90,
                    round(((qt_retorno_61_a_90   / qtd_pac_atendidos) * 100), 2) || '%' as qt_retorno_61_a_90_percent
                    from tasy.agendamentos_agrupados`, {
                ':CD_AGENDA': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.NUMBER,
                    val: Number(cdAgenda),
                },
            }, {
                outFormat: oracledb.OBJECT,
                autoCommit: true,
            },
        )
        .then(result => {
            retorno.status = true;
            retorno.msg = 'Sucesso ao obter taxa de retorno da agenda';
            retorno.dados = result.rows;
        })
        .finally(function() {
            db.close();
        })
        .catch(err => {
            console.log(`Erro ao obter taxa de retorno da agenda: ${err}`);
            retorno.msg = `Erro ao obter taxa de retorno da agenda`;
        });
    return retorno;
}


async function verificarAgenda(cdAgenda, dataAgenda) {
    let retorno = {
        status: false,
        msg: '',
    };

    const db = await oracledb.getConnection();
    await db
        .execute(
            `select 
                ie_encaixe, 
                ie_status_agenda, 
                dt_agenda, 
                nr_sequencia, 
                cd_agenda, 
                cd_pessoa_fisica, 
                nm_paciente
            from agenda_consulta a
                where 1 = 1
                and cd_agenda = :CD_AGENDA
                and trunc(dt_agenda) = to_date(:DATA_AGENDA, 'yyyy/mm/dd')
                `, 
                {
                    ':CD_AGENDA': {dir: oracledb.BIND_IN, type: oracledb.STRING, val: cdAgenda.toString()},
                    ':DATA_AGENDA': {dir: oracledb.BIND_IN, type: oracledb.STRING, val: dataAgenda.toString()},
                }
                , {
                outFormat: oracledb.OBJECT,
                autoCommit: true,
            },
        )
        .then(result => {
            retorno.status = true;
            retorno.msg = 'Sucesso ao obter taxa de retorno da agenda';
            retorno.dados = result.rows;
        })
        .finally(function() {
            db.close();
        })
        .catch(err => {
            console.log(`Erro ao obter taxa de retorno da agenda: ${err}`);
            retorno.msg = `Erro ao obter taxa de retorno da agenda`;
        });
    return retorno;
}


async function listarExames(cdAgenda, cdConvenio) {
    let retorno = {
        status: false,
        msg: '',
    };

    const db = await oracledb.getConnection();
    await db
        .execute(
            `SELECT DISTINCT PI.NR_SEQUENCIA, PI.DS_PROC_EXAME, PI.DS_ORIENTACAO_PAC,
                        ah.qt_idade_min, ah.qt_idade_max, AR.CD_CONVENIO
                        FROM TASY.AGENDA_PACIENTE AP 
                        -- LEFT JOIN APPV2.TB_BLOQUEIO_HORARIO BH 
                        --     ON BH.NR_SEQUENCIA = AP.NR_SEQUENCIA AND BH.IE_TIPO_HORARIO = 'E' 
                        INNER JOIN TASY.AGENDA A 
                            ON A.CD_AGENDA = AP.CD_AGENDA 
                        INNER JOIN TASY.AGENDA_HORARIO AH 
                            ON AH.CD_AGENDA = A.CD_AGENDA 
                        INNER JOIN TASY.AGENDA_REGRA AR 
                            ON AR.CD_AGENDA = A.CD_AGENDA 
                        INNER JOIN TASY.PROC_INTERNO PI 
                            ON PI.NR_SEQUENCIA = AR.NR_SEQ_PROC_INTERNO 
                        WHERE AP.IE_STATUS_AGENDA = 'L' 
                        -- AND BH.CD_BLOQUEIO_HORARIO IS NULL 
                        AND AP.HR_INICIO >= SYSDATE 
                        AND AP.HR_INICIO <= SYSDATE + (select MAX_DIAS_APRAZ from appv2.parametros_config_sistema) 
                        AND A.IE_SITUACAO = 'A' 
                        AND A.IE_AGENDA_WEB = 'S'  
                        AND AR.IE_PERMITE = 'S' 
                        AND PI.IE_SITUACAO = 'A'
                        AND A.CD_AGENDA = :CD_AGENDA
                        AND AR.CD_CONVENIO = :CD_CONVENIO
                        ORDER BY PI.DS_PROC_EXAME`, {
                ':CD_AGENDA': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.NUMBER,
                    val: Number(cdAgenda),
                },
                ':CD_CONVENIO': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.NUMBER,
                    val: Number(cdConvenio),
                },
            }, {
                outFormat: oracledb.OBJECT,
                autoCommit: true,
            },
        )
        .then(result => {
            retorno.status = true;
            retorno.msg = 'Sucesso ao obter exames';
            retorno.dados = result.rows;
        })
        .finally(function() {
            db.close();
        })
        .catch(err => {
            console.log(`Erro ao obter exames: ${err}`);
            retorno.msg = `Erro ao obter exames`;
        });
    return retorno;
}

async function listarHorariosDisponiveisExame(cdAgenda) {
    let retorno = {
        status: false,
        msg: '',
    };

    const db = await oracledb.getConnection();
    await db
        .execute(
            `select CD_AGENDA,
                        DATA_AGENDA DT_AGENDA,
                        DATA_AGENDA data,
                        CD_UNIDADE,
                        NM_UNIDADE
                    from
                        appv2.VW_AGENDA_EXAMES_PRONTUARIO
                    where
                        CD_AGENDA = :CD_AGENDA
                        order by DATA_AGENDA ASC`, {
                ':CD_AGENDA': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.NUMBER,
                    val: Number(cdAgenda),
                },
            }, {
                outFormat: oracledb.OBJECT,
                autoCommit: true,
            },
        )
        .then(result => {
            retorno.status = true;
            retorno.msg = 'Sucesso ao obter taxa de retorno da agenda';
            retorno.dados = result.rows;
        })
        .finally(function() {
            db.close();
        })
        .catch(err => {
            console.log(`Erro ao obter taxa de retorno da agenda: ${err}`);
            retorno.msg = `Erro ao obter taxa de retorno da agenda`;
        });
    return retorno;
}

async function obterDatasEncaixeExame(cdAgenda) {
    let retorno = {
        status: false,
        msg: '',
    };

    const db = await oracledb.getConnection();
    await db
        .execute(
            `select 
                        cd_agenda,
                        to_char(a.dt_agenda, 'DD/MM/YYYY') as dt_agenda_string,
                        dt_agenda,
                        to_char(a.dt_agenda, 'DD/MM/YYYY') as data,
                        qt_encaixe,
                        qt_encaixes_realizados,
                        to_char(a.hr_inicial_bloqueio, 'HH24:MI') as hr_inicial_bloqueio,
                        to_char(a.hr_final_bloqueio, 'HH24:MI') as hr_final_bloqueio
                    from SAMEL.ob_datas_p_encaixe_exame_v a where cd_agenda = :CD_AGENDA 
                    order by a.dt_agenda asc`, {
                ':CD_AGENDA': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.NUMBER,
                    val: Number(cdAgenda),
                },
            }, {
                outFormat: oracledb.OBJECT,
                autoCommit: true,
            },
        )
        .then(result => {
            if (result.rows.length > 0) {
                retorno.status = true;
                retorno.msg = 'Sucesso ao obter datas para encaixe';
                retorno.dados = result.rows;
            } else {
                retorno.msg = 'O médico não possui agenda';
            }
        })
        .finally(function() {
            db.close();
        })
        .catch(err => {
            console.log(`Erro ao obter datas para encaixe: ${err}`);
            retorno.msg = `Erro ao obter datas para encaixe`;
        });
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
        console.log('RESULT ALTA >>>>> ', result);
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

async function agendarEncaixeExame(CD_AGENDA, DT_AGENDA, HR_ENCAIXE, CD_PESSOA_FISICA, NM_PESSOA_FISICA, CD_CONVENIO, PROC_INTERNO, CD_MEDICO, CD_CARTEIRINHA, CD_EMPRESA, CD_EXAMES, CD_MEDICO_REQ, DS_OBSERVACAO, NM_USUARIO){
    let retorno = {
        status: false,
        msg: '',
    };

    const db = await oracledb.getConnection();
    await db
        .execute(
            `BEGIN SAMEL.ENCAIXAR_EXAME(
                        cd_agenda_p => :CD_AGENDA,
                        dt_agenda_p => to_date(:DT_AGENDA, 'dd/mm/yyyy'),
                        hr_agenda_p => to_date(:HR_ENCAIXE, 'dd/mm/yyyy hh24:mi'),
                        nm_pessoa_fisica_p => :NM_PESSOA_FISICA,
                        nm_usuario_p => :NM_USUARIO,
                        cd_pessoa_fisica_p => :CD_PESSOA_FISICA,
                        cd_carteirinha_p => :CD_CARTEIRINHA,
                        cd_convenio_w => :CD_CONVENIO,
                        cd_categoria_w => '',
                        proc_interno_p => :PROC_INTERNO,
                        ds_observarcao_w => :DS_OBSERVACAO,
                        cd_empresa_ref_p => :CD_EMPRESA,
                        cd_exames_p => :CD_EXAMES,
                        cd_medico_req => :CD_MEDICO_REQ,
                        cd_plano_p => '',
                        agendou_o => :AGENDOU_O,
                        motivo_o => :MOTIVO_O,
                        nr_sequencia_o => :NR_SEQUENCIA_O,
                        ds_carteira_o => :DS_CARTEIRA_O
                        );
                    END;`, {
                ':CD_AGENDA': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.NUMBER,
                    val: Number(CD_AGENDA),
                },
                ':DT_AGENDA': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: DT_AGENDA,
                },
                ':HR_ENCAIXE': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: HR_ENCAIXE,
                },
                ':NM_PESSOA_FISICA': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: NM_PESSOA_FISICA,
                },
                ':NM_USUARIO': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: NM_USUARIO,
                },
                ':CD_PESSOA_FISICA': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.NUMBER,
                    val: Number(CD_PESSOA_FISICA),
                },
                ':CD_CARTEIRINHA': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: String(CD_CARTEIRINHA),
                },
                ':CD_CONVENIO': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.NUMBER,
                    val: Number(CD_CONVENIO),
                },
                ':PROC_INTERNO': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.NUMBER,
                    val: Number(PROC_INTERNO),
                },
                ':DS_OBSERVACAO': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: DS_OBSERVACAO,
                },
                ':CD_EMPRESA': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.NUMBER,
                    val: Number(CD_EMPRESA),
                },
                ':CD_EXAMES': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: String(CD_EXAMES),
                },
                ':CD_MEDICO_REQ': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.NUMBER,
                    val: Number(CD_MEDICO_REQ),
                },

                ':AGENDOU_O': { dir: oracledb.BIND_OUT, type: oracledb.STRING },
                ':MOTIVO_O': { dir: oracledb.BIND_OUT, type: oracledb.STRING },
                ':NR_SEQUENCIA_O': {
                    dir: oracledb.BIND_OUT,
                    type: oracledb.NUMBER,
                },
                ':DS_CARTEIRA_O': {
                    dir: oracledb.BIND_OUT,
                    type: oracledb.STRING,
                },
            }, {
                outFormat: oracledb.OBJECT,
                autoCommit: true,
            },
        )
        .then(result => {
            console.log(result.outBinds[':NR_SEQUENCIA_O']);
            if (result.outBinds[':NR_SEQUENCIA_O']) {
                retorno.status = true;
                retorno.msg = 'Sucesso ao agendar encaixe de exame';
            } else {
                retorno.msg = result.outBinds[':MOTIVO_O'];
            }
        })
        .finally(function() {
            db.close();
        })
        .catch(err => {
            console.log(`Erro ao obter datas para encaixe: ${err}`);
            retorno.msg = `Erro ao obter datas para encaixe`;
        });
    return retorno;
}

async function buscarMedicoMemed(dsMedico) {
    retorno = {
        status: false,
        msg: '',
    };

    const pesquisa_medico = `%${dsMedico}%`;

    const db = await oracledb.getConnection();
    await db
        .execute(
            `select    a.nm_guerra, 
                                a.uf_crm, 
                                b.cd_pessoa_fisica, 
                                b.nm_pessoa_fisica_sem_acento nome_medico, 
                                b.nr_cpf, 
                                TO_CHAR(b.dt_nascimento, 'DD/MM/YYYY') dt_nascimento, 
                                b.ie_sexo, 
                                b.ds_codigo_prof, 
                                tasy.obter_especialidade_medico(b.cd_pessoa_fisica, 'C') especialidade  from tasy.medico a
                            inner join tasy.pessoa_fisica b on a.cd_pessoa_fisica = b.cd_pessoa_fisica
                            where upper(nm_guerra) like upper(:DS_MEDICO)
                            FETCH FIRST 10 ROWS ONLY`, {
                ':DS_MEDICO': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: pesquisa_medico,
                },
            }, {
                outFormat: oracledb.OBJECT,
            },
        )
        .then(result => {
            if (result.rows.length > 0) {
                retorno.status = true;
                retorno.msg = 'Sucesso ao obter médico';
                retorno.dados = result.rows;
            } else {
                retorno.msg = 'Sem médicos com essa descrição';
            }
        })
        .finally(function() {
            db.close();
        })
        .catch(err => {
            console.log(`Erro ao obter médico: ${err}`);
            retorno.msg = 'Erro ao obter médico';
        });
    return retorno;
}

async function updatePassWord(cdPessoaFisica, password) {
    let retorno = {
        status: false,
        msg: '',
    };

    const passwordCrypted = encrypt(password);

    const db = await oracledb.getConnection();
    await db
        .execute(
            `UPDATE SAMEL.USUARIOS_PRONTUARIO
                        SET senha_prontuario = :PASSWORD
                        WHERE cd_pessoa_fisica = :CD_PESSOA_FISICA`, {
                ':CD_PESSOA_FISICA': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: cdPessoaFisica,
                },
                ':PASSWORD': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: passwordCrypted,
                },
            }, {
                outFormat: oracledb.OBJECT,
                autoCommit: true,
            },
        )
        .then(result => {
            console.log(result);
            if (result.rowsAffected > 0) {
                retorno.status = true;
                retorno.msg = passwordCrypted;
            } else {
                retorno.msg = 'Erro ao atualizar senha';
            }
        })
        .finally(function() {
            db.close();
        })
        .catch(err => {
            console.log(`Erro ao atualizat senha: ${err}`);
            retorno.msg = 'Erro ao atualizar senha';
        });
    return retorno;
}

const encrypt = pwdDoctor => {
    const hash = crypto
        .createHmac('sha256', secret)
        .update(pwdDoctor)
        .digest('hex');
    return hash;
};

const resetarSenhaMedico = async(crm = null) => {
    if (crm == null) {
        return [];
    }

    const retorno = new Object();

    const sql = `
    update samel.USUARIOS_PRONTUARIO
    set SENHA_PRONTUARIO = :default_password
    where DS_CODIGO_PROF = :crm
    `;

    const recort = await oracledb.getConnection();

    await recort
        .execute(
            sql, {
                ':crm': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: crm.toString(),
                },
                ':default_password': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: encrypt('S@mel123'),
                },
            }, {
                outFormat: oracledb.OBJECT,
                autoCommit: true,
            },
        )
        .then(result => {
            if (result.rowsAffected == 1) {
                retorno.status = 'success';
            } else {
                retorno.status = 'warning';
                retorno.message = result.rowsAffected;
            }
        })
        .finally(() => recort.close())
        .catch(e => {
            console.error('catch block resetPassword > ', e);
            return [];
        });

    return retorno;
};

const buscarRetornoPorProtocolo = async(nr_sequencia = null) => {
    if (nr_sequencia == null) {
        return [];
    }

    const sql = `
    select distinct
       a.nr_sequencia               as NR_SEQUENCIA,
       a.dt_agenda                  as DT_AGENDA,
       a.dt_agendamento             as DT_AGENDAMENTO,
       a.nm_pessoa_fisica_med       as NM_MEDICO,
       a.cd_pessoa_fisica_med       as CD_PESSOA_FISICA_MEDICO,
       a.ds_especialidade           as DS_ESPECIALIDADE,
       a.cd_especialidade           as CD_ESPECIALIDADE,
       a.nm_unidade                 as NM_UNIDADE,
       a.cd_unidade                 as CD_UNIDADE,
       c.ds_usuario                 as DS_USUARIO,
       c.nm_usuario                 as NM_USUARIO
    from APPV2.VW_LISTAR_AGEN_CONSULTA  a
    join tasy.agenda_consulta           b on a.nr_sequencia = b.nr_sequencia
    join tasy.usuario                   c on b.nm_usuario = c.nm_usuario
    where 1 = 1
    and a.nr_sequencia = :nr_sequencia
    order by a.dt_agenda desc
    `;

    const recort = await oracledb.getConnection();

    const data = await recort
        .execute(
            sql, {
                ':nr_sequencia': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: nr_sequencia.toString(),
                },
            }, {
                outFormat: oracledb.OBJECT,
            },
        )
        .then(result => {
            // console.log(result.rows);
            return result.rows;
        })
        .finally(() => recort.close())
        .catch(e => {
            console.error('catch block buscarRetornoPorProtocolo > ', e);
            return [];
        });

    return data;
};

const buscarRetornoPorPacienteAndAgenda = async(
    cd_pessoa_fisica_paciente = null,
    cd_agenda = null,
) => {
    if (cd_pessoa_fisica_paciente == null || cd_agenda == null) {
        return [];
    }

    const sql = `
    select distinct
       a.nr_sequencia               as NR_SEQUENCIA,
       a.dt_agenda                  as DT_AGENDA,
       a.dt_agendamento             as DT_AGENDAMENTO,
       a.nm_pessoa_fisica_med       as NM_MEDICO,
       a.cd_pessoa_fisica_med       as CD_PESSOA_FISICA_MEDICO,
       a.ds_especialidade           as DS_ESPECIALIDADE,
       a.cd_especialidade           as CD_ESPECIALIDADE,
       a.nm_unidade                 as NM_UNIDADE,
       a.cd_unidade                 as CD_UNIDADE,
       c.ds_usuario                 as DS_USUARIO,
       c.nm_usuario                 as NM_USUARIO
    from APPV2.VW_LISTAR_AGEN_CONSULTA  a
    join tasy.agenda_consulta           b on a.nr_sequencia = b.nr_sequencia
    join tasy.usuario                   c on b.nm_usuario = c.nm_usuario
    where 1 = 1
    and a.CD_PESSOA_FISICA = :cd_pessoa_fisica_paciente
    and a.cd_agenda = :cd_agenda
    and a.ie_cancelado = 0
    and a.ie_status_agenda in ('M', 'N')
    order by a.dt_agenda desc
    fetch first 1 row only
    `;

    const recort = await oracledb.getConnection();

    const data = await recort
        .execute(
            sql, {
                ':cd_pessoa_fisica_paciente': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: cd_pessoa_fisica_paciente.toString(),
                },
                ':cd_agenda': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: cd_agenda.toString(),
                },
            }, {
                outFormat: oracledb.OBJECT,
            },
        )
        .then(result => {
            // console.log(result.rows);
            return result.rows;
        })
        .finally(() => recort.close())
        .catch(e => {
            console.error(
                'catch block buscarRetornoPorPacienteAndAgenda > ',
                e,
            );
            return [];
        });

    return data;
};

const buscarDadosUltimaTransfusao = async cd_pessoa_fisica => {
    const retorno = new Object();
    retorno.status = false
    const sql = `
    select
        a.qt_hemoglobina,
        a.qt_hematocrito,
        a.qt_plaqueta
    from tasy.cpoe_hemoterapia a
    where 1 = 1
        and cd_pessoa_fisica = :cd_pessoa_fisica
    order by dt_atualizacao desc
        fetch first 1 row only
    `;
    const db = await oracledb.getConnection();
    await db.execute(sql, 
        {
            ':cd_pessoa_fisica': { dir: oracledb.BIND_IN, type: oracledb.STRING, val: cd_pessoa_fisica.toString() } 
        },
        {
            outFormat: oracledb.OBJECT,
            autoCommit: true
        })
    .then(result => {
        retorno.status = true;
        retorno.dados = result.rows;
        retorno.msg = 'Sucesso ao buscar a ultima transfusão';
        retorno.err = 'NO ERROR'
    })
    .finally(() => db.close())
    .catch(err => {
        console.error('Erro em buscarDadosUltimaTransfusao DAO > ', err)
        retorno.status = false;
        retorno.msg = `Erro ao buscar a ultima transfusão`;
        retorno.err = err;
        retorno.dados = new Array();
    })
    return retorno
}

module.exports = {
    buscarAtestadosPaciente,
    obterModeloAtestado,
    salvarAtestado,
    apagarAtestado,
    liberarAtestado,

    checarDiagnosticoExistente,
    checarDiagnosticoExistente2,
    buscarDiagnosticosAtendimento,
    buscarDiagnosticosPaciente,
    buscarOcorrenciasDiagnostico,
    listasParaDiagnostico,
    pesquisarDiagnostico,
    pesquisarRemedio,
    obterUnidadeMedida,
    obterIntervalo,
    salvarDiagnostico,
    salvarDiagnostico2,
    apagarDiagnostico,
    liberarDiagnostico,

    listarAnamnesePaciente,
    listarEvolucaoPaciente,
    obterTextoPadraoMedico,
    obterEspecialidadesMedico,
    salvarAnamnese,
    liberarAnamnese,
    editarAnamneseHtml,
    editarAnamneseJava,
    excluirAnamneseHtml,
    excluirAnamneseJava,

    buscarReceitasPaciente,
    listaMedicamentosReceita,
    buscarMedicamentosReceita,
    salvarReceita,
    salvarReceitaNovo,
    apagarReceita,
    liberarReceita,

    buscarSolicitacoesExamePaciente,
    buscarSolicitacoesExamePaciente2,
    buscarExameParaSolicitacao,
    
    salvarSolicitacaoExame,
    salvarSolicitacaoExameJustificativa,
    salvarItemSolicitacaoExame,
    liberarSolicitacaoExame,
    buscarItemSolicitacaoExamePaciente,
    buscarExamesParaSolicitacao,
    
    pesquisarExame,
    obterMaterialExame,
    salvarItemEspecifico,
    excluirItemEspecifico,
    obterDadosGuiaInternacao,
    excluirPedidoSolicitacao,
    pesquisarProcInterno,
    pesquisarCirurgias,
    medGrupo,
    verificarProcedimentos,
    examePadrao,
    examePadraoInstituicao,
    medGrupoInstituicao,
    listarHemoterapia,
    examesGrupos,
    buscarPrescrProc,
    buscarPrescrBcoSangue,
    gerarNovaPrescricao,
    gerarEvolucaoPaciente,
    updateLiberarEvolucaoPaciente,
    liberarEvolucaoPaciente,
    prescrSolicBcoSangue,
    prescrSolBsIndicacao,
    countNrPrescrProcedimento,
    prescr_procedimento,

    buscarResultadoExames,
    buscarArquivoResultadoExame,

    converterArquivo,
    converterArquivoLista,
    converterArquivo2,

    buscarMotivoMudancaStatus,
    mudarStatusConsulta,

    obterDadosAtendimento,

    buscarLaudosExamesImagemPaciente,

    listarHorariosDisponiveis,
    buscarDadosPaciente,
    confirmarAgendamentoRetorno,
    listarHorariosDisponiveisAmb,

    obterAgendaMedico,
    obterDatasParaEncaixe,
    obterMotivosEncaixe,
    consistirEncaixe,
    gerarEncaixe,
    obterDadosAgendamento,
    obterTaxaRetorno,
    verificarAgenda,
    obterProcedimentos,
    executarProcedimentos,
    obterTaxaAvaliacao,

    buscarMedicoMemed,
    updatePassWord,

    listarExames,
    listarHorariosDisponiveisExame,
    obterDatasEncaixeExame,
    agendarEncaixeExame,

    buscarRetornoPorProtocolo,
    buscarRetornoPorPacienteAndAgenda,
    resetarSenhaMedico,
    verificarAgendarEncaixe,

    /* hemoterapia */
    procedureInserirHemoterapiaAntCPOE,
    updateCpoe,
    procedureLiberarHemoterapia,
    buscarDadosUltimaTransfusao,
    buscarArquivoResultadoExame2,

    buscarHistoryReceitasPaciente,
    getAtestadosPaciente,
}
