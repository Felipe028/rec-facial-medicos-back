const env = process.env.NODE_ENV || 'production'

//insert your API Key & Secret for each environment, keep this file local and never push it to a public repo for security purposes.
const config = {
	development :{
		APIKey : 'rZujYURJTV6wOAXW7qM3vg',
		APISecret : 'lQAjoxT1yFAjrbgBAPXe42yzbqZByMjAG6Ms'
	},
	production:{	
		APIKey : 'rZujYURJTV6wOAXW7qM3vg',
		APISecret : 'lQAjoxT1yFAjrbgBAPXe42yzbqZByMjAG6Ms'
	}
};

module.exports = config[env]
