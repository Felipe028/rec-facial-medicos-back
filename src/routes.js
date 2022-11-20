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
router.post('/setUsuario', authenticate, usuarioController.setUsuario);
router.put('/updateUsuario/:id', authenticate, usuarioController.updateUsuario);
router.post('/getUsuario', authenticate, usuarioController.getUsuario);
router.get('/getUsuario', authenticate, usuarioController.getUsuarios);
router.delete('/deleteUsuario/:id', authenticate, usuarioController.deleteUsuario);

router.post('/setSetor', authenticate, setorController.setSetor);
router.put('/updateSetor/:id', authenticate, setorController.updateSetor);
router.post('/getSetor', setorController.getSetor);
router.get('/getSetores', setorController.getSetores);
router.delete('/deleteSetor/:id', authenticate, setorController.deleteSetor);

router.post('/setTurnos', authenticate, turnoController.setTurnos);
router.put('/updateTurnos/:id', authenticate, turnoController.updateTurnos);
router.post('/getTurno', turnoController.getTurno);
router.get('/getTurnos', turnoController.getTurnos);
router.delete('/deleteTurno/:id', authenticate, turnoController.deleteTurno);

router.post('/setEscalas', authenticate, escalaController.setEscalas);
router.put('/updateEscalas/:id', authenticate, escalaController.updateEscalas);
router.post('/getEscala', authenticate, escalaController.getEscala);
router.get('/getEscalas', authenticate, escalaController.getEscalas);
router.delete('/deleteEscalas/:id', authenticate, escalaController.deleteEscalas);

module.exports = router;
