const axios     = require("axios")
const FormData  = require("form-data")


const getRecFacial = async ( nrCpf ) => {
    if (!nrCpf)
        return
        
    const bodyFormData =  new FormData()
    bodyFormData.append('nrCpf', nrCpf)
    return await  axios.post('http://192.168.2.57:5003/getUser', bodyFormData, { headers: bodyFormData.getHeaders() } )
        .then((result) => {
            
            if (result.data.message == 'User found') {
                return true
            }
            else
                return false
        })
        .catch((err) => {
            console.log('Erro ao obter se paciente tem recFacial', err)
            return
        })
    
}

const getImg = async ( nrCpf ) => {
    if (!nrCpf)
        return
    
    const bodyFormData = new FormData
    bodyFormData.append('nrCpf', nrCpf)
    

    return axios.post('http://192.168.2.57:5003/getFoto', bodyFormData, { headers: bodyFormData.getHeaders() })
        .then((result) => {
            return result.data.Imagens[0]
        })
        .catch((err) => {
            console.log("Erro ao obter imagem", err)
        })
}

module.exports = {
    getRecFacial,
    getImg
}
