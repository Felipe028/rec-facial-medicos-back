const axios = require('axios')


class sendSMS{

    constructor(userename, password){
        this.userName = userename;
        this.userPass = password;
    }


    // Atencao. usuario e senha (userName e passUser) deve ser fonecido pela API de SMS.
    set userName(username){
        this._username = username;
    }

    get userName(){
        return this._username;
    }

    set userPass(senha){
        this._pass = senha;
    }

    get pass(){
        return this._pass
    }

    set urlAddress(url){
        this._urlAddress = url;
    }

    get urlAddress(){
        return this._urlAddress;
    }

    set status( status ){
        this._status = status
    }

    get status(){
        return this._status
    }

    set cause( cause ){
        this._cause = cause
    }

    get cause(){
        return this._cause
    }

    set id_SMS( id ){
        this._idSMS = id
    }

    get id_SMS(){
        return this._idSMS
    }

    getUserPassBase64(){
        
        let encrytUser = Buffer.from(this._username);
        let encrypPass = Buffer.from(this._pass);

        return encrytUser.toString('base64') + ':' + encrypPass.toString('base64');

    }

    invoque_method( celNumber, subjectMessage, bodyMessage ){
       
        let ret = { status: 'success', cause: 'SMS Add Queue', id: '15246864' }
        this.status = ret.status
        this.cause  = ret.cause
        this.id_SMS = ret.id
        console.log( ret )
        return ret


        
        let param = {
            'token': 'c37305c842eec18841003ddfd6129124',
            'acao':  'sendsms',
            'login': 'rfsouzza',
            'numero': celNumber,
            'campanha': subjectMessage,
            'msg':  bodyMessage
         }

        let b = axios.get('http://painel.kingsms.com.br/kingsms/api.php', { 'params': param })
	    .then(function(result){
		    console.log(result.data)
		    if (result){
                if ( result.status == 'success' ){ 
                    this.status = result.status
                    this.cause  = result.cause
                    this.id_SMS = result.id
                }
			    return true
		    }
	    	else
			    return
	    })
	    .catch(function(err){
		    //if ( err.response.data.error_code == 3)
            //    return
            console.log('Erro no axios', err)
	    })

    }

}

module.exports = sendSMS;

 