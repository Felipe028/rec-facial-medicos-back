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

router.post('/verificarVagasTurnoSetor', usuarioController.verificarVagasTurnoSetor);

router.post('/registrarPonto', authenticate, usuarioController.registrarPonto);
// >>>>>>>>>>>>>>>>>>>>>>>>>>Novas Rotas<<<<<<<<<<<<<<<<<<<<<<<<<



module.exports = router;
