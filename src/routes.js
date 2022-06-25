const express = require('express');
const router = express.Router();
const { checarDiagnosticoExistente } = require('./DAO/prontuarioDAO');

multer = require('multer');
path = require('path');
crypto = require('crypto');

const upload = multer({
    dest: 'swap/',
    limits: {
        fieldSize: 8 * 1024 * 1024,
    },
});

const checarDiagnostico = async (req, res, next) => {
    const { NR_ATENDIMENTO, NM_USUARIO } = req.body;

    console.log({ NR_ATENDIMENTO, NM_USUARIO });
    const diagnosticoAtendimento = await checarDiagnosticoExistente(
        NR_ATENDIMENTO,
        NM_USUARIO,
    );

    console.log(diagnosticoAtendimento);

    if (diagnosticoAtendimento) {
        next();
    } else {
        res.send({
            status: false,
            msg: 'Atendimento sem diagnóstico',
        });
    }
};

var crypto;
var storage = multer.diskStorage({
    destination: './swap/',
    filename: function (req, file, cb) {
        return crypto.pseudoRandomBytes(16, function (err, raw) {
            if (err) {
                return cb(err);
            }
            return cb(
                null,
                '' + raw.toString('hex') + path.extname(file.originalname),
            );
        });
    },
});

const medicalController = require('./controller/medicalController');
const zoomController = require('./controller/zoomController');
const prontuarioController = require('./controller/prontuarioController');
const telemedicinaController = require('./controller/telemedicinaController');
const laudosController = require('./controller/laudoController');
const prontoSocorroController = require('./controller/prontoSocorroController');

// >>>>>>>>>>Novos controllers>>>>>>>>>>
const usuarioController = require('./controller/usuarioController');
const { authenticate } = require('./middleware/authenticate')
// <<<<<<<<<<Novos controllers<<<<<<<<<<

// >>>>>>>>>>>>>>>>>>>>>>>>>>Novas Rotas<<<<<<<<<<<<<<<<<<<<<<<<<
router.post('/login', usuarioController.login);

router.get('/getSetores', usuarioController.getSetores);

router.get('/getTurnos', usuarioController.getTurnos);

router.post('/registrarPonto', authenticate, usuarioController.registrarPonto);
// >>>>>>>>>>>>>>>>>>>>>>>>>>Novas Rotas<<<<<<<<<<<<<<<<<<<<<<<<<

router.get('/medical/agenda/:crm', medicalController.getAgenda);
router.get(
    '/medical/callPatient/:nr_seq_senha_p/:nm_maquina_atual_p/:nr_seq_fila_p/:cd_senha_p/:nm_usuario_p/:nr_seq_local_p',
    medicalController.callPatient,
);
router.get('/medical/getMachine/', medicalController.getMachine);

router.get(
    '/medical/getSchedulesFromMedic/:cd_medico',
    medicalController.getSchedulesFromMedic,
);

router.get(
    '/medical/listMedicalProduction/:cd_agenda/:dt_inicial/:dt_final/:status_agenda',
    medicalController.listMedicalProduction,
);

router.post('/medical/action/create/', medicalController.createAuthRecFace);

router.get('/medical/adiendente/:crm', medicalController.getAgendaPendente);

router.post('/zoom/postZoom', zoomController.postZoom);

router.post('/zoom/getToken', zoomController.getToken);
/////
router.post('/log/salvaPrescricao', medicalController.salvaPrescricao);

//Rotas protuario -> REC_FACIAL_AMBULATORIO
//Rotas de atestado
router.get(
    '/prontuario/buscarAtestadosPaciente/:cdPessoaFisica/:nmUsuario/:cdMedico',
    prontuarioController.buscarAtestadosPaciente,
);
router.get(
    '/prontuario/obterModeloAtestado/:nr_atendimento',
    prontuarioController.obterModeloAtestado,
);
router.post(
    '/prontuario/salvarAtestado',
    checarDiagnostico,
    prontuarioController.salvarAtestado,
);
router.post('/prontuario/apagarAtestado/', prontuarioController.apagarAtestado);
router.post(
    '/prontuario/liberarAtestado/',
    prontuarioController.liberarAtestado,
);

//Rotas de diagnostico
router.get(
    '/prontuario/buscarDiagnosticos/:nrAtendimento/:nmUsuario/:cdPessoaFisica',
    prontuarioController.buscarDiagnosticos,
);
router.get(
    '/prontuario/buscarOcorrenciasDiagnostico/:cdPessoaFisica/:cdDoenca',
    prontuarioController.buscarOcorrenciasDiagnostico,
);
router.get(
    '/prontuario/checarDiagnosticoExistente/:nrAtendimento/:nmUsuario',
    prontuarioController.checarDiagnosticoExistente,
);
router.post(
    '/prontuario/listasParaDiagnostico',
    prontuarioController.listasParaDiagnostico,
);
router.post(
    '/prontuario/salvarDiagnostico',
    prontuarioController.salvarDiagnostico,
);
router.get(
    '/prontuario/pesquisarDiagnostico/:descricaoItem',
    prontuarioController.pesquisarDiagnostico,
);
router.post(
    '/prontuario/salvarDiagnostico2',
    prontuarioController.salvarDiagnostico2,
);
router.post(
    '/prontuario/apagarDiagnostico',
    prontuarioController.apagarDiagnostico,
);
router.post(
    '/prontuario/liberarDiagnostico',
    prontuarioController.liberarDiagnostico,
);

//Rotas anamnese
router.get(
    '/prontuario/buscarAnamnesePaciente/:cdPessoaFisica/:nmUsuario/:cdMedico',
    prontuarioController.listarAnamnesePaciente,
);
router.get(
    '/prontuario/obterTextoPadraoMedico/:cdMedico',
    prontuarioController.obterTextoPadraoMedico,
);
router.post('/prontuario/salvarAnamnese', prontuarioController.salvarAnamnese);
router.post(
    '/prontuario/liberarAnamnese',
    prontuarioController.liberarAnamnese,
);
router.put('/prontuario/editarAnamnese', prontuarioController.editarAnamnese);
router.post(
    '/prontuario/excluirAnamnese',
    prontuarioController.excluirAnamnese,
);

//receita ->
router.get(
    '/prontuario/buscarReceitasPaciente/:cdPessoaFisica/:nmUsuario',
    prontuarioController.buscarReceitasPaciente,
);
router.get(
    '/prontuario/listaMedicamentosReceita/:cdMedico',
    prontuarioController.listaMedicamentosReceita,
);
router.get(
    '/prontuario/pesquisarMedicamentosReceita/:cdMedico/:descricaoItem',
    prontuarioController.buscarMedicamentosReceita,
);
router.post(
    '/prontuario/salvarReceita',
    checarDiagnostico,
    prontuarioController.salvarReceita,
);
router.post('/prontuario/apagarReceita', prontuarioController.apagarReceita);
router.post('/prontuario/liberarReceita', prontuarioController.liberarReceita);

//solicitacao de exames
router.get(
    '/prontuario/buscarSolicitacoesExamePaciente/:cdPessoaFisica/:nmUsuario',
    prontuarioController.buscarSolicitacoesExamePaciente,
);
router.get(
    '/prontuario/buscarExameParaSolicitacao/:descricaoExame',
    prontuarioController.buscarExameParaSolicitacao,
);
router.post(
    '/prontuario/salvarSolicitacaoExame',
    prontuarioController.salvarSolicitacaoExame,
);
router.post(
    '/prontuario/liberarSolicitacaoExame',
    prontuarioController.liberarSolicitacaoExame,
);
router.get(
    '/prontuario/buscarItemSolicitacaoExamePaciente/:nrSeqPedido',
    prontuarioController.buscarItemSolicitacaoExamePaciente,
);
router.get(
    '/prontuario/buscarExamesParaSolicitacao/:cdMedico',
    prontuarioController.buscarExamesParaSolicitacao,
);
router.post(
    '/prontuario/salvarItemSolicitacaoExame',
    prontuarioController.salvarItemSolicitacaoExame,
);
router.get(
    '/prontuario/pesquisarExame/:dsItem',
    prontuarioController.pesquisarExame,
);
router.get(
    '/prontuario/obterMaterialExame/:nrSeqExame',
    prontuarioController.obterMaterialExame,
);
router.post(
    '/prontuario/salvarItemEspecifico/',
    prontuarioController.salvarItemEspecifico,
);
router.post(
    '/prontuario/salvarItensProcs/',
    prontuarioController.salvarItensProcs,
);
router.get(
    '/prontuario/pesquisarProcInterno/:dsItem',
    prontuarioController.pesquisarProcInterno,
);
router.post(
    '/prontuario/excluirItemEspecifico/',
    prontuarioController.excluirItemEspecifico,
);
router.post(
    '/prontuario/excluirPedidoSolicitacao/',
    prontuarioController.excluirPedidoSolicitacao,
);
router.post(
    '/prontuario/obterDadosGuiaInternacao',
    prontuarioController.obterDadosGuiaInternacao,
);

router.get(
    '/prontuario/examePadrao/:nrAtendimento/:cdMedico',
    prontuarioController.examePadrao,
);
router.get(
    '/prontuario/examePadraoInstituicao/:cdMedico',
    prontuarioController.examePadraoInstituicao,
);

router.get('/prontuario/allExames/:cdMedico', prontuarioController.allExames);

//Rotas de diagnostico
router.get(
    '/prontuario/buscarDiagnosticos/:nrAtendimento/:nmUsuario/:cdPessoaFisica',
    prontuarioController.buscarDiagnosticos,
);
router.get(
    '/prontuario/buscarOcorrenciasDiagnostico/:cdPessoaFisica/:cdDoenca',
    prontuarioController.buscarOcorrenciasDiagnostico,
);
router.get(
    '/prontuario/checarDiagnosticoExistente/:nrAtendimento/:nmUsuario',
    prontuarioController.checarDiagnosticoExistente,
);
router.get(
    '/prontuario/checarDiagnosticoExistente2/:nrAtendimento/:nmUsuario',
    prontuarioController.checarDiagnosticoExistente2,
);
router.post(
    '/prontuario/listasParaDiagnostico',
    prontuarioController.listasParaDiagnostico,
);
router.post(
    '/prontuario/salvarDiagnostico',
    prontuarioController.salvarDiagnostico,
);
router.get(
    '/prontuario/pesquisarDiagnostico/:descricaoItem',
    prontuarioController.pesquisarDiagnostico,
);
router.post(
    '/prontuario/salvarDiagnostico2',
    prontuarioController.salvarDiagnostico2,
);
router.post(
    '/prontuario/apagarDiagnostico',
    prontuarioController.apagarDiagnostico,
);
router.post(
    '/prontuario/liberarDiagnostico',
    prontuarioController.liberarDiagnostico,
);

router.post(
    '/getRelatorioResultadoExamePaciente',
    prontuarioController.getRelatorioResultadoExamePaciente,
);

router.post('/getAtestadosPaciente', prontuarioController.getAtestadosPaciente);
router.post(
    '/getRelatorioAtestadoPaciente',
    prontuarioController.getRelatorioAtestadoPaciente,
);

router.post('/getAtestadosPaciente', prontuarioController.getAtestadosPaciente);
router.post(
    '/getRelatorioAtestadoPaciente',
    prontuarioController.getRelatorioAtestadoPaciente,
);

//receita ->
router.get(
    '/prontuario/buscarReceitasPaciente/:cdPessoaFisica/:nmUsuario',
    prontuarioController.buscarReceitasPaciente,
);
router.get(
    '/prontuario/listaMedicamentosReceita/:cdMedico',
    prontuarioController.listaMedicamentosReceita,
);
router.get(
    '/prontuario/pesquisarMedicamentosReceita/:cdMedico/:descricaoItem',
    prontuarioController.buscarMedicamentosReceita,
);
router.post(
    '/prontuario/salvarReceita',
    checarDiagnostico,
    prontuarioController.salvarReceita,
);
router.post(
    '/prontuario/salvarReceitaNovo',
    prontuarioController.salvarReceitaNovo,
);
router.post('/prontuario/apagarReceita', prontuarioController.apagarReceita);
router.post('/prontuario/liberarReceita', prontuarioController.liberarReceita);
router.get(
    '/prontuario/pesquisarRemedio/:descricaoItem',
    prontuarioController.pesquisarRemedio,
);
router.get(
    '/prontuario/obterUnidadeMedida',
    prontuarioController.obterUnidadeMedida,
);
router.get('/prontuario/obterIntervalo', prontuarioController.obterIntervalo);

//solicitacao de exames
router.get(
    '/prontuario/buscarSolicitacoesExamePaciente/:cdPessoaFisica/:nmUsuario',
    prontuarioController.buscarSolicitacoesExamePaciente,
);
router.get(
    '/prontuario/buscarSolicitacoesExamePaciente2/:cdPessoaFisica/:nmUsuario',
    prontuarioController.buscarSolicitacoesExamePaciente2,
);
router.get(
    '/prontuario/buscarExameParaSolicitacao/:descricaoExame',
    prontuarioController.buscarExameParaSolicitacao,
);
router.post(
    '/prontuario/salvarSolicitacaoExame',
    prontuarioController.salvarSolicitacaoExame,
);
router.put(
    '/prontuario/salvarSolicitacaoExameJustificativa',
    prontuarioController.salvarSolicitacaoExameJustificativa,
);
router.post(
    '/prontuario/liberarSolicitacaoExame',
    prontuarioController.liberarSolicitacaoExame,
);
router.get(
    '/prontuario/buscarItemSolicitacaoExamePaciente/:nrSeqPedido',
    prontuarioController.buscarItemSolicitacaoExamePaciente,
);
router.get(
    '/prontuario/buscarExamesParaSolicitacao/:cdMedico',
    prontuarioController.buscarExamesParaSolicitacao,
);
router.post(
    '/prontuario/salvarItemSolicitacaoExame',
    prontuarioController.salvarItemSolicitacaoExame,
);
router.get(
    '/prontuario/pesquisarExame/:dsItem',
    prontuarioController.pesquisarExame,
);
router.get(
    '/prontuario/obterMaterialExame/:nrSeqExame',
    prontuarioController.obterMaterialExame,
);
router.post(
    '/prontuario/salvarItemEspecifico/',
    prontuarioController.salvarItemEspecifico,
);
router.post(
    '/prontuario/salvarItemEspecificoCirurgia',
    prontuarioController.salvarItemEspecificoCirurgia,
);
router.get(
    '/prontuario/pesquisarProcInterno/:dsItem',
    prontuarioController.pesquisarProcInterno,
);
router.get(
    '/prontuario/pesquisarCirurgias',
    prontuarioController.pesquisarCirurgias,
);
router.post(
    '/prontuario/excluirItemEspecifico/',
    prontuarioController.excluirItemEspecifico,
);
router.post(
    '/prontuario/excluirPedidoSolicitacao/',
    prontuarioController.excluirPedidoSolicitacao,
);
router.post(
    '/prontuario/obterDadosGuiaInternacao',
    prontuarioController.obterDadosGuiaInternacao,
);
router.post(
    '/prontuario/gerarNovaPrescricao',
    prontuarioController.gerarNovaPrescricao,
);
router.post(
    '/prontuario/prescrSolicBcoSangue',
    prontuarioController.prescrSolicBcoSangue,
);
router.post(
    '/prontuario/verificarProcedimentos',
    prontuarioController.verificarProcedimentos,
);

router.get(
    '/prontuario/examePadrao/:nrAtendimento/:cdMedico',
    prontuarioController.examePadrao,
);
router.get(
    '/prontuario/examePadraoInstituicao/:cdMedico',
    prontuarioController.examePadraoInstituicao,
);
router.post(
    '/prontuario/liberarHemoterapia/',
    prontuarioController.procedureLiberarHemoterapia,
);
router.get(
    '/prontuario/buscarDadosUltimaTransfusao/:cd_pessoa_fisica',
    prontuarioController.buscarDadosUltimaTransfusao,
);

router.get(
    '/prontuario/buscarPrescrProc/:nrPrescricao',
    prontuarioController.buscarPrescrProc,
);
router.get(
    '/prontuario/buscarPrescrBcoSangue/:nrPrescricao',
    prontuarioController.buscarPrescrBcoSangue,
);

//resultado de exames
router.get(
    '/prontuario/buscarResultadosExames/:cdPessoaFisica/:nmUsuario',
    prontuarioController.buscarResultadoExames,
);
router.get(
    '/prontuario/buscarArquivoResultadoExame/:nrSeqItem',
    prontuarioController.buscarArquivoResultadoExame,
);

//Rotas de converção
router.post(
    '/prontuario/converterArquivo',
    prontuarioController.converterArquivo,
);
router.post(
    '/prontuario/converterArquivo2',
    prontuarioController.converterArquivo2,
);
router.get(
    '/prontuario/converterArquivoLista/:idArquivo/:nmUsuario',
    prontuarioController.converterArquivoLista,
);

//Rotas de status da consulta
router.get(
    '/prontuario/buscarMotivoMudancaStatus/:nmUsuario',
    prontuarioController.buscarMotivoMudancaStatus,
);
router.put(
    '/prontuario/mudarStatusConsulta',
    prontuarioController.mudarStatusConsulta,
);

//obter dados do atendimento
router.get(
    '/prontuario/obterDadosAtendimento/:nrAtendimento',
    prontuarioController.obterDadosAtendimento,
);

//Rotas de Exames de Imagem
router.get(
    '/prontuario/buscarLaudosExamesImagemPaciente/:cdPessoaFisica',
    prontuarioController.buscarLaudosExamesImagemPaciente,
);

router.post(
    '/prontuario/historicoReceitasPaciente',
    prontuarioController.histReceitasPaciente,
);

//Rotas para marcação de retorno consulta
router.post(
    '/prontuario/listarHorariosDisponiveis',
    prontuarioController.listarHorariosDisponiveis,
);
router.post(
    '/prontuario/listarHorariosDisponiveisAmb',
    prontuarioController.listarHorariosDisponiveisAmb,
);
router.post(
    '/prontuario/confirmarAgendamentoRetorno',
    prontuarioController.confirmarAgendamentoRetorno,
);
router.get(
    '/prontuario/buscarDadosPaciente/:cdPessoaFisica',
    prontuarioController.buscarDadosPaciente,
);

//Agendamento de Encaixe consulta
router.get(
    '/prontuario/obterAgendaMedico/:cdAgenda',
    prontuarioController.obterAgendaMedico,
);
router.get(
    '/prontuario/obterDatasParaEncaixe/:cdAgenda',
    prontuarioController.obterDatasParaEncaixe,
);
router.get(
    '/prontuario/obterMotivosEncaixe',
    prontuarioController.obterMotivosEncaixe,
);
router.post('/prontuario/agendarEncaixe', prontuarioController.agendarEncaixe);
router.post(
    '/prontuario/verificarAgendarEncaixe',
    prontuarioController.verificarAgendarEncaixe,
);
router.get(
    '/prontuario/obterDadosAgendamento/:nrSeqAgendamento',
    prontuarioController.obterDadosAgendamento,
);
router.get(
    '/prontuario/obterTaxaRetorno/:cdAgenda',
    prontuarioController.obterTaxaRetorno,
);

router.post(
    '/prontuario/verificarAgenda',
    prontuarioController.verificarAgenda,
);

//Rotas para marcação de retorno exames
router.get(
    '/prontuario/listarExames/:cdAgenda/:cdConvenio',
    prontuarioController.listarExames,
);
router.get(
    '/prontuario/listarHorariosDisponiveisExame/:cdAgenda',
    prontuarioController.listarHorariosDisponiveisExame,
);
router.post('/prontuario/marcarExame', prontuarioController.marcarExame);

//Agendamento de Encaixe consulta
router.get(
    '/prontuario/obterDatasEncaixeExame/:cdAgenda',
    prontuarioController.obterDatasEncaixeExame,
);
router.post(
    '/prontuario/agendarEncaixeExame',
    prontuarioController.agendarEncaixeExame,
);

//Procedimentos
router.post(
    '/prontuario/obterProcedimentos',
    prontuarioController.obterProcedimentos,
);
router.post(
    '/prontuario/executarProcedimentos',
    prontuarioController.executarProcedimentos,
);

router.get(
    '/prontuario/obterTaxaAvaliacao/:cdMedico',
    prontuarioController.obterTaxaAvaliacao,
);

router.get(
    '/dados/execRecFacial/:cd_pf_medico',
    medicalController.getExecComRecFacial,
);
router.get(
    '/dados/execSemRecFacial/:cd_pf_medico',
    medicalController.getExecSemRecFacial,
);
router.get(
    '/dados/getTodosAgendados/:cd_agenda',
    medicalController.getTodosAgendados,
);

//Rotas memed
router.get(
    '/prontuario/buscarMedicoMemed/:dsMedico',
    prontuarioController.buscarMedicoMemed,
);

//Update Senha
router.put('/prontuario/updatePassWord', prontuarioController.updatePassWord);

// buscar retorno usando o nr_sequencia nos query params
router.get(
    '/prontuario/buscarRetornoPorProtocolo/:nr_sequencia',
    prontuarioController.buscarRetornoPorProtocolo,
);
router.get(
    '/prontuario/buscarRetornoPorPacienteAndAgenda/:cd_pessoa_fisica_paciente/:cd_agenda',
    prontuarioController.buscarRetornoPorPacienteAndAgenda,
);
router.put(
    '/prontuario/resetarSenhaMedico/:crm',
    prontuarioController.resetarSenhaMedico,
);
router.get(
    '/prontuario/listarHemoterapia/:nrAtendimento',
    prontuarioController.listarHemoterapia,
);

// Rotas Telemedicina
router.get(
    '/prontuario/telemedicina/carregarFilaAtendimentoTelemedicina',
    telemedicinaController.listarAtendimentos,
);
router.patch(
    '/prontuario/telemedicina/mudarStatusAtendimento',
    telemedicinaController.mudarStatusAtendimento,
);

router.get(
    '/prontuario/laudo/buscarLaudosMedicos',
    laudosController.buscarLaudosMedicos,
);
router.get(
    '/prontuario/laudo/buscarLaudosPendentes',
    laudosController.buscarLaudosPendentes,
);

// Rotas Controller Pronto Socorro
router.get(
    '/prontuario/ps/filaDeAtendimentoProntoSocorro/:cd_setor',
    prontoSocorroController.filaDeAtendimentoProntoSocorro,
);
router.get(
    '/prontuario/ps/listarMedicamentos',
    prontoSocorroController.listarMedicamentos,
);
router.get(
    '/prontuario/ps/listarMedicamentosDeRotina',
    prontoSocorroController.listarMedicamentosDeRotina,
);
router.get(
    '/prontuario/ps/buscarUltimosSinaisVitais/:nr_atendimento',
    prontoSocorroController.buscarUltimosSinaisVitais,
);

// Procedures Medicamentos PS
router.post(
    '/prontuario/ps/medicamentos/atualizarIeGerouKitJs',
    prontoSocorroController.atualizarIeGerouKitJs,
);
router.post(
    '/prontuario/ps/medicamentos/gerarKitPrescricao',
    prontoSocorroController.gerarKitPrescricao,
);



module.exports = router;
