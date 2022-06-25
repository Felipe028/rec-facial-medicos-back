const oracledb = require('oracledb');

const filaDeAtendimentoProntoSocorro = async cd_setor => {
    const retorno = new Object();
    retorno.status = false;
    try {
        const sql = `
        SELECT
            *
        FROM ( SELECT
            a.ie_sem_prioridade,
            a.ds_triagem,
            a.nr_atendimento,
            a.nm_pessoa_fisica,
            a.dt_entrada,
            substr(tasy.obter_valor_dominio(2179, a.ie_status), 1, 100) ie_status_pa,
            a.nm_guerra,
            a.hr_espera,
            (
                SELECT
                    aa.nr_sequencia
                FROM
                    tasy.atendimento_alta aa
                WHERE
                    aa.nr_atendimento = a.nr_atendimento
                    AND aa.nr_sequencia IS NOT NULL
                order by aa.dt_atualizacao
                fetch first 1 rows only
            ) desfecho_alta,
            a.ie_status
        FROM
            tasy.pep_atendimento_ps_v   a,
            tasy.atendimento_paciente   b
        WHERE
            a.cd_estabelecimento = '1'
            AND b.nr_atendimento = a.nr_atendimento
                AND a.dt_entrada > SYSDATE - 4 / 24
                    AND b.dt_alta IS NULL
                        AND a.cd_setor_atendimento = :CD_SETOR
                            AND b.dt_cancelamento IS NULL
                --AND a.ie_status = 'FT'
            ORDER BY a.ie_sem_prioridade DESC,
        a.dt_entrada )
        WHERE
            desfecho_alta IS NULL
        `;
        const db = await oracledb.getConnection();
        await db
            .execute(
                sql,
                {
                    ':CD_SETOR': {
                        dir: oracledb.BIND_IN,
                        type: oracledb.NUMBER,
                        val: Number(cd_setor),
                    },
                },
                {
                    outFormat: oracledb.OBJECT,
                    autoCommit: true,
                },
            )
            .then(result => {
                retorno.dados = result.rows;
                retorno.status = true;
                return retorno;
            })
            .finally(() => db.close())
            .catch(err => {
                retorno.status = false;
                retorno.msg = err;
                return retorno;
            });
        return retorno;
    } catch (err) {
        retorno.status = false;
        retorno.msg = err;
        return retorno;
    }
};

const listarMedicamentos = async () => {
    const retorno = new Object();
    retorno.status = false;
    try {
        const sql = `
        SELECT
            rownum as ID,
            a.cd_material,
            a.ds_material,
            a.cd_classe_material,
            decode(
                a.ie_tipo_material, 3,(
                    SELECT
                        b.ds_material
                    FROM
                        material b
                    WHERE
                        1 = 1
                        AND b.ie_tipo_material = 2
                        AND b.cd_material_generico = a.cd_material
                        AND b.cd_material <> a.cd_material
                        AND ROWNUM = 1
                ), a.ds_material
            ) ds_mat_comercial,
            0 QT_ESTOQUE, substr(obter_dados_material_estab(a.cd_material, 1,'UMS'),1,30) CD_UNIDADE_MEDIDA_CONSUMO, A.IE_VIA_APLICACAO, A.CD_FABRICANTE, A.IE_OBRIGA_JUSTIFICATIVA, a.ie_consignado, 0 cd_item_convenio, substr(decode(A.QT_CONVERSAO_MG, null, null, campo_mascara_virgula(A.QT_CONVERSAO_MG) || A.CD_UNID_MED_CONCETRACAO || '/' || A.CD_UNID_MED_BASE_CONC),1,255) QT_CONVERSAO_MG, A.IE_TIPO_MATERIAL, substr(obter_se_material_prescricao(1 , a.cd_material),1,1) IE_PRESCRICAO, a.ie_classif_medic, nvl(a.cd_material_generico, a.cd_material) cd_material_generico, substr(obter_se_material_padronizado(1 , a.cd_material),1,1) IE_PADRONIZADO, a.ie_disponivel_mercado, A.IE_SITUACAO, '' ds_reduzida, '' ds_marca, '' DS_PRINC_ATIVO, 0 CD_SISTEMA_ANT, SUBSTR(obter_se_material_estoque(1, NULL, a.cd_material),1,1) IE_MATERIAL_ESTOQUE ,A.NR_SEQ_FICHA_TECNICA , SUBSTR(OBTER_DADOS_MATERIAL_ESTAB(a.cd_material, 1,'RA'),1,255) nr_registro_anvisa
        FROM
            tasy.material a
        WHERE
            1 = 1
            AND a.ie_tipo_material IN ( 0, 2, 3, 6, 9 )
        AND substr(
            obter_se_material_prescricao(
                1, a.cd_material
            ), 1, 1
        ) = 'S'
            AND a.ie_situacao = 'A'
                AND a.ie_tipo_material <> 8
                    AND EXISTS (
            SELECT
                1
            FROM
                material_estab e
            WHERE
                e.cd_material = a.cd_material
                AND e.cd_estabelecimento = 1
        )
                        AND nvl(
            a.ie_solucao, 'S'
        ) <> ( 'C' )
        ORDER BY
            ds_material
        `;
        const db = await oracledb.getConnection();
        await db
            .execute(
                sql,
                {},
                {
                    outFormat: oracledb.OBJECT,
                    autoCommit: true,
                },
            )
            .then(result => {
                retorno.dados = result.rows;
                retorno.status = true;
                return retorno;
            })
            .finally(() => db.close())
            .catch(err => {
                console.error('Erro em listarMedicamentos >>> ', err);
                retorno.status = false;
                retorno.msg = err;
                return retorno;
            });
        return retorno;
    } catch (err) {
        console.error('Erro em listarMedicamentos >>> ', err);
        retorno.status = false;
        retorno.msg = err;
        return retorno;
    }
};

const listarMedicamentosDeRotina = async () => {
    const retorno = new Object();
    retorno.status = false;
    try {
        const sql = `
        SELECT
            rownum as ID,
            c.cd_material,
            nvl(c.nr_seq_grupo,0) nr_seq_grupo,
            z.nr_sequencia id_grupo_quebra,
            nvl(z.ds_grupo,'Sem grupo') ds_grupo_quebra,
            z.nr_seq_apresentacao nr_seq_apresent,
            c.nr_sequencia cd,
            nvl(c.ds_rotina, substr(x.ds_material,1,100)) || ' ' || c.ie_via_aplicacao ds,
            nvl(c.ds_rotina, substr(x.ds_material,1,100)) ds_material,
            obter_mensagem_material(x.cd_material) ds_mensagem,
            c.cd_protocolo,
            c.nr_sequencia,
            c.nr_seq_material,
            c.nr_agrupamento,
            c.ie_via_aplicacao,
            c.ds_cor_rotina ds_cor,
            c.qt_dose qt_dose,
            c.cd_unidade_medida,
            ('Medicamento: ' || c.cd_material || ' - ' || substr(x.ds_material,1,80) || chr(13) ||  decode(x.ds_hint,null,'','Hint prescrição: ' || x.ds_hint || chr(13)) ||  'Dose/UM/Via: ' || c.qt_dose || ' ' || substr(obter_desc_unid_med(c.cd_unidade_medida),1,80) || ' ' || substr(obter_desc_via(c.ie_via_aplicacao),1,80) || chr(13) ||  'Horários: ' || substr(c.ds_horarios,1,80) || chr(13) ||  'Intervalo: ' || substr(obter_desc_intervalo_prescr(c.cd_intervalo),1,80) || chr(13) ||  'Recomendação: ' || substr(c.ds_recomendacao,1,300) || chr(13) ||  'Observação: ' || substr(b.ds_observacao,1,255)) ds_hint,
            nvl(c.ie_intervalo,'N') ie_intervalo,
            nvl(c.ie_unidade_medida,'N') ie_unidade_medida,
            nvl(c.ie_via_adm_rotina,'N') ie_via_adm_rotina,
            c.cd_intervalo,
            decode(c.ie_justificativa,'S',c.ie_justificativa,x.ie_obriga_justificativa) ie_justificativa,
            obter_padrao_param_prescr(449400, c.cd_material, c.ie_via_aplicacao, 115, '374471', 6.0, 130.0, nvl(c.ie_se_necessario,'N'), 'JP') ie_justif_padrao,
            nvl(c.ie_dados_atb,'N') ie_dados_atb,
            nvl(c.ie_dados_medicamento,'N') ie_dados_medic,
            nvl(c.ie_questionar_obs,'N') ie_questionar_obs,
            nvl(c.ie_calculadora,'N') ie_calculadora,
            substr(c.ds_recomendacao,1,1000) ds_observacao,
            nvl(c.ie_urgencia,'N') ie_urgencia,
            nvl(c.ie_acm,'N') ie_acm,
            nvl(c.ie_se_necessario,'N') ie_se_necessario,
            nvl(x.ie_vancomicina, 'N') ie_vancomicina,
            nvl(c.nr_seq_grupo,0) nr_seq_grupo,
            nvl(c.nr_seq_subgrupo,0) nr_seq_subgrupo,
            coalesce(c.qt_dias_prev_util,0) qt_dias_prev_util,
            c.ie_se_necessario,
            c.ie_acm
        FROM  material x,
            grupo_medicamento_rotina z,
            protocolo_medic_material c,
            protocolo_medicacao b,
            protocolo a
        WHERE 1 = 1
            AND a.cd_protocolo = b.cd_protocolo 
            AND	c.nr_seq_grupo = z.nr_sequencia(+) 
            AND	((c.nr_seq_grupo is null) OR (obter_se_especialidade_grupo(null, 2187, z.nr_sequencia,1) = 'S' 
            AND	nvl(z.ie_situacao,'A') = 'A')) 
            AND	((a.cd_estabelecimento = 1) OR (exists(
        SELECT 1
        FROM	protocolo_lib_estab z
        WHERE z.cd_protocolo = a.cd_protocolo 
            AND	z.cd_estabelecimento = 1)) OR  ((a.cd_estabelecimento is null) 
            AND	(not exists(
        SELECT 1
        FROM	protocolo_lib_estab z
        WHERE z.cd_protocolo = a.cd_protocolo)))) 
            AND	x.cd_material = c.cd_material 
            AND	b.cd_protocolo = c.cd_protocolo 
            AND	b.nr_sequencia = c.nr_sequencia 
            AND	obter_se_protocolo_lib_setor(a.cd_protocolo, 115, '1044057', '5', 'd.rodrigues', '19') = 'S' 
            AND	((x.ie_solucao <> 'N' 
            AND	0 > 0) OR (0 = 0)) 
            AND	(a.cd_especialidade is null OR obter_se_especialidade_medico('1044057',a.cd_especialidade) = 'S') 
            AND	((a.cd_setor_atendimento = 115) OR (a.cd_setor_atendimento is null)) 
            AND	nvl(c.ie_medic_rotina,'N') = 'S' 
            AND	nvl(x.ie_situacao,'A') = 'A' 
            AND	nvl(a.ie_situacao,'A') = 'A' 
            AND	nvl(b.ie_situacao,'A') = 'A' 
            AND	c.ie_agrupador = 1 
            AND	((a.ie_tipo_atendimento is null) OR (a.ie_tipo_atendimento = '1')) 
            AND	((a.ie_clinica = '1') OR (a.ie_clinica is null)) 
            AND	((b.cd_setor_filtro = 115) OR (b.cd_setor_filtro is null)) 
            AND	((a.cd_protocolo = 0) OR (nvl(0,0) = 0)) 
            AND	((a.cd_tipo_protocolo = 0) OR (nvl(0,0) = 0)) 
            AND	((b.nr_sequencia = 0) OR (nvl(0,0) = 0)) 
            AND	((obter_se_valor_contido(a.cd_tipo_protocolo, '37,10') = 'S') OR (nvl('37,10','0') = '0'))
        ORDER BY   nvl(z.nr_seq_apresentacao,999),
            nvl(c.nr_seq_grupo,0),
            nvl(c.nr_seq_apresentacao,999),
            ds_material
        `;
        const db = await oracledb.getConnection();
        await db
            .execute(
                sql,
                {},
                {
                    outFormat: oracledb.OBJECT,
                    autoCommit: true,
                },
            )
            .then(result => {
                retorno.dados = result.rows;
                retorno.status = true;
                return retorno;
            })
            .finally(() => db.close())
            .catch(err => {
                console.error('Erro em listarMedicamentosDeRotina >>> ', err);
                retorno.status = false;
                retorno.msg = err;
                return retorno;
            });
        return retorno;
    } catch (err) {
        console.error('Erro em listarMedicamentosDeRotina >>> ', err);
        retorno.status = false;
        retorno.msg = err;
        return retorno;
    }
};

const buscarUltimosSinaisVitais = async nr_atendimento => {
    const retorno = new Object();
    retorno.status = false;
    try {
        const sql = `
        select
            NR_SEQUENCIA,
            QT_PA_SISTOLICA,
            QT_PA_DIASTOLICA,
            QT_PAM,
            QT_FREQ_CARDIACA,
            QT_FREQ_RESP,
            QT_TEMP,
            QT_SATURACAO_O2,
            QT_PESO,
            to_char(dt_atualizacao, 'dd/mm/yyyy hh24:mi:ss') DT_ATUALIZACAO
        from tasy.atendimento_sinal_vital
        where 1 = 1
            and nr_atendimento = :nr_atendimento
        order by dt_atualizacao desc
        fetch first 1 rows only
        `;
        const db = await oracledb.getConnection();
        await db
            .execute(
                sql,
                {
                    ':nr_atendimento': {
                        dir: oracledb.BIND_IN,
                        type: oracledb.NUMBER,
                        val: Number(nr_atendimento),
                    },
                },
                {
                    outFormat: oracledb.OBJECT,
                    autoCommit: true,
                },
            )
            .then(result => {
                retorno.dados = result.rows;
                retorno.status = true;
                return retorno;
            })
            .finally(() => db.close())
            .catch(err => {
                console.error('Erro em buscarUltimosSinaisVitais >>> ', err);
                retorno.status = false;
                retorno.msg = err;
                return retorno;
            });
        return retorno;
    } catch (err) {
        console.error('Erro em buscarUltimosSinaisVitais >>> ', err);
        retorno.status = false;
        retorno.msg = err;
        return retorno;
    }
};

// Procedures de Medicamentos
const atualizarIeGerouKitJs = async (
    nr_prescricao_p,
    nm_usuario_p,
    ie_gerou_kit_p,
) => {
    const retorno = new Object();
    retorno.status = false;
    try {
        const sql = `
        BEGIN
            tasy.atualizar_ie_gertou_kit_js(
                nr_prescricao_p => :nr_prescricao_p,
                nm_usuario_p => :nm_usuario_p,
                ie_gerou_kit_p => :ie_gerou_kit_p,
                cd_estabelecimento_p: => 1
            )
        END;
        `;
        const db = await oracledb.getConnection();
        const result = await db.execute(
            sql,
            {
                ':nr_prescricao_p': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: nr_prescricao_p,
                },
                ':nm_usuario_p': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: nm_usuario_p.toString(),
                },
                ':ie_gerou_kit_p': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: ie_gerou_kit_p.toString(),
                },
            },
            {
                autoCommit: true,
                outFormat: oracledb.OBJECT,
            },
        );
        retorno.dados = result;
        retorno.status = true;
        return retorno;
    } catch (err) {
        console.error('Erro em atualizarIeGerouKitJs >>> ', err);
        retorno.status = false;
        retorno.erro = err;
        return retorno;
    }
};

const gerarKitPrescricao = async (
    ie_subst_medicamento_p,
    nr_prescricao_p,
    nm_usuario_p,
    ie_manual_p,
    nr_seq_item_p,
) => {
    const retorno = new Object();
    retorno.status = false;
    try {
        const sql = `
        BEGIN
            tasy.gerar_kit_prescricao(
                ie_subst_medicamento_p => :ie_subst_medicamento_p,
                nr_prescricao_p => :nr_prescricao_p,
                nm_usuario_p => :nm_usuario_p,
                ie_manual_p => :ie_manual_p,
                nr_seq_item_p => :nr_seq_item_p,
                cs_estabelecimento_p => 1
            )
        END;
        `;
        const db = await oracledb.getConnection();
        const result = await db.execute(
            sql,
            {
                ':ie_subst_medicamento_p': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: ie_subst_medicamento_p,
                },
                ':nr_prescricao_p': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: nr_prescricao_p,
                },
                ':nm_usuario_p': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: nm_usuario_p,
                },
                ':ie_manual_p': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: ie_manual_p,
                },
                ':nr_seq_item_p': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: nr_seq_item_p,
                },
            },
            {
                autoCommit: true,
                outFormat: oracledb.OBJECT,
            },
        );
        retorno.dados = result;
        retorno.status = true;
        return retorno;
    } catch (err) {
        console.error('Erro em gerarKitPrescricao >>> ', err);
        retorno.status = false;
        retorno.erro = err;
        return retorno;
    }
};

const gerarPrescricao = async () => {
    const retorno = new Object();
    retorno.status = false;
    try {
        const sql = `
        BEGIN
            gerar_nova_prescricao(
                nr_atendimento_p => :nr_atendimento,
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
        END;
        `;
        const db = await oracledb.getConnection();
        const result = await db.execute(
            sql,
            {
                ':ie_subst_medicamento_p': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: ie_subst_medicamento_p,
                },
                ':nr_prescricao_p': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: nr_prescricao_p,
                },
                ':nm_usuario_p': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: nm_usuario_p,
                },
                ':ie_manual_p': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: ie_manual_p,
                },
                ':nr_seq_item_p': {
                    dir: oracledb.BIND_IN,
                    type: oracledb.STRING,
                    val: nr_seq_item_p,
                },
            },
            {
                autoCommit: true,
                outFormat: oracledb.OBJECT,
            },
        );
        retorno.dados = result;
        retorno.status = true;
        return retorno;
    } catch (err) {
        console.error('Erro em gerarKitPrescricao >>> ', err);
        retorno.status = false;
        retorno.erro = err;
        return retorno;
    }
};

module.exports = {
    filaDeAtendimentoProntoSocorro,
    listarMedicamentos,
    listarMedicamentosDeRotina,
    buscarUltimosSinaisVitais,
    atualizarIeGerouKitJs,
    gerarKitPrescricao,
};
