const express = require('express');
const router = express.Router();

// const medicalController = require('./controller/medicalController');
// const zoomController = require('./controller/zoomController');
// const prontuarioController = require('./controller/prontuarioController');
// const telemedicinaController = require('./controller/telemedicinaController');
// const laudosController = require('./controller/laudoController');
// const prontoSocorroController = require('./controller/prontoSocorroController');

const usuarioController = require('./controller/usuarioController');
const setorController = require('./controller/setorController');
const turnoController = require('./controller/turnoController');
const escalaController = require('./controller/escalaController');

const { authenticate } = require('./middleware/authenticate')

router.post('/login', usuarioController.login);
router.post('/registrarPonto', authenticate, usuarioController.registrarPonto);
router.post('/setUsuario', usuarioController.setUsuario);
router.put('/updateUsuario/:id', usuarioController.updateUsuario);
router.get('/getUsuario', usuarioController.getUsuario);
router.delete('/deleteUsuario/:id', usuarioController.deleteUsuario);

router.post('/setSetor', setorController.setSetor);
router.put('/updateSetor/:id', setorController.updateSetor);
router.get('/getSetores', setorController.getSetores);
router.delete('/deleteSetor/:id', setorController.deleteSetor);

router.post('/setTurnos', turnoController.setTurnos);
router.put('/updateTurnos/:id', turnoController.updateTurnos);
router.get('/getTurnos', turnoController.getTurnos);
router.delete('/deleteTurno/:id', turnoController.deleteTurno);

router.post('/setEscalas', escalaController.setEscalas);
router.put('/updateEscalas/:id', escalaController.updateEscalas);
router.get('/getEscalas', escalaController.getEscalas);
router.delete('/deleteEscalas/:id', escalaController.deleteEscalas);

module.exports = router;
