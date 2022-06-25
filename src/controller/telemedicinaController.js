const telemedicinaDAO = require('../DAO/telemedicinaDAO');

const listarAtendimentos = async (req, res) => {
    const result = await telemedicinaDAO.listarAtendimentos();
    return res.status(200).json(result);
}

const mudarStatusAtendimento = async(req, res) => {
    const { nr_atendimento, set_status, nm_usuario } = req.body

    console.log({nr_atendimento, set_status, nm_usuario});
    const retorno = new Object;
    retorno.status = false;
    try {
        if (!nr_atendimento || !set_status || !nm_usuario) {
            throw new Error('Falta de parametros')
        }
        const result = telemedicinaDAO.mudarStatusAtendimento(nr_atendimento, set_status, nm_usuario);
        if (result.status === false) {
            throw new Error('Ocorrou algum erro ao alterar o status do atendimento!')
        }
        return res.status(200).json({
            status: 'success',
            message: 'Requisição feita com sucesso',
        })
    } catch (error) {
        retorno.status = false;
        retorno.msg = 'Ocorrou algum erro inesperado!'
        retorno.err = error.message
        retorno.dados = []
        retorno.parametros = { 
            "nr_atendimento": nr_atendimento ? nr_atendimento : '', 
            "set_status": set_status ? set_status : '', 
            "nm_usuario": nm_usuario ? nm_usuario : ''
        }
        return res.status(200).json({
            status: 'fail',
            message: 'Ocorrou algum erro na requisição!',
            dados: retorno
        })
    }
}

module.exports = {
    listarAtendimentos,
    mudarStatusAtendimento
}