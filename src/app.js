const express = require('express')
const cookieParser = require('cookie-parser')
const logger = require('morgan')
const dotenv = require('dotenv')
const cors = require('cors');
const { authenticate } = require('./middleware/authenticate')
const routes = require('./routes')
const bodyParser = require('body-parser')

const medicalController = require('./controller/medicalController')
const unidadeController = require('./controller/unidadeController')
const zoomController = require('./controller/zoomController')


require("log-node")();

dotenv.config()

const daoUtils = require('./DAO/DAOUtils')

var app = express();




app.use(logger('dev'));
app.use(cors());
app.use(express.json({limit: '50mb'}));
app.use('/uploads', express.static('uploads'))
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

//rota para pegar as agendas de consulta e exames
app.use('/medical/agenda/pendente/:crm/:cdConselho/:tipo',  medicalController.getAgendaPendente);

app.use('/medical/agenda/acount/:crm/:cdConselho/:tipo', medicalController.getCount);
app.use('/medical/agenda/total/:crm/:cdConselho',  medicalController.getAgenda);
app.use('/medical/agenda/regAlertCpf/:nrAtendimento/:obs', medicalController.regAlertCpf)

app.use('/medical/getConselho/', medicalController.getConselho)
app.use(
    '/medical/callPatient/:nr_seq_senha_p/:nm_maquina_atual_p/:nr_seq_fila_p/:cd_senha_p/:nm_usuario_p/:cd_agenda_p/:nr_atendimento_p',
    medicalController.callPatient
);
app.use(
    '/medical/getMachines',
    medicalController.getMachines
);

//buscar unidade
app.use(
    '/unidade/getUnidades',
    unidadeController.getUnidade
 );

//adicionando a busca pelo setor
app.use(
    '/setor/getSetores/:sigla_unidade',
    unidadeController.getSetores
 );

app.use(
    '/medical/getSalas/:cd_setor',
    medicalController.getSalas
)

app.use(
    '/medical/getSalasPs/:cd_setor',
    medicalController.getSalasPs
)

app.use(
    '/medical/getMachinesSingleUnit/:siglaUnidade', 
    medicalController.getMachinesSingleUnit
);

app.use(
    '/medical/getMachine/:nmMachine',
    medicalController.getMachine
)
app.use(
        '/medical/action/create/', 
        medicalController.createAuthRecFace
);
app.use(
    '/medical/getDoctor/:crm/:cdConselho/:tipoAgenda/:password',
    medicalController.getDoctor
);

app.use(
    '/zoom/clear/:dsEmailZoom',
    zoomController.clearZoom
);


app.use(
    '/buscaAtendimento/:nrAtendimento',
    medicalController.buscaAtendimeto
);

app.use(
    '/log/logPrescricao/:idPrescricao/:nrAtendimento/:tokenMed/:cdPessoaFisica',
    medicalController.logPrescricao
);

app.use(
    '/recuperaReceita/memed',
    medicalController.recuperaReceita
);

app.use(
    '/log/salvaPrescricao/:nrAtendimento/:cdPessoaFisica/:htmlPrescricao/:cdMedico',
    medicalController.salvaPrescricao
);

//////////////
/* app.use(
    '/zoom/getZoom/:email',
    zoomController.postZoom
); */
//////////

app.use(
    '/medical/getConsultorio/:cdAgenda/:diaSemana/:tipo',
    medicalController.getClinic
 );

 app.use(bodyParser.urlencoded({ extended: true })) 

 //app.use(bodyParser.json());
 
//pp.use('/*', authenticate)
app.use(routes) 

module.exports = app;