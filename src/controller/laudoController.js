const getLaudos = require('../../buscarLaudos.json');
const getLaudosPendentes = require('../../buscarLaudosPendentes.json');

const buscarLaudosMedicos = async (req, res) => {
    return res.status(200).json({
        status: 'success',
        dados: getLaudos
    })
};

const buscarLaudosPendentes = async (req, res) => {
    return res.status(200).json({
        status: 'success',
        dados: getLaudosPendentes
    })
};

module.exports = {
    buscarLaudosMedicos,
    buscarLaudosPendentes,
}