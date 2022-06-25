const prontuarioDAO = require('../DAO/prontuarioDAO')
const agendamentoRetorno = require('../DAO/agendamentoRetornoDAO')
const { reset, restart } = require('nodemon')

async function buscarAtestadosPaciente(req, res) {
    const { cdPessoaFisica, nmUsuario, cdMedico } = req.params;

    if (!cdPessoaFisica || !nmUsuario || !cdMedico) {
        return res.status(404).send({
            status: 'false',
            msg: 'Faltam parametros',
        });
    }

    let retorno = await prontuarioDAO.buscarAtestadosPaciente(
        cdPessoaFisica,
        nmUsuario,
        cdMedico,
    );
    return res.status(200).send(retorno);
}

async function converterArquivoLista(req, res) {
    const { idArquivo, nmUsuario } = req.params;

    if (!idArquivo || !nmUsuario) {
        return res.status(404).send({
            status: 'false',
            msg: 'Faltam parametros',
        });
    }

    let retorno = await prontuarioDAO.converterArquivoLista(
        idArquivo,
        nmUsuario,
    );
    return res.status(200).send(retorno);
}

async function obterModeloAtestado(req, res) {
    const { nr_atendimento } = req.params;
    if (!nr_atendimento) {
        return res.status(404).send({
            status: 'false',
            msg: 'Faltam parametros',
        });
    }

    let retorno = await prontuarioDAO.obterModeloAtestado(nr_atendimento);
    return res.status(200).send(retorno);
}

async function converterArquivo(req, res) {
    const {
        idArquivo,
        nmUsuario,
        cdPessoaFisica,
        nrAtendimento,
        diasAtestado,
        cdMedico,
    } = req.body;

    if (!idArquivo ||
        !nmUsuario ||
        !cdPessoaFisica ||
        !nrAtendimento ||
        !diasAtestado ||
        !cdMedico
    ) {
        return res.status(404).send({
            status: 'false',
            msg: 'Faltam parametros',
        });
    }

    let retorno = await prontuarioDAO.converterArquivo(
        idArquivo,
        nmUsuario,
        cdPessoaFisica,
        nrAtendimento,
        diasAtestado,
        cdMedico,
    );
    return res.status(200).send(retorno);
}

async function converterArquivo2(req, res) {
    const { idArquivo, nmUsuario, cdMedico, tipo, origem } = req.body;

    if (!idArquivo || !nmUsuario || !cdMedico || !tipo || !origem) {
        return res.status(404).send({
            status: 'false',
            msg: 'Faltam parametros',
        });
    }

    let retorno = await prontuarioDAO.converterArquivo2(
        idArquivo,
        nmUsuario,
        cdMedico,
        tipo,
        origem,
    );
    return res.status(200).send(retorno);
}

async function salvarAtestado(req, res) {
    if (!req.body.IE_RESTRICAO_VISUALIZACAO ||
        !req.body.IE_NIVEL_ATENCAO ||
        !req.body.NM_USUARIO_NREC ||
        !req.body.IE_AVALIADOR_AUX ||
        !req.body.NM_USUARIO ||
        !req.body.CD_MEDICO ||
        !req.body.CD_PERFIL_ATIVO ||
        !req.body.DS_ATESTADO ||
        !req.body.QT_CARACTERES ||
        !req.body.IE_SITUACAO ||
        !req.body.CD_PESSOA_FISICA ||
        !req.body.NR_ATENDIMENTO
    ) {
        return res.status(404).send({
            status: 'false',
            msg: 'Faltam parametros',
        });
    }

    let retorno = await prontuarioDAO.salvarAtestado(req.body);
    return res.status(200).send(retorno);
}

async function apagarAtestado(req, res) {
    const { nrSeqAtestado, dtLiberacao } = req.body;

    if (!nrSeqAtestado) {
        return res.status(404).send({
            status: 'false',
            msg: 'Faltam parametros',
        });
    }

    if (dtLiberacao) {
        return res.status(404).send({
            status: 'false',
            msg: 'Não é possivel a exclusão de um atestado já liberado',
        });
    }

    let retorno = await prontuarioDAO.apagarAtestado(nrSeqAtestado);
    return res.status(200).send(retorno);
}

async function liberarAtestado(req, res) {
    if (!req.body.nrSeqAtestado) {
        return res.status(404).send({
            status: 'false',
            msg: 'Faltam parametros',
        });
    }

    let retorno = await prontuarioDAO.liberarAtestado(req.body.nrSeqAtestado);
    return res.status(200).send(retorno);
}

async function buscarDiagnosticos(req, res) {
    const { nrAtendimento, nmUsuario, cdPessoaFisica } = req.params;

    let retorno = {
        status: false,
        msg: '',
        dados: {},
    };

    if (!nrAtendimento || !nmUsuario || !cdPessoaFisica) {
        return res.status(404).send({
            status: 'false',
            msg: 'Faltam parametros',
        });
    }

    const diagnosticosAtendimento =
        await prontuarioDAO.buscarDiagnosticosAtendimento(
            nrAtendimento,
            nmUsuario,
        );

    const diagnosticosPaciente = await prontuarioDAO.buscarDiagnosticosPaciente(
        cdPessoaFisica,
        nmUsuario,
    );

    if (diagnosticosAtendimento.status || diagnosticosPaciente.status) {
        retorno.status = true;
        retorno.msg = 'Sucesso ao obter diagnósticos';
        retorno.dados = {
            diagnosticosAtendimento: diagnosticosAtendimento.dados,
            diagnosticosPaciente: diagnosticosPaciente.dados,
        };
    } else {
        retorno.msg = 'Erro ao obter disgnósticos';
    }

    return res.status(200).send(retorno);
}

async function buscarOcorrenciasDiagnostico(req, res) {
    const { cdPessoaFisica, cdDoenca } = req.params;

    if (!cdPessoaFisica || !cdDoenca) {
        return res.status(404).send({
            status: 'false',
            msg: 'Faltam parametros',
        });
    }

    const ocorrenciasDiagnosticos =
        await prontuarioDAO.buscarOcorrenciasDiagnostico(
            cdPessoaFisica,
            cdDoenca,
        );

    return res.status(200).send(ocorrenciasDiagnosticos);
}

async function checarDiagnosticoExistente(req, res) {
    const { nrAtendimento, nmUsuario } = req.params;

    if (!nrAtendimento || !nmUsuario) {
        return res.status(404).send({
            status: 'false',
            msg: 'Faltam parametros',
        });
    }

    let retorno = await prontuarioDAO.checarDiagnosticoExistente(
        nrAtendimento,
        nmUsuario,
    );
    return res.status(200).send(retorno);
}

async function checarDiagnosticoExistente2( req, res ){
    const { nrAtendimento, nmUsuario } = req.params

    if (!nrAtendimento || !nmUsuario){
        return res.status(404).send({
            "status": "false",
            "msg": "Faltam parametros"
        })
    }

    let retorno = await prontuarioDAO.checarDiagnosticoExistente2(nrAtendimento, nmUsuario)
    return res.status(200).send(retorno)
}

async function listasParaDiagnostico( req, res ){
    const { cd_estabelecimento, cd_perfil, cd_setor_atendimento, cd_especialidade } = req.body

    if (!cd_estabelecimento ||
        !cd_perfil ||
        !cd_setor_atendimento ||
        !cd_especialidade
    ) {
        return res.status(404).send({
            status: 'false',
            msg: 'Faltam parametros',
        });
    }

    let retorno = await prontuarioDAO.listasParaDiagnostico(
        cd_estabelecimento,
        cd_perfil,
        cd_setor_atendimento,
        cd_especialidade,
    );
    return res.status(200).send(retorno);
}

async function pesquisarDiagnostico(req, res) {
    const { descricaoItem } = req.params;

    if (!descricaoItem) {
        return res.status(404).send({
            status: 'false',
            msg: 'Faltam parametros',
        });
    }

    let retorno = await prontuarioDAO.pesquisarDiagnostico(descricaoItem);
    return res.status(200).send(retorno);
}


async function pesquisarRemedio( req, res ){
    const { descricaoItem } = req.params

    if (!descricaoItem){
        return res.status(404).send({
            "status": "false",
            "msg": "Faltam parametros"
        })
    }

    let retorno = await prontuarioDAO.pesquisarRemedio(descricaoItem)
    return res.status(200).send(retorno)
}

async function obterUnidadeMedida( req, res ){
    let retorno = await prontuarioDAO.obterUnidadeMedida()
    return res.status(200).send(retorno)
}

async function obterIntervalo( req, res ){
    let retorno = await prontuarioDAO.obterIntervalo()
    return res.status(200).send(retorno)
}

async function salvarDiagnostico( req, res ){
    const { cdMedico, nmUsuario, nrAtendimento,  nrSeqCid, ie_liberado } = req.body
    let retorno = {
        status: false,
        msg: '',
    };
    let itensSucesso = [];
    let itensErro = [];

    if (!cdMedico ||
        !nmUsuario ||
        !nrAtendimento ||
        !nrSeqCid ||
        !ie_liberado
    ) {
        return res.status(404).send({
            status: 'false',
            msg: 'Faltam parametros',
        });
    }

    for (const [index, value] of nrSeqCid.entries()) {
        let retornFunction = await prontuarioDAO.salvarDiagnostico(
            cdMedico,
            nmUsuario,
            nrAtendimento,
            value,
            ie_liberado,
        );

        if (retornFunction.status) {
            itensSucesso.push({ index, value });
        } else {
            itensErro.push({ index, value });
        }
    }

    if (itensErro.length == 0) {
        retorno.status = true;
        retorno.msg = 'Sucesso ao salvar itens';
    } else {
        retorno.msg = 'Erro ao salvar um ou mais itens';
    }

    retorno.dados = {
        itensSucesso,
        itensErro,
    };

    return res.status(200).send(retorno);
}

async function salvarDiagnostico2(req, res) {
    const { cdDoenca, nmUsuario, cdMedico, nrAtendimento, ieTipoDiagnostico } =
    req.body;
    let retorno = {
        status: false,
        msg: '',
    };
    let itensSucesso = [];
    let itensErro = [];

    if (!cdDoenca || !nmUsuario || !cdMedico || !nrAtendimento) {
        return res.status(404).send({
            status: 'false',
            msg: 'Faltam parametros',
        });
    }

    for (const [index, value] of cdDoenca.entries()) {
        let retornFunction = await prontuarioDAO.salvarDiagnostico2(
            cdMedico,
            nmUsuario,
            nrAtendimento,
            value,
            ieTipoDiagnostico,
        );

        if (retornFunction.status) {
            itensSucesso.push({ index, value });
        } else {
            itensErro.push({ index, value });
        }
    }

    if (itensErro.length == 0) {
        retorno.status = true;
        retorno.msg = 'Sucesso ao salvar itens';
    } else {
        retorno.msg = 'Erro ao salvar um ou mais itens';
    }

    retorno.dados = {
        itensSucesso,
        itensErro,
    };

    return res.status(200).send(retorno);
}

async function apagarDiagnostico(req, res) {
    const { nrAtendimento, dtDiagnostico, cdDoenca, dtLiberacao } = req.body;

    if (!nrAtendimento || !dtDiagnostico || !cdDoenca) {
        return res.status(404).send({
            status: 'false',
            msg: 'Faltam parametros',
        });
    }

    if (dtLiberacao) {
        return res.status(404).send({
            status: 'false',
            msg: 'Não é possivel a exclusão de um diagnostico já liberado',
        });
    }

    let retorno = await prontuarioDAO.apagarDiagnostico(
        nrAtendimento,
        dtDiagnostico,
        cdDoenca,
    );
    return res.status(200).send(retorno);
}

async function liberarDiagnostico(req, res) {
    const { nrAtendimento, dtDiagnostico } = req.body;

    if (!nrAtendimento || !dtDiagnostico) {
        return res.status(404).send({
            status: 'false',
            msg: 'Faltam parametros',
        });
    }

    let retorno = await prontuarioDAO.liberarDiagnostico(
        nrAtendimento,
        dtDiagnostico,
    );
    return res.status(200).send(retorno);
}

async function listarAnamnesePaciente(req, res) {
    let retorno = {
        status: false,
        msg: '',
    };
    const { cdPessoaFisica, nmUsuario, cdMedico } = req.params;

    if (!cdPessoaFisica || !nmUsuario) {
        return res.status(404).send({
            status: 'false',
            msg: 'Faltam parametros',
        });
    }

    const anamnesePaciente = await prontuarioDAO.listarAnamnesePaciente(
        cdPessoaFisica,
        cdMedico,
    );

    if (anamnesePaciente.status) {
        const evolucaoPaciente = await prontuarioDAO.listarEvolucaoPaciente(
            cdPessoaFisica,
            nmUsuario,
            cdMedico,
        );

        if (evolucaoPaciente.status) {
            retorno.status = true;
            retorno.msg = 'Sucesso ao obter anamnese e evolucao do paciente';
            retorno.dados = {
                anamnesePaciente,
                evolucaoPaciente,
            };
        } else {
            retorno.msg = 'Erro ao obter evolucao paciente';
        }
    } else {
        retorno.msg = 'Erro ao obter anamnese paciente';
    }
    return res.status(200).send(retorno);
}

async function obterTextoPadraoMedico(req, res) {
    const { cdMedico } = req.params;
    let retorno = {
        status: false,
        msg: '',
    };

    if (!cdMedico) {
        return res.status(404).send({
            status: 'false',
            msg: 'Faltam parametros',
        });
    }

    const textoPadrao = await prontuarioDAO.obterTextoPadraoMedico(cdMedico);

    const listaEspecialidades = await prontuarioDAO.obterEspecialidadesMedico(
        cdMedico,
    );

    if (textoPadrao.status && listaEspecialidades.status) {
        retorno.status = true;
        retorno.msg = 'Sucesso ao obter dados do médico';
        retorno.dados = {
            textoPadrao: textoPadrao.dados,
            listaEspecialidade: listaEspecialidades.dados,
        };
    } else {
        retorno.msg = 'Erro ao obter dados do médico';
    }

    return res.status(200).send(retorno);
}

async function salvarAnamnese(req, res) {
    const {
        NR_ATENDIMENTO,
        IE_TIPO_EVOLUCAO,
        CD_PESSOA_FISICA,
        NM_USUARIO,
        DS_EVOLUCAO_P,
        CD_MEDICO,
        E_EVOLUCAO_CLINICA_P,
        CD_ESPECIALIDADE,
    } = req.body;

    if (!NR_ATENDIMENTO ||
        !IE_TIPO_EVOLUCAO ||
        !CD_PESSOA_FISICA ||
        !NM_USUARIO ||
        !DS_EVOLUCAO_P ||
        !CD_MEDICO ||
        !E_EVOLUCAO_CLINICA_P ||
        !CD_ESPECIALIDADE
    ) {
        return res.status(404).send({
            status: 'false',
            msg: 'Faltam parametros',
        });
    }

    let retorno = await prontuarioDAO.salvarAnamnese(
        NR_ATENDIMENTO,
        IE_TIPO_EVOLUCAO,
        CD_PESSOA_FISICA,
        NM_USUARIO,
        DS_EVOLUCAO_P,
        CD_MEDICO,
        E_EVOLUCAO_CLINICA_P,
        CD_ESPECIALIDADE,
    );
    return res.status(200).send(retorno);
}

async function liberarAnamnese(req, res) {
    const { nrSeqAnamnese, nmUsuario } = req.body;

    if (!nrSeqAnamnese || !nmUsuario) {
        return res.status(404).send({
            status: 'false',
            msg: 'Faltam parametros',
        });
    }

    let retorno = await prontuarioDAO.liberarAnamnese(nrSeqAnamnese, nmUsuario);
    return res.status(200).send(retorno);
}

async function editarAnamnese(req, res) {
    const { dsAnamnese, nrSeqAnamnese, origem } = req.body;

    if (!dsAnamnese || !nrSeqAnamnese || !origem) {
        return res.status(404).send({
            status: 'false',
            msg: 'Faltam parametros',
        });
    }

    let retorno = [];

    if (origem == 'JAVA') {
        retorno = await prontuarioDAO.editarAnamneseJava(
            dsAnamnese,
            nrSeqAnamnese,
        );
    } else {
        retorno = await prontuarioDAO.editarAnamneseHtml(
            dsAnamnese,
            nrSeqAnamnese,
        );
    }

    return res.status(200).send(retorno);
}

async function excluirAnamnese(req, res) {
    const { nrSeqAnamnese, dataLiberacao, origem } = req.body;

    if (!nrSeqAnamnese || !origem) {
        return res.status(404).send({
            status: 'false',
            msg: 'Faltam parametros',
        });
    }

    if (dataLiberacao) {
        return res.status(404).send({
            status: 'false',
            msg: 'Não é possível a exclusão de uma anamnese já liberada',
        });
    }

    let retorno = [];

    if (origem == 'JAVA') {
        retorno = await prontuarioDAO.excluirAnamneseJava(nrSeqAnamnese);
    } else {
        retorno = await prontuarioDAO.excluirAnamneseHtml(nrSeqAnamnese);
    }

    return res.status(200).send(retorno);
}

async function buscarReceitasPaciente(req, res) {
    const { cdPessoaFisica, nmUsuario } = req.params;

    if (!cdPessoaFisica || !nmUsuario) {
        return res.status(404).send({
            status: 'false',
            msg: 'Faltam parametros',
        });
    }

    let retorno = await prontuarioDAO.buscarReceitasPaciente(
        cdPessoaFisica,
        nmUsuario,
    );
    return res.status(200).send(retorno);
}

async function histReceitasPaciente(req, res) {
    const { cdPessoaFisica, nrAtendimento } = req.body;

    try {
        if (!cdPessoaFisica || !nrAtendimento) {
            throw new Error('Faltam parametros obrigatórios');
        }

        const retorno = await prontuarioDAO.buscarHistoryReceitasPaciente(
            cdPessoaFisica,
            nrAtendimento,
        );

        if (retorno.status) {
            let data = retorno.dados;
            let newData = [];
            if (data.length > 0) {
                for (let obj of data) {
                    if (obj.DS_RECEITA.includes('rtf')) {
                        var html = await prontuarioDAO.converterArquivo2(
                            obj.NR_SEQUENCIA,
                            obj.NM_USUARIO,
                            obj.CD_MEDICO,
                            4,
                            2,
                        );

                        newData.push({
                            NR_ATENDIMENTO_HOSP: obj.NR_ATENDIMENTO_HOSP,
                            NM_MEDICO: obj.NM_MEDICO,
                            NR_SEQUENCIA: obj.NR_SEQUENCIA,
                            DT_RECEITA: obj.DT_RECEITA,
                            DS_TEXTO: html.dados.DS_TEXTO,
                            CD_MEDICO: obj.CD_MEDICO,
                            NR_CRM: obj.NR_CRM,
                        });
                    } else {
                        newData.push({
                            obj,
                        });
                    }
                }
            }

            return res.status(200).json({
                status: true,
                message: 'Sucesso ao buscar receita.',
                dados: retorno.dados,
            });
        } else {
            return res.status(400).json({
                status: false,
                message: 'Houve um erro ao buscar as receita.',
                dados: retorno,
            });
        }
    } catch (err) {
        return res.status(400).json({
            status: false,
            msg: 'Erro lançamento',
            err: err.message,
        });
    }
}

async function listaMedicamentosReceita(req, res) {
    const { cdMedico } = req.params;

    if (!cdMedico) {
        return res.status(404).send({
            status: 'false',
            msg: 'Faltam parametros',
        });
    }

    let retorno = await prontuarioDAO.listaMedicamentosReceita(cdMedico);
    return res.status(200).send(retorno);
}

async function buscarMedicamentosReceita(req, res) {
    const { cdMedico, descricaoItem } = req.params;

    if (!cdMedico || !descricaoItem) {
        return res.status(404).send({
            status: 'false',
            msg: 'Faltam parametros',
        });
    }

    let retorno = await prontuarioDAO.buscarMedicamentosReceita(
        cdMedico,
        descricaoItem,
    );
    return res.status(200).send(retorno);
}

async function salvarReceita(req, res) {
    const {
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
        NR_ATENDIMENTO,
        CD_PESSOA_FISICA,
    } = req.body;

    if (!IE_RESTRICAO_VISUALIZACAO ||
        !IE_RN ||
        !IE_TIPO_RECEITA ||
        !IE_NIVEL_ATENCAO ||
        !NM_USUARIO_NREC ||
        !NM_USUARIO ||
        !DS_RECEITA ||
        !CD_MEDICO ||
        !CD_PERFIL_ATIVO ||
        !DT_LIBERACAO ||
        !IE_SITUACAO ||
        !NR_ATENDIMENTO ||
        !CD_PESSOA_FISICA
    ) {
        return res.status(404).send({
            status: 'false',
            msg: 'Faltam parametros',
        });
    }

    let retorno = await prontuarioDAO.salvarReceita(
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
        NR_ATENDIMENTO,
        CD_PESSOA_FISICA,
    );
    return res.status(200).send(retorno);
}

async function salvarReceitaNovo( req, res ){
    const { CD_DOENCA, CD_MEDICO, CD_PESSOA_FISICA, NM_USUARIO, NR_ATENDIMENTO, REMEDIOS } = req.body

    if ( !NM_USUARIO || !CD_MEDICO || !NR_ATENDIMENTO || !CD_PESSOA_FISICA ){
        return res.status(404).send({
            "status": "false",
            "msg": "Faltam parametros"
        })
    }

    let dataAll = []

    CD_DOENCA.map((dadosCdDoenca) => {
        REMEDIOS.map((dadosRemedio) => {
            dataAll.push({
                "CD_DOENCA": dadosCdDoenca,
                "DOSAGEM": parseInt(dadosRemedio.dosagem),
                "INTERVALO": dadosRemedio.intervalo,
                "TEMPO_TRATAMENTO": parseInt(dadosRemedio.tempoTratamento),
                "UNIDADE_MEDIDA": dadosRemedio.unidadeMedida.toString(),
                "VIA_ADM": dadosRemedio.VIA_ADM,
                "CD_MATERIAL": parseInt(dadosRemedio.remedio.CD_MATERIAL),
                "DS_MATERIAL": dadosRemedio.remedio.DS_MATERIAL,
                "VIA_ADM": dadosRemedio.viaAdm,
                "CD_MEDICO": parseInt(CD_MEDICO),
                "CD_PESSOA_FISICA": CD_PESSOA_FISICA, 
                "NM_USUARIO": NM_USUARIO,
                "NR_ATENDIMENTO": NR_ATENDIMENTO
            })
        })
    })

    // return res.status(200).send(dataAll)
    let ret = []

    for (const [index, value] of dataAll.entries()) {
        let retorno = await prontuarioDAO.salvarReceitaNovo( value.CD_DOENCA, value.CD_MATERIAL, value.CD_MEDICO, value.CD_PESSOA_FISICA, value.DOSAGEM, value.DS_MATERIAL, value.INTERVALO, value.NM_USUARIO, value.NR_ATENDIMENTO, value.TEMPO_TRATAMENTO, value.UNIDADE_MEDIDA, value.VIA_ADM )
        // let retornFunction = await prontuarioDAO.salvarDiagnostico2(cdMedico, nmUsuario, nrAtendimento,  value, ieTipoDiagnostico)
       
        /* if(retornFunction.status){
            itensSucesso.push({index, value})
        }else{
            itensErro.push({index, value})
        } */
        ret.push(retorno)
    }



    return res.status(200).send({"dados": ret})
}

async function pesquisarExame( req, res ){
    const { dsItem } = req.params

    if (!dsItem) {
        return res.status(404).send({
            status: 'false',
            msg: 'Faltam parametros',
        });
    }

    let retorno = await prontuarioDAO.pesquisarExame(dsItem);
    return res.status(200).send(retorno);
}

async function obterMaterialExame(req, res) {
    const { nrSeqExame } = req.params;

    if (!nrSeqExame) {
        return res.status(404).send({
            status: 'false',
            msg: 'Faltam parametros',
        });
    }

    let retorno = await prontuarioDAO.obterMaterialExame(nrSeqExame);
    return res.status(200).send(retorno);
}

async function salvarItensProcs(req, res) {
    // 111111111111111111111111111111111111
    const {filterExLab} = req.body;

    let retorno = {
        status: false,
        msg: '',
    };
    let itensSucesso = [];
    let itensErro = [];

    for (const [index, value] of filterExLab.entries()) {

        let retornFunction = await prontuarioDAO.salvarItemEspecifico(value.nmUsuario, value.nrSeqPedido, value.qtExame, value.ieOrigemProced, value.nrSeqExameLab, value.cdMaterialExame, value.cdProcedimento, value.nrProcInterno);

        if (retornFunction.status) {
            itensSucesso.push({ index, value });
        } else {
            itensErro.push({ index, value });
        }
    }
    



    if (itensErro.length == 0) {
        retorno.status = true;
        retorno.msg = 'Sucesso ao salvar itens';
    } else {
        retorno.msg = 'Erro ao salvar um ou mais itens';
    }

    retorno.dados = {
        itensSucesso,
        itensErro,
    };

    return res.status(200).send(retorno);
}


async function salvarItemEspecificoCirurgia(req, res) {
    const {cdMaterialExame, nmUsuario, nrSeqPedido, procCir
        // nrSeqExameLab,
        // ieOrigemProced,
        // cdProcedimento,
        // nrProcInterno,
        // qtExame,
    } = req.body;

    if (!nmUsuario || !nrSeqPedido || !(cdMaterialExame || cdMaterialExame == '')) {
        return res.status(404).send({
            status: 'false',
            msg: 'Faltam parametros',
        });
    }

    let cont = 0

    for (const [index, value] of procCir.entries()){
        let retorno = await prontuarioDAO.salvarItemEspecifico(
            nmUsuario,
            nrSeqPedido,
            value.QTD,
            value.IE_ORIGEM_PROCED,
            "",
            cdMaterialExame,
            value.CD_PROCEDIMENTO,
            value.NR_SEQ_PROC_INTERNO,
        );

        if(!retorno.status){
            cont ++
        }
    }

    if(cont == 0){
        return res.status(200).send({"status": true, "msg": "Sucesso ao salvar item especifico"});
    }else{
        return res.status(400).send({"status": false, "msg": "Erro ao inserir item(s)"});
    }
}

async function salvarItemEspecifico(req, res) {
    const {
        nmUsuario,
        nrSeqPedido,
        qtExame,
        ieOrigemProced,
        nrSeqExameLab,
        cdMaterialExame,
        cdProcedimento,
        nrProcInterno,
    } = req.body;

    console.log('controller--------------------');
    console.log({
        nmUsuario,
        nrSeqPedido,
        qtExame,
        ieOrigemProced,
        nrSeqExameLab,
        cdMaterialExame,
        cdProcedimento,
        nrProcInterno,
    });
    if (!nmUsuario ||
        !nrSeqPedido ||
        !qtExame ||
        !ieOrigemProced ||
        !(nrSeqExameLab || nrProcInterno) ||
        !(cdMaterialExame || cdMaterialExame == '') ||
        !cdProcedimento
    ) {
        return res.status(404).send({
            status: 'false',
            msg: 'Faltam parametros',
        });
    }

    let retorno = await prontuarioDAO.salvarItemEspecifico(
        nmUsuario,
        nrSeqPedido,
        qtExame,
        ieOrigemProced,
        nrSeqExameLab,
        cdMaterialExame,
        cdProcedimento,
        nrProcInterno,
    );
    return res.status(200).send(retorno);
}

async function excluirItemEspecifico(req, res) {
    const { nrSeqItem, nrSeqSolicitacao } = req.body;

    if (!nrSeqItem || !nrSeqSolicitacao) {
        return res.status(404).send({
            status: 'false',
            msg: 'Faltam parametros',
        });
    }

    let retorno = await prontuarioDAO.excluirItemEspecifico(
        nrSeqItem,
        nrSeqSolicitacao,
    );
    return res.status(200).send(retorno);
}

async function obterDadosGuiaInternacao(req, res) {
    const { nrAtendimento } = req.body;

    if (!nrAtendimento) {
        return res.status(404).send({
            status: 'false',
            msg: 'Faltam parametros',
        });
    }

    let retorno = await prontuarioDAO.obterDadosGuiaInternacao(nrAtendimento);
    return res.status(200).send(retorno);
}

async function excluirPedidoSolicitacao(req, res) {
    const pedido = req.body;

    if (!pedido.cdPessoaFisica || !pedido.nrSeqPedido) {
        return res.status(404).send({
            status: 'false',
            msg: 'Faltam parametros',
        });
    }

    let retorno = await prontuarioDAO.excluirPedidoSolicitacao(pedido);
    return res.status(200).send(retorno);
}

async function pesquisarProcInterno(req, res) {
    const { dsItem } = req.params;

    if (!dsItem) {
        return res.status(404).send({
            status: 'false',
            msg: 'Faltam parametros',
        });
    }

    let retorno = await prontuarioDAO.pesquisarProcInterno(dsItem);
    return res.status(200).send(retorno);
}



async function pesquisarCirurgias( req, res ){
    // cont { dsItem } = req.params

    /* if (!dsItem){
        return res.status(404).send({
            "status": "false",
            "msg": "Faltam parametros"
        })
    } */

    let retorno = await prontuarioDAO.pesquisarCirurgias()
    return res.status(200).send(retorno)
}

async function examePadrao( req, res ){
    const { nrAtendimento, cdMedico } = req.params

    let retorno = {
        status: false,
        msg: '',
    };
    let listaExames = [];

    if (!nrAtendimento || !cdMedico) {
        return res.status(404).send({
            status: 'false',
            msg: 'Faltam parametros',
        });
    }

    const medGrupo = await prontuarioDAO.medGrupo(nrAtendimento, cdMedico);

    if (medGrupo.status && medGrupo.dados.length > 0) {
        for (item of medGrupo.dados) {
            let examesPadrao = await prontuarioDAO.examePadrao(
                cdMedico,
                item.NR_SEQ_GRUPO,
            );

            listaExames.push({
                nomeGrupo: item.DS_GRUPO_EXAME,
                listaExames: examesPadrao.dados,
            });
        }

        retorno.status = true;
        retorno.msg = 'Exame padrão obtido com sucesso';
        retorno.dados = listaExames;
    } else {
        retorno.msg = 'Médico não possui exame padrão cadastrado';
    }

    return res.status(200).send(retorno);
}

async function examePadraoInstituicao(req, res) {
    const { cdMedico } = req.params;

    let retorno = {
        status: false,
        msg: '',
    };
    let listaExames = [];

    if (!cdMedico) {
        return res.status(404).send({
            status: 'false',
            msg: 'Faltam parametros',
        });
    }

    const medGrupo = await prontuarioDAO.medGrupoInstituicao(cdMedico);
    //return res.status(200).send(medGrupo)

    if (medGrupo.status && medGrupo.dados.length > 0) {
        for (item of medGrupo.dados) {
            let examesPadrao = await prontuarioDAO.examePadraoInstituicao(
                cdMedico,
                item.NR_SEQUENCIA,
            );
            console.log(item);

            listaExames.push({
                seqGrupo: item.NR_SEQUENCIA,
                nomeGrupo: item.DS_GRUPO_EXAME,
                listaExames: examesPadrao.dados,
            });
        }

        retorno.status = true;
        retorno.msg = 'Exame padrão obtido com sucesso';
        retorno.dados = listaExames;
    } else {
        retorno.msg = 'Médico não possui exame padrão cadastrado';
    }

    return res.status(200).send(retorno);
}

async function allExames(req, res) {
    const { cdMedico } = req.params;

    let retorno = {
        status: false,
        msg: '',
    };
    let listaExames = [];

    if (!cdMedico) {
        return res.status(404).send({
            status: 'false',
            msg: 'Faltam parametros',
        });
    }

    const examesGrupos = await prontuarioDAO.examesGrupos(cdMedico);
    return res.status(200).send(examesGrupos)
}

async function listarHemoterapia( req, res ){
    const { nrAtendimento } = req.params

    if (!nrAtendimento){
        return res.status(404).send({
            "status": "false",
            "msg": "Faltam parametros"
        })
    }

    const retorno = await prontuarioDAO.listarHemoterapia(nrAtendimento)
    return res.status(200).send(retorno)
}

async function buscarPrescrProc( req, res ){
    const { nrPrescricao } = req.params

    if (!nrPrescricao){
        return res.status(404).send({
            "status": "false",
            "msg": "Faltam parametros"
        })
    }

    const retorno = await prontuarioDAO.buscarPrescrProc(nrPrescricao)
    return res.status(200).send(retorno)
}

async function buscarPrescrBcoSangue( req, res ){
    const { nrPrescricao } = req.params

    if (!nrPrescricao){
        return res.status(404).send({
            "status": "false",
            "msg": "Faltam parametros"
        })
    }

    const retorno = await prontuarioDAO.buscarPrescrBcoSangue(nrPrescricao)
    return res.status(200).send(retorno)
}

async function gerarNovaPrescricao(req, res){
    const { cd_setor_atendimento, cd_estabelecimento_p, cd_funcao_p, cd_medico_p, cd_perfil_p, cd_pessoa_fisica_p, cd_setor_prescr_p, ie_adep_p, ie_motivo_prescr_p, ie_prescr_emergencia_p, ie_substitui_p, nm_usuario_p, nr_atendimento_p, nr_horas_validade_p, nr_nova_prescr_p, nr_prescr_orig_p, qt_dias_extensao_p } = req.body

    if (!cd_estabelecimento_p || !cd_funcao_p){
        return res.status(404).send({
            "status": "false",
            "msg": "Faltam parametros"
        })
    }

    let retorno = await prontuarioDAO.gerarNovaPrescricao(cd_estabelecimento_p, cd_funcao_p, cd_medico_p, cd_perfil_p, cd_pessoa_fisica_p, cd_setor_prescr_p, ie_adep_p, ie_motivo_prescr_p, ie_prescr_emergencia_p, ie_substitui_p, nm_usuario_p, nr_atendimento_p, nr_horas_validade_p, nr_nova_prescr_p, nr_prescr_orig_p, qt_dias_extensao_p)
    if(retorno.status){
        let retorno2 = await prontuarioDAO.gerarEvolucaoPaciente(nm_usuario_p, cd_medico_p, cd_pessoa_fisica_p, cd_setor_atendimento, nr_atendimento_p)
        if(retorno2.status){
            let retorno3 = await prontuarioDAO.updateLiberarEvolucaoPaciente(retorno2.cd_evolucao)//cd_evolucao
            if(retorno3.status){
                let retorno4 = await prontuarioDAO.liberarEvolucaoPaciente(retorno2.cd_evolucao, nm_usuario_p)
                console.log(retorno4)
                return res.status(200).send(retorno)
            }else{
                return res.status(200).send(retorno3)
            }
        }else{
            return res.status(200).send(retorno2)
        }
    }else{
        return res.status(200).send(retorno)
    }
}

async function prescrSolicBcoSangue(req, res){

    const reqRetorno = new Object;
    const { nr_seq_indicacao, ie_grupo_hemocom, dt_fim, cd_medico, cd_pessoa_fisica, nr_atendimento, cd_doenca_cid, cd_perfil_ativo, ds_cirurgia, ds_coagulopatia, ds_diagnostico, ds_hemocomp_reacao, ds_observacao, ds_pre_medicacao, dt_atualizacao, dt_atualizacao_nrec, dt_cirurgia, dt_programada, dt_ultima_transf, ie_coombs_direto, ie_gravidez, ie_horario_susp, ie_porte_cirurgico, ie_pre_medicacao, ie_reserva, ie_tipo, ie_tipo_paciente, ie_trans_anterior, nm_usuario, nm_usuario_nrec, nr_prescricao, nr_seq_reacao, nr_sequencia, qt_aborto, qt_albumina, qt_altura_cm, qt_bilirrubina_dir, qt_bilirrubina_ind, qt_calcio, qt_fibrinogenio, qt_freq_cardiaca, qt_gravidez, qt_hematocrito, qt_hemoglobina, qt_hemoglobina_s, qt_imc, qt_leucocitos, qt_magnesio, qt_pa_diastolica, qt_pa_sistolica, qt_peso, qt_plaqueta, qt_tap, qt_tap_inr, qt_temp, qt_transf_anterior, qt_ttpa, qt_ttpa_rel, ie_irradiado, ie_lavado, ie_origem_inf, qt_hora_infusao, cd_motivo_baixa, ie_suspenso, cd_setor_atendimento, ie_aprovacao_execucao, ie_tipo_proced, qt_tempo_infusao, ie_util_hemocomponente, nr_seq_interno, ie_se_necessario, ds_horarios, ie_autorizacao, ie_unid_med_hemo, ie_alterar_horario, qt_vol_hemocomp, ie_imagem_pacs, ie_anestesia, cd_intervalo, qt_procedimento, nr_seq_derivado, ie_mostrar_web, ie_filtrado, ds_justificativa, ie_bolus, ie_descricao_cirurgica, ie_modificado, cd_procedimento, ie_status_atend, ie_pendente_amostra, ie_emite_mapa, ie_origem_proced, ie_fenotipado, ie_avisar_result, ie_proced_bloqueado, ie_status_execucao, ie_lavado_justificativa, ie_aberto, ie_externo, ie_exige_liberacao, qt_veloc_inf_hemo, cd_unid_med_sangue, ie_amostra, ie_aliquotado, ie_via_aplicacao, ie_urgencia, ie_acm, ie_exame_bloqueado, dt_prev_execucao, ie_executar_leito, nr_seq_proc_interno, ie_cobra_paciente} = req.body

    if (!nm_usuario_nrec || !nm_usuario || !ie_tipo || !ie_gravidez || !dt_programada || !ie_tipo_paciente || !ie_trans_anterior || !nr_prescricao || !cd_doenca_cid){
        return res.status(404).send({
            "status": "false",
            "msg": "Faltam parametros aq"
        })
    }

    let retorno = await prontuarioDAO.prescrSolicBcoSangue(cd_doenca_cid, cd_perfil_ativo, ds_cirurgia, ds_coagulopatia, ds_diagnostico, ds_hemocomp_reacao, ds_observacao, ds_pre_medicacao, dt_atualizacao, dt_atualizacao_nrec, dt_cirurgia, dt_programada, dt_ultima_transf, ie_coombs_direto, ie_gravidez, ie_horario_susp, ie_porte_cirurgico, ie_pre_medicacao, ie_reserva, ie_tipo, ie_tipo_paciente, ie_trans_anterior, nm_usuario, nm_usuario_nrec, nr_prescricao, nr_seq_reacao, nr_sequencia, qt_aborto, qt_albumina, qt_altura_cm, qt_bilirrubina_dir, qt_bilirrubina_ind, qt_calcio, qt_fibrinogenio, qt_freq_cardiaca, qt_gravidez, qt_hematocrito, qt_hemoglobina, qt_hemoglobina_s, qt_imc, qt_leucocitos, qt_magnesio, qt_pa_diastolica, qt_pa_sistolica, qt_peso, qt_plaqueta, qt_tap, qt_tap_inr, qt_temp, qt_transf_anterior, qt_ttpa, qt_ttpa_rel)
    
    if(retorno.status == true){
        if(nr_seq_indicacao){
            let insertInutilPAtrapalharMyLife = await prontuarioDAO.prescrSolBsIndicacao(retorno.nr_seq_solic_sangue, nm_usuario, ie_grupo_hemocom, nr_seq_indicacao, cd_perfil_ativo)
        }
        
        let retMax = []

        let count  = await prontuarioDAO.countNrPrescrProcedimento(nr_prescricao)
        let contProx = 0 

        for (const [index, value] of cd_procedimento.entries()){
            // value = cd_procedimento
            // retorno.nr_seq_solic_sangue = nr_seq_solic_sangue
            contProx = count.NR_SEQ + 1
            let retornFunction = await prontuarioDAO.prescr_procedimento(ie_irradiado, ie_lavado, ie_origem_inf, qt_hora_infusao, cd_motivo_baixa, dt_atualizacao, ie_suspenso, cd_setor_atendimento, ie_aprovacao_execucao, ie_tipo_proced, qt_tempo_infusao, ie_util_hemocomponente, nr_seq_interno, ie_se_necessario, nr_prescricao, ds_horarios, ie_autorizacao, ie_unid_med_hemo, ie_alterar_horario, qt_vol_hemocomp, ie_imagem_pacs, ie_anestesia, cd_intervalo, cd_perfil_ativo, qt_procedimento, nr_seq_derivado, ie_mostrar_web, ie_filtrado, ds_justificativa, ie_bolus, ie_descricao_cirurgica, ie_modificado, ds_observacao, retorno.nr_seq_solic_sangue, value.CD_PROCEDIMENTO, ie_status_atend, ie_pendente_amostra, ie_emite_mapa, ie_origem_proced, ie_fenotipado, ie_avisar_result, ie_proced_bloqueado, ie_status_execucao, ie_lavado_justificativa, ie_aberto, ie_externo, ie_exige_liberacao, qt_veloc_inf_hemo, cd_unid_med_sangue, ie_amostra, ie_aliquotado, contProx, ie_via_aplicacao, ie_urgencia, ie_acm, nm_usuario, dt_atualizacao_nrec, nm_usuario_nrec, ie_horario_susp, ie_exame_bloqueado, dt_prev_execucao, ie_executar_leito, nr_seq_proc_interno, ie_cobra_paciente, dt_programada, dt_fim)
            let nr_seq_presc_procedimento = retornFunction.dados;
            
            retMax.push(retornFunction);

            let procedureInserirHemoterapiaAntCPOE = await prontuarioDAO.procedureInserirHemoterapiaAntCPOE(nr_atendimento, cd_pessoa_fisica, nr_prescricao, cd_medico, nr_seq_presc_procedimento[0], nm_usuario, cd_perfil_ativo, 1, dt_programada); // Estatico como 1
            let updateCpoeCPOE = await prontuarioDAO.updateCpoe(parseInt(procedureInserirHemoterapiaAntCPOE.nr_seq_cpoe_hemoterapia));

            reqRetorno.dados = procedureInserirHemoterapiaAntCPOE;
        }
        if (reqRetorno.status === false) {
            return res.status(400).json({
                status: false,
                msg: 'Erro ao inserir hemoterapia'
            })
        } else {
            return res.status(200).json({
                status: true, 
                msg: "Sucesso ao inserir prescrição",
                dados: reqRetorno
            })
        }
    }else{
        return res.status(401).send("erro inesperado")
    }
}


async function verificarProcedimentos(req, res){

    const reqRetorno = new Object;
    const { cdPessoaFisica, cdProcedimento, nmUsuario} = req.body

    if (!cdPessoaFisica || !cdProcedimento || !nmUsuario){
        return res.status(404).send({
            "status": "false",
            "msg": "Faltam parametros aq"
        })
    }

    let ret = []

    for (const [index, value] of cdProcedimento.entries()){
        let retornFunction = await prontuarioDAO.verificarProcedimentos(cdPessoaFisica, value, nmUsuario)

        ret.push(retornFunction)
    }

    return res.status(200).json({
        status: true,
        msg: 'Sucesso',
        dados: ret
    })

    /* if (reqRetorno.status === false) {
        return res.status(400).json({
            status: false,
            msg: 'Erro ao inserir hemoterapia'
        })
    } else {
        return res.status(200).json({
            status: true, 
            msg: "Sucesso ao inserir prescrição",
            dados: reqRetorno
        })
    } */
   
}


const procedureLiberarHemoterapia = async (req, res) => {
    const { cd_estabelecimento_p, cd_setor_atendimento_p, cd_perfil_p, nr_atendimento_p, itens_liberar_p, nm_usuario_p, cd_pessoa_fisica_p, cd_medico_p, nr_prescricao_p } = req.body;

    if ( !cd_estabelecimento_p || !cd_setor_atendimento_p || !cd_perfil_p || !nr_atendimento_p || !itens_liberar_p || !nm_usuario_p || !cd_pessoa_fisica_p || !cd_medico_p || !nr_prescricao_p) {
        console.log(cd_estabelecimento_p)
        console.log("cd_setor_atendimento_p / " + cd_setor_atendimento_p)
        console.log(cd_perfil_p)
        console.log(nr_atendimento_p)
        console.log(itens_liberar_p)
        console.log(nm_usuario_p)
        console.log(cd_pessoa_fisica_p)
        console.log(cd_medico_p)
        console.log("nr_prescricao_p / " + nr_prescricao_p)

        return res.status(400).json({
            status: 'fail',
            message: 'Falta de parâmetros obrigarótios',
            dados: []
        })
    };

    let result = await prontuarioDAO.procedureLiberarHemoterapia(cd_estabelecimento_p, cd_setor_atendimento_p, cd_perfil_p, nr_atendimento_p, itens_liberar_p, nm_usuario_p, cd_pessoa_fisica_p, cd_medico_p, nr_prescricao_p);
    return res.status(result.st).json(result)
};

async function apagarReceita( req, res ){
    const { nrSeqReceita, dtLiberacao } = req.body

    if (!nrSeqReceita) {
        return res.status(404).send({
            status: 'false',
            msg: 'Faltam parametros',
        });
    }

    if (dtLiberacao) {
        return res.status(404).send({
            status: 'false',
            msg: 'Não é possivel a exclusão de uma receita já liberada',
        });
    }

    let retorno = await prontuarioDAO.apagarReceita(nrSeqReceita);
    return res.status(200).send(retorno);
}

async function liberarReceita(req, res) {
    const { nrSeqReceita } = req.body;

    if (!nrSeqReceita) {
        return res.status(404).send({
            status: 'false',
            msg: 'Faltam parametros',
        });
    }

    let retorno = await prontuarioDAO.liberarReceita(nrSeqReceita);
    return res.status(200).send(retorno);
}

async function buscarSolicitacoesExamePaciente(req, res) {
    const { cdPessoaFisica, nmUsuario } = req.params;

    if (!cdPessoaFisica || !nmUsuario) {
        return res.status(404).send({
            status: 'false',
            msg: 'Faltam parametros',
        });
    }

    let retorno = await prontuarioDAO.buscarSolicitacoesExamePaciente(
        cdPessoaFisica,
        nmUsuario,
    );
    return res.status(200).send(retorno);
}

async function buscarSolicitacoesExamePaciente2( req, res ){
    const { cdPessoaFisica, nmUsuario } = req.params

    if (!cdPessoaFisica || !nmUsuario ){
        return res.status(404).send({
            "status": "false",
            "msg": "Faltam parametros"
        })
    }

    let retorno = await prontuarioDAO.buscarSolicitacoesExamePaciente2(cdPessoaFisica, nmUsuario)
    return res.status(200).send(retorno)
}



async function buscarExameParaSolicitacao( req, res ){
    const { descricaoExame } = req.params

    if (!descricaoExame) {
        return res.status(404).send({
            status: 'false',
            msg: 'Faltam parametros',
        });
    }

    let retorno = await prontuarioDAO.buscarExameParaSolicitacao(
        descricaoExame,
    );
    return res.status(200).send(retorno);
}

async function salvarSolicitacaoExame( req, res ){
    const { DS_JUSTIFICATIVA, CD_PROFISSIONAL, CD_DOENCA, IE_NIVEL_ATENCAO, NM_USUARIO_NREC, DS_DADOS_CLINICOS, NM_USUARIO, CD_PERFIL_ATIVO, IE_SITUACAO, CD_PESSOA_FISICA, DS_SOLICITACAO, DS_SOLICITACAO_MATERIAL_CIRURGICO, NR_ATENDIMENTO, IE_FICHA_UNIMED } = req.body

    if (!DS_JUSTIFICATIVA ||
        !CD_PROFISSIONAL ||
        !CD_DOENCA ||
        !IE_NIVEL_ATENCAO ||
        !NM_USUARIO_NREC ||
        !DS_DADOS_CLINICOS ||
        !NM_USUARIO ||
        !CD_PERFIL_ATIVO ||
        !IE_SITUACAO ||
        !CD_PESSOA_FISICA ||
        !NR_ATENDIMENTO ||
        !IE_FICHA_UNIMED
    ) {
        return res.status(404).send({
            status: 'false',
            msg: 'Faltam parametros',
        });
    }

    let retorno = await prontuarioDAO.salvarSolicitacaoExame(DS_JUSTIFICATIVA, CD_PROFISSIONAL, CD_DOENCA, IE_NIVEL_ATENCAO, NM_USUARIO_NREC, DS_DADOS_CLINICOS, NM_USUARIO, CD_PERFIL_ATIVO, IE_SITUACAO, CD_PESSOA_FISICA, DS_SOLICITACAO, DS_SOLICITACAO_MATERIAL_CIRURGICO, NR_ATENDIMENTO, IE_FICHA_UNIMED)
    return res.status(200).send(retorno)
}


async function salvarSolicitacaoExameJustificativa( req, res ){
    const { DS_JUSTIFICATIVA, NR_SEQUENCIA } = req.body

    if (!DS_JUSTIFICATIVA || !NR_SEQUENCIA) {
        return res.status(404).send({
            status: 'false',
            msg: 'Faltam parametros',
        });
    }

    let retorno = await prontuarioDAO.salvarSolicitacaoExameJustificativa(DS_JUSTIFICATIVA, NR_SEQUENCIA)
    return res.status(200).send(retorno)
}

async function liberarSolicitacaoExame(req, res) {
    const { nrSeqSolicitacao, nmUsuario } = req.body;

    if (!nrSeqSolicitacao || !nmUsuario) {
        return res.status(404).send({
            status: 'false',
            msg: 'Faltam parametros',
        });
    }

    let retorno = await prontuarioDAO.liberarSolicitacaoExame(
        nrSeqSolicitacao,
        nmUsuario,
    );
    return res.status(200).send(retorno);
}

async function buscarItemSolicitacaoExamePaciente(req, res) {
    const { nrSeqPedido } = req.params;

    if (!nrSeqPedido) {
        return res.status(404).send({
            status: 'false',
            msg: 'Faltam parametros',
        });
    }

    let retorno = await prontuarioDAO.buscarItemSolicitacaoExamePaciente(
        nrSeqPedido,
    );
    return res.status(200).send(retorno);
}

async function buscarExamesParaSolicitacao(req, res) {
    const { cdMedico } = req.params;

    if (!cdMedico) {
        return res.status(404).send({
            status: 'false',
            msg: 'Faltam parametros',
        });
    }

    let retorno = await prontuarioDAO.buscarExamesParaSolicitacao(cdMedico);
    return res.status(200).send(retorno);
}

async function salvarItemSolicitacaoExame(req, res) {
    const { nrSeqPedido, nmUsuario, nrSeqExame } = req.body;

    let retorno = {
        status: false,
        msg: '',
    };
    let itensSucesso = [];
    let itensErro = [];

    if (!nrSeqPedido || !nmUsuario || !nrSeqExame) {
        return res.status(404).send({
            status: 'false',
            msg: 'Faltam parametros',
        });
    }

    for (const [index, value] of nrSeqExame.entries()) {
        let retornFunction = await prontuarioDAO.salvarItemSolicitacaoExame(nrSeqPedido, nmUsuario, value.nr_seq, value.qtd);

        if (retornFunction.status) {
            itensSucesso.push({ index, value });
        } else {
            itensErro.push({ index, value });
        }
    }

    if (itensErro.length == 0) {
        retorno.status = true;
        retorno.msg = 'Sucesso ao salvar itens';
    } else {
        retorno.msg = 'Erro ao salvar um ou mais itens';
    }

    retorno.dados = {
        itensSucesso,
        itensErro,
    };

    return res.status(200).send(retorno);
}

async function getAtestadosPaciente(req, res) {
    const { cdPessoaFisica, nrAtendimento } = req.body;

    try {
        if (!cdPessoaFisica || !nrAtendimento) {
            throw new Error(
                'Falta de parâmetros ou vazio: cdPessoaFisica, nrAtendimento',
            );
        }

        const data = await prontuarioDAO.getAtestadosPaciente(
            cdPessoaFisica,
            nrAtendimento,
        );

        if (data.status) {
            res.status(200).json({
                status: true,
                message: 'Sucesso ao buscar lista de atestados',
                dados: data.dados,
            });
        } else {
            res.status(400).json({
                status: true,
                message: 'Não foi possível a lista de atestados',
                dados: data,
            });
        }
    } catch (err) {
        return res.status(400).json({
            status: false,
            msg: 'Erro lançamento',
            err: err.message,
        });
    }
}

async function getRelatorioAtestadoPaciente(req, res) {
    const { nrSequencia } = req.body;

    try {
        if (!nrSequencia) {
            throw new Error('Falta de parâmetro ou vazio: nrSequencia');
        }

        const file = await prontuarioDAO.getArquivoAtestadoPaciente(
            nrSequencia,
        );

        let html = [];

        if (file.dados.DS_ATESTADO.includes('rtf')) {
            let rtf = await prontuarioDAO.converterArquivo2(
                nrSequencia,
                'autoatendimento',
                0,
                1,
                1,
            );

            html = rtf.dados.DS_TEXTO;
        } else {
            html = file.dados.DS_ATESTADO;
        }

        if (file.status) {
            res.status(200).json({
                status: true,
                message: 'Sucesso ao buscar relatório do atestado',
                dados: html,
            });
        } else {
            res.status(400).json({
                status: false,
                message: 'Não foi possível buscar o atestado',
                dados: file,
            });
        }
    } catch (err) {
        res.status(400).json({
            status: false,
            msg: 'Error response',
            err: err.message,
        });
    }
}

async function buscarResultadoExames(req, res) {
    const { cdPessoaFisica, nmUsuario } = req.params;

    if (!cdPessoaFisica || !nmUsuario) {
        return res.status(404).send({
            status: 'false',
            msg: 'Faltam parametros',
        });
    }

    let retorno = await prontuarioDAO.buscarResultadoExames(
        cdPessoaFisica,
        nmUsuario,
    );
    return res.status(200).send(retorno);
}

async function buscarArquivoResultadoExame(req, res) {
    const { nrSeqItem } = req.params;

    if (!nrSeqItem) {
        return res.status(404).send({
            status: 'false',
            msg: 'Faltam parametros',
        });
    }

    let retorno = await prontuarioDAO.buscarArquivoResultadoExame(nrSeqItem);
    return res.status(200).send(retorno);
}

async function getRelatorioResultadoExamePaciente(req, res) {
    const { nrPrescricao } = req.body;
    let files = ''
    let registros = 0

    try {
        if (!nrPrescricao) {
            throw new Error('Falta de parâmetros ou vazio: nrPrescricao');
        }

        const relatorio = await prontuarioDAO.buscarArquivoResultadoExame2(
            nrPrescricao,
        );

        if (relatorio.status) {
           registros = relatorio.dados.length
		for (item of relatorio.dados) {
			let html = await prontuarioDAO.converterArquivo2(
				item.NR_SEQUENCIA,
				item.NM_USUARIO,
				0,
				6,
				2,
			);

			files += html.dados.DS_TEXTO
			// files.push({ html: html.dados.DS_TEXTO });
		}
						
	    return res.status(200).json({
		dados: { registros, files },
	    }); 
        } else {
            return res.status(400).json({
                status: false,
                message: 'Houve um erro ao buscar o relatório.',
                dados: relatorio,
            });
        }
    } catch (err) {
        return res.status(400).json({
            status: false,
            msg: 'Erro lançamento',
            err: err.message,
        });
    }
}

async function buscarMotivoMudancaStatus(req, res) {
    const { nmUsuario } = req.params;

    if (!nmUsuario) {
        return res.status(404).send({
            status: 'false',
            msg: 'Faltam parametros',
        });
    }

    let retorno = await prontuarioDAO.buscarMotivoMudancaStatus(nmUsuario);
    return res.status(200).send(retorno);
}

async function mudarStatusConsulta( req, res ){
    const { cdAgenda, nmUsuario, nrSeqAgenda, ieStatus, dsMotivo, cdMotivo, nrAtendimento } = req.body

    if (!cdAgenda || !nmUsuario || !nrSeqAgenda || !ieStatus) {
        return res.status(404).send({
            status: 'false',
            msg: 'Faltam parametros',
        });
    }
    
    let retorno = await prontuarioDAO.mudarStatusConsulta(cdAgenda, nmUsuario, nrSeqAgenda, ieStatus, dsMotivo, cdMotivo, nrAtendimento)
    return res.status(200).send(retorno)
}

async function obterDadosAtendimento(req, res) {
    const { nrAtendimento } = req.params;

    if (!nrAtendimento) {
        return res.status(404).send({
            status: 'false',
            msg: 'Faltam parametros',
        });
    }

    let retorno = await prontuarioDAO.obterDadosAtendimento(nrAtendimento);
    return res.status(200).send(retorno);
}

async function buscarLaudosExamesImagemPaciente(req, res) {
    const { cdPessoaFisica } = req.params;

    if (!cdPessoaFisica) {
        return res.status(404).send({
            status: 'false',
            msg: 'Faltam parametros',
        });
    }

    let retorno = await prontuarioDAO.buscarLaudosExamesImagemPaciente(
        cdPessoaFisica,
    );
    return res.status(200).send(retorno);
}

async function listarHorariosDisponiveis(req, res) {
    const { idConvenio, idEspecialidade, idProfissional, idCliente } = req.body;

    if (!idConvenio || !idEspecialidade || !idProfissional || !idCliente)
        return res.status(404).send({
            codigo: 1,
            sucesso: false,
            mensagem: 'Faltam Parametros Obrigatórios',
            dados: {},
        });

    let retorno = await prontuarioDAO.listarHorariosDisponiveis(
        idConvenio,
        idEspecialidade,
        idProfissional,
        idCliente,
    );

    return res.status(200).send(retorno);
}

async function listarHorariosDisponiveisAmb(req, res) {
    const { idConvenio, idEspecialidade, idProfissional, idCliente } = req.body;

    if (!idConvenio || !idEspecialidade || !idProfissional || !idCliente)
        return res.status(404).send({
            codigo: 1,
            sucesso: false,
            mensagem: 'Faltam Parametros Obrigatórios',
            dados: {},
        });

    let retorno = await prontuarioDAO.listarHorariosDisponiveisAmb(
        idConvenio,
        idEspecialidade,
        idProfissional,
        idCliente,
    );

    return res.status(200).send(retorno);
}

async function confirmarAgendamentoRetorno(req, res) {
    const {
        idCliente,
        idDependente,
        idConvenio,
        cdCarteirinha,
        idAgenda,
        dataAgenda,
        idEmpresa,
        tipo,
    } = req.body;

    if (!idCliente ||
        !idDependente ||
        !idConvenio ||
        !(cdCarteirinha && idEmpresa) ||
        !idAgenda ||
        !dataAgenda ||
        !tipo
    ) {
        return res.status(404).send({
            codigo: 1,
            sucesso: false,
            mensagem: 'Faltam Parametros Obrigatórios',
        });
    }

    let retorno = await prontuarioDAO.confirmarAgendamentoRetorno(
        idCliente,
        idDependente,
        idConvenio,
        cdCarteirinha,
        idAgenda,
        dataAgenda,
        idEmpresa,
        tipo,
    );

    return res.status(200).send(retorno);
}

async function obterAgendaMedico(req, res) {
    console.log(req.params);
    const { cdAgenda } = req.params;

    if (!cdAgenda) {
        return res.status(404).send({
            codigo: 1,
            sucesso: false,
            mensagem: 'Faltam Parametros Obrigatórios',
        });
    }

    let retorno = await prontuarioDAO.obterAgendaMedico(cdAgenda);

    return res.status(200).send(retorno);
}

async function buscarDadosPaciente(req, res) {
    if (!req.params.cdPessoaFisica) {
        return res.status(404).send({
            codigo: 1,
            sucesso: false,
            mensagem: 'Faltam Parametros Obrigatórios',
        });
    }

    let retorno = await prontuarioDAO.buscarDadosPaciente(
        req.params.cdPessoaFisica,
    );

    return res.status(200).send(retorno);
}

async function obterAgendaMedico(req, res) {
    console.log(req.params);
    const { cdAgenda } = req.params;

    if (!cdAgenda) {
        return res.status(404).send({
            codigo: 1,
            sucesso: false,
            mensagem: 'Faltam Parametros Obrigatórios',
        });
    }

    let retorno = await prontuarioDAO.obterAgendaMedico(cdAgenda);

    return res.status(200).send(retorno);
}

async function obterDatasParaEncaixe(req, res) {
    const { cdAgenda } = req.params;

    if (!cdAgenda) {
        return res.status(404).send({
            codigo: 1,
            sucesso: false,
            mensagem: 'Faltam Parametros Obrigatórios',
        });
    }

    let retorno = await prontuarioDAO.obterDatasParaEncaixe(cdAgenda);

    return res.status(200).send(retorno);
}

async function obterMotivosEncaixe(req, res) {
    let retorno = await prontuarioDAO.obterMotivosEncaixe();

    return res.status(200).send(retorno);
}

async function agendarEncaixe(req, res) {
    const {
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
    } = req.body;

    let retorno = {
        status: false,
        msg: '',
    };

    if (!cdAgenda ||
        !dtAgenda ||
        !hrEncaixe ||
        !cdPessoaFisica ||
        !nmPessoaFisica ||
        !cdConvenio ||
        !cdMedico ||
        !dsObservacao ||
        !nmUsuario ||
        !motivo
    ) {
        return res.status(404).send({
            codigo: 1,
            sucesso: false,
            mensagem: 'Faltam Parametros Obrigatórios',
        });
    }
    const consistir = await prontuarioDAO.consistirEncaixe(
        cdAgenda,
        dtAgenda,
        hrEncaixe,
        cdPessoaFisica,
        cdConvenio,
        nmUsuario,
    );

    if (consistir.status) {
        const encaixe = await prontuarioDAO.gerarEncaixe(
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
        );

        if (encaixe) {
            retorno = encaixe;
        }
    } else {
        retorno.msg = consistir.msg;
    }
    return res.status(200).send(retorno);
}

async function verificarAgendarEncaixe(req, res) {
    const { cdPessoaFisica, cdAgenda, dtAgenda } = req.body;

    let retorno = {
        status: false,
        msg: '',
    };

    if (!cdPessoaFisica || !cdAgenda || !dtAgenda) {
        return res.status(404).send({
            codigo: 1,
            sucesso: false,
            mensagem: 'Faltam Parametros Obrigatórios',
        });
    }
    const consistir = await prontuarioDAO.verificarAgendarEncaixe(
        cdPessoaFisica,
        cdAgenda,
        dtAgenda,
    );

    return res.status(200).send(consistir);
}

async function obterDadosAgendamento(req, res) {
    const { nrSeqAgendamento } = req.params;

    if (!nrSeqAgendamento) {
        return res.status(404).send({
            codigo: 1,
            sucesso: false,
            mensagem: 'Faltam Parametros Obrigatórios',
        });
    }

    let retorno = await prontuarioDAO.obterDadosAgendamento(nrSeqAgendamento);

    return res.status(200).send(retorno);
}

async function obterTaxaRetorno(req, res) {
    const { cdAgenda } = req.params;

    if (!cdAgenda) {
        return res.status(404).send({
            codigo: 1,
            sucesso: false,
            mensagem: 'Faltam Parametros Obrigatórios',
        });
    }

    let retorno = await prontuarioDAO.obterTaxaRetorno(cdAgenda);

    return res.status(200).send(retorno);
}

async function verificarAgenda(req, res) {
    const { cdAgenda, dataAgenda } = req.body;

    if (!cdAgenda || !dataAgenda) {
        return res.status(404).send({
            codigo: 1,
            sucesso: false,
            mensagem: 'Faltam Parametros Obrigatórios',
        });
    }

    let retorno = await prontuarioDAO.verificarAgenda(cdAgenda, dataAgenda);

    return res.status(200).send(retorno);
}

async function listarExames(req, res) {
    const { cdAgenda, cdConvenio } = req.params;

    if (!cdAgenda || !cdConvenio) {
        return res.status(404).send({
            codigo: 1,
            sucesso: false,
            mensagem: 'Faltam Parametros Obrigatórios',
        });
    }

    const listarExames = await prontuarioDAO.listarExames(cdAgenda, cdConvenio);

    return res.status(200).send(listarExames);
}

async function listarHorariosDisponiveisExame(req, res) {
    const { cdAgenda } = req.params;

    if (!cdAgenda) {
        return res.status(404).send({
            codigo: 1,
            sucesso: false,
            mensagem: 'Faltam Parametros Obrigatórios',
        });
    }

    let retorno = await prontuarioDAO.listarHorariosDisponiveisExame(cdAgenda);

    return res.status(200).send(retorno);
}

async function marcarExame(req, res) {
    const {
        idCliente,
        idConvenio,
        codigoCarteirinha,
        idAgenda,
        dataAgenda,
        idEmpresa,
        idMedico,
        procedimentos,
        tipoAgendamento,
    } = req.body;

    if (!idCliente ||
        !idConvenio ||
        !codigoCarteirinha ||
        !idAgenda ||
        !dataAgenda ||
        !idEmpresa ||
        !idMedico ||
        !procedimentos ||
        !tipoAgendamento
    ) {
        return res.status(404).send({
            codigo: 1,
            sucesso: false,
            mensagem: 'Faltam Parametros Obrigatórios',
        });
    }

    let retorno = await agendamentoRetorno.confirmarExame(
        idCliente,
        idConvenio,
        codigoCarteirinha,
        idAgenda,
        dataAgenda,
        idEmpresa,
        idMedico,
        procedimentos,
        tipoAgendamento,
    );

    return res.status(200).send(retorno);
}

async function obterDatasEncaixeExame(req, res) {
    const { cdAgenda } = req.params;

    if (!cdAgenda) {
        return res.status(404).send({
            codigo: 1,
            sucesso: false,
            mensagem: 'Faltam Parametros Obrigatórios',
        });
    }

    let retorno = await prontuarioDAO.obterDatasEncaixeExame(cdAgenda);

    return res.status(200).send(retorno);
}

async function agendarEncaixeExame(req, res) {
    const {
        CD_AGENDA,
        DT_AGENDA,
        HR_ENCAIXE,
        CD_PESSOA_FISICA,
        NM_PESSOA_FISICA,
        CD_CONVENIO,
        PROC_INTERNO,
        CD_MEDICO,
        CD_CARTEIRINHA,
        CD_EMPRESA,
        CD_EXAMES,
        CD_MEDICO_REQ,
        DS_OBSERVACAO,
        NM_USUARIO,
    } = req.body;

    if (!CD_AGENDA ||
        !DT_AGENDA ||
        !HR_ENCAIXE ||
        !CD_PESSOA_FISICA ||
        !NM_PESSOA_FISICA ||
        !CD_CONVENIO ||
        !PROC_INTERNO ||
        !CD_MEDICO ||
        !CD_CARTEIRINHA ||
        !CD_EMPRESA ||
        !CD_EXAMES ||
        !CD_MEDICO_REQ ||
        !DS_OBSERVACAO ||
        !NM_USUARIO
    ) {
        return res.status(404).send({
            codigo: 1,
            sucesso: false,
            mensagem: 'Faltam Parametros Obrigatórios',
        });
    }

    let retorno = await prontuarioDAO.agendarEncaixeExame(
        CD_AGENDA,
        DT_AGENDA,
        HR_ENCAIXE,
        CD_PESSOA_FISICA,
        NM_PESSOA_FISICA,
        CD_CONVENIO,
        PROC_INTERNO,
        CD_MEDICO,
        CD_CARTEIRINHA,
        CD_EMPRESA,
        CD_EXAMES,
        CD_MEDICO_REQ,
        DS_OBSERVACAO,
        NM_USUARIO,
    );

    return res.status(200).send(retorno);
}

async function obterProcedimentos(req, res) {
    if (!req.body.nrAtendimento) {
        return res.status(404).send({
            codigo: 1,
            sucesso: false,
            mensagem: 'Faltam Parametros Obrigatórios',
        });
    }

    let retorno = await prontuarioDAO.obterProcedimentos(
        req.body.nrAtendimento,
    );

    return res.status(200).send(retorno);
}

async function executarProcedimentos(req, res) {
    if (!req.body.nrPrescricao ||
        !req.body.nrSeqProced ||
        !req.body.nmUsuario ||
        !req.body.cdPerfil ||
        !req.body.cdFuncao
    ) {
        return res.status(404).send({
            codigo: 1,
            sucesso: false,
            mensagem: 'Faltam Parametros Obrigatórios',
        });
    }

    if (req.body.nrPrescricao.length == 1) {
        var retorno = await prontuarioDAO.executarProcedimentos(
            req.body.nrPrescricao,
            req.body.nrSeqProced,
            req.body.nmUsuario,
            req.body.cdPerfil,
            req.body.cdFuncao,
        );
    } else if (req.body.nrPrescricao.length > 1) {
        var retorno = [];
        for (var i = 0; i < req.body.nrPrescricao.length - 1; i++) {
            retorno.push(
                await prontuarioDAO.executarProcedimentos(
                    req.body.nrPrescricao[i],
                    req.body.nrSeqProced[i],
                    req.body.nmUsuario,
                    req.body.cdPerfil,
                    req.body.cdFuncao,
                ),
            );
        }
    }

    return res.status(200).send(retorno);
}

async function obterTaxaAvaliacao(req, res) {
    if (!req.params.cdMedico) {
        return res.status(404).send({
            codigo: 1,
            sucesso: false,
            mensagem: 'Faltam Parametros Obrigatórios',
        });
    }

    var retorno = await prontuarioDAO.obterTaxaAvaliacao(req.params.cdMedico);

    return res.status(200).send(retorno);
}

async function buscarMedicoMemed(req, res) {
    const { dsMedico } = req.params;

    if (!dsMedico) {
        return res.status(404).send({
            codigo: 1,
            sucesso: false,
            mensagem: 'Faltam Parametros Obrigatórios',
        });
    }

    var retorno = await prontuarioDAO.buscarMedicoMemed(dsMedico);

    return res.status(200).send(retorno);
}

async function updatePassWord(req, res) {
    const { cdPessoaFisica, password } = req.body;

    if (!cdPessoaFisica) {
        return res.status(404).send({
            codigo: 1,
            sucesso: false,
            mensagem: 'Faltam Parametros Obrigatórios',
        });
    }

    var retorno = await prontuarioDAO.updatePassWord(cdPessoaFisica, password);

    return res.status(200).send(retorno);
}

const resetarSenhaMedico = async(req, res) => {
    const { crm } = req.params;

    if (!crm) {
        return res.status(400).json({
            status: 'fail',
            message: 'Falta de parâmetros obrigatórios!',
        });
    }

    const resetPassword = await prontuarioDAO.resetarSenhaMedico(crm);

    if (resetPassword.status == 'success') {
        return res.status(200).json({
            status: 'success',
            message: 'Senha resetada com sucesso!',
        });
    } else {
        return res.status(400).json({
            status: 'fail',
            message: 'Ocorreu algum erro ao tentar resetar a senha',
            'rows affected': resetPassword,
        });
    }
};

const buscarRetornoPorProtocolo = async(req, res) => {
    const { nr_sequencia } = req.params;

    if (!nr_sequencia) {
        return res.status(400).json({
            status: 'fail',
            message: 'Falta de parametros obrigatórios!',
            dados: [],
        });
    }

    const buscarRetornoPorProtocolo =
        await prontuarioDAO.buscarRetornoPorProtocolo(nr_sequencia);

    return res.status(200).json({
        status: 'success',
        message: 'Busca de retorno feita com sucesso!',
        dados: buscarRetornoPorProtocolo,
    });
};

const buscarRetornoPorPacienteAndAgenda = async(req, res) => {
    const { cd_pessoa_fisica_paciente, cd_agenda } = req.params;

    if (!cd_pessoa_fisica_paciente || !cd_agenda) {
        return res.status(400).json({
            status: 'fail',
            message: 'Falta de parâmetros obrigatórios!',
            dados: [],
        });
    }

    const buscarRetornoPorPacienteAndAgenda =
        await prontuarioDAO.buscarRetornoPorPacienteAndAgenda(
            cd_pessoa_fisica_paciente,
            cd_agenda,
        );

    return res.status(200).json({
        status: 'success',
        message: 'Busca de retorno feita com sucesso!',
        dados: buscarRetornoPorPacienteAndAgenda,
    });
};

const buscarDadosUltimaTransfusao = async (req, res) => {
    const { cd_pessoa_fisica } = req.params;
    try {
        if (!cd_pessoa_fisica) {
            throw new Error('Falta de parametro obrigatorio!');
        }
        const result = await prontuarioDAO.buscarDadosUltimaTransfusao(cd_pessoa_fisica)
        return res.status(200).json(result)
    } catch (err) {
        return res.status(400).json({
            status: 'fail',
            message: 'Ocorreu algum erro ao fazer a requisição!',
            error: err.message,
            dados: new Array
        })
    }
}


module.exports = {
    buscarAtestadosPaciente,
    obterModeloAtestado,
    converterArquivo,
    converterArquivoLista,
    salvarAtestado,
    apagarAtestado,
    liberarAtestado,

    buscarDiagnosticos,
    buscarOcorrenciasDiagnostico,
    checarDiagnosticoExistente,
    checarDiagnosticoExistente2,
    listasParaDiagnostico,
    pesquisarDiagnostico,
    salvarDiagnostico,
    salvarDiagnostico2,
    apagarDiagnostico,
    liberarDiagnostico,

    listarAnamnesePaciente,
    obterTextoPadraoMedico,
    salvarAnamnese,
    liberarAnamnese,
    editarAnamnese,
    excluirAnamnese,

    buscarReceitasPaciente,
    listaMedicamentosReceita,
    buscarMedicamentosReceita,
    salvarReceita,
    salvarReceitaNovo,
    apagarReceita,
    liberarReceita,
    pesquisarRemedio,
    obterUnidadeMedida,
    obterIntervalo,

    buscarSolicitacoesExamePaciente,
    buscarSolicitacoesExamePaciente2,
    buscarExameParaSolicitacao,
    salvarSolicitacaoExame,
    salvarSolicitacaoExameJustificativa,
    liberarSolicitacaoExame,
    buscarItemSolicitacaoExamePaciente,
    buscarExamesParaSolicitacao,
    salvarItemSolicitacaoExame,
    pesquisarExame,
    obterMaterialExame,
    salvarItemEspecifico,
    salvarItemEspecificoCirurgia,
    salvarItensProcs,
    excluirItemEspecifico,
    excluirPedidoSolicitacao,
    obterDadosGuiaInternacao,
    pesquisarProcInterno,
    pesquisarCirurgias,
    examePadrao,
    examePadraoInstituicao,
    allExames,
    listarHemoterapia,
    buscarPrescrProc,
    buscarPrescrBcoSangue,
    gerarNovaPrescricao,
    prescrSolicBcoSangue,
    verificarProcedimentos,

    buscarResultadoExames,
    buscarArquivoResultadoExame,
    converterArquivo2,

    buscarMotivoMudancaStatus,
    mudarStatusConsulta,

    obterDadosAtendimento,

    buscarLaudosExamesImagemPaciente,

    listarHorariosDisponiveis,
    confirmarAgendamentoRetorno,
    buscarDadosPaciente,
    listarHorariosDisponiveisAmb,

    obterAgendaMedico,
    obterDatasParaEncaixe,
    obterMotivosEncaixe,
    agendarEncaixe,
    obterDadosAgendamento,

    obterTaxaRetorno,
    verificarAgenda,

    listarExames,
    listarHorariosDisponiveisExame,
    marcarExame,
    obterDatasEncaixeExame,
    agendarEncaixeExame,

    obterProcedimentos,
    executarProcedimentos,
    obterTaxaAvaliacao,

    buscarMedicoMemed,
    updatePassWord,

    buscarRetornoPorProtocolo,
    buscarRetornoPorPacienteAndAgenda,
    resetarSenhaMedico,
    verificarAgendarEncaixe,
    procedureLiberarHemoterapia,
    buscarDadosUltimaTransfusao,

    histReceitasPaciente,
    getRelatorioResultadoExamePaciente,
    getAtestadosPaciente,
    getRelatorioAtestadoPaciente,
};
