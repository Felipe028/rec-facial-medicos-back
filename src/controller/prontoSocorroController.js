const prontoSocorroDAO = require('../DAO/prontoSocorroDAO');

const filaDeAtendimentoProntoSocorro = async (req, res) => {
    const { cd_setor } = req.params;
    try {
        if (!cd_setor) {
            throw new Error('Falta de parametros!');
        }
        const result = await prontoSocorroDAO.filaDeAtendimentoProntoSocorro(
            cd_setor,
        );
        return res.status(200).json({
            status: 'success',
            message: 'sucesso ao fazer a requisição',
            dados: result,
        });
    } catch (err) {
        return res.status(400).json({
            status: 'fail',
            message: 'ocorrou algum erro na requisição',
            error: err,
        });
    }
};

const listarMedicamentos = async (rqe, res) => {
    try {
        const result = await prontoSocorroDAO.listarMedicamentos();
        return res.status(200).json({
            status: 'success',
            message: 'sucesso ao listar as medicações!',
            dados: result,
        });
    } catch (err) {
        return res.status(400).json({
            status: 'fail',
            message: 'Ocorrou algum erro na requisição',
            error: err,
        });
    }
};

const listarMedicamentosDeRotina = async (rqe, res) => {
    try {
        const result = await prontoSocorroDAO.listarMedicamentosDeRotina();
        return res.status(200).json({
            status: 'success',
            message: 'sucesso ao listar as medicações de rotina!',
            dados: result,
        });
    } catch (err) {
        return res.status(400).json({
            status: 'fail',
            message: 'Ocorrou algum erro na requisição',
            error: err,
        });
    }
};

const buscarUltimosSinaisVitais = async (req, res) => {
    const { nr_atendimento } = req.params;
    try {
        if (!nr_atendimento) {
            throw new Error('Falta de parametro obrigatorio');
        }
        const result = await prontoSocorroDAO.buscarUltimosSinaisVitais(
            nr_atendimento,
        );
        return res.status(200).json({
            status: 'success',
            message: 'sucesso ao buscar ultimos sinais vitais',
            dados: result,
        });
    } catch (err) {
        return res.status(400).json({
            status: 'fail',
            message: 'Ocorrou algum erro na requisição',
            error: err,
        });
    }
};

const atualizarIeGerouKitJs = async (req, res) => {
    const {
        ie_subst_medicamento_p,
        nr_prescricao_p,
        nm_usuario_p,
        ie_manual_p,
        nr_seq_item_p,
    } = req.body;
    try {
        if (
            !ie_subst_medicamento_p &&
            !nr_prescricao_p &&
            !nm_usuario_p &&
            !ie_manual_p &&
            !nr_seq_item_p
        ) {
            throw new Error('Falta de parâmentros obrigatórios!');
        }
        const result = prontoSocorroDAO.gerarKitPrescricao(
            ie_subst_medicamento_p,
            nr_prescricao_p,
            nm_usuario_p,
            ie_manual_p,
            nr_seq_item_p,
        );
        return res.status(200).json({
            status: 'success',
            message: 'Requisição feita com sucesso',
            dados: result,
        });
    } catch (err) {
        return res.status(400).json({
            status: 'fail',
            message: 'Ocorrou algum erro na requisição',
            error: err,
        });
    }
};

const gerarKitPrescricao = async (req, res) => {
    const { nr_prescricao_p, nm_usuario_p, ie_gerou_kit_p } = req.body;
    try {
        if (!nr_prescricao_p && !nm_usuario_p && !ie_gerou_kit_p) {
            throw new Error('Falta de parâmentros obrigatórios!');
        }
        const result = prontoSocorroDAO.atualizarIeGerouKitJs(
            nr_prescricao_p,
            nm_usuario_p,
            ie_gerou_kit_p,
        );
        return res.status(200).json({
            status: 'success',
            message: 'Requisição feita com sucesso',
            dados: result,
        });
    } catch (err) {
        return res.status(400).json({
            status: 'fail',
            message: 'Ocorrou algum erro na requisição',
            error: err,
        });
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
