'use-strict'

const Promise = require('bluebird');
const google = require('googleapis');
const OAuth2 = google.auth.OAuth2;

class Auth {

    constructor() {
        this.oauth2Client = new OAuth2(
            '***REMOVED***',
            '***REMOVED***',
            'http://localhost:9999'
        );
    }

    getToken(code) {
        var _this = this;

        return new Promise(function(resolve, reject){

            if (_this.oauth2Client.credentials.access_token) {
                resolve(_this.oauth2Client.credentials);   
            } else {
                _this.oauth2Client.getToken(code, function (err, tokens) {

                    if (err) {
                        return reject(err);
                    }
                    
                    // Now tokens contains an access_token and an optional refresh_token. Save them.
                    _this.oauth2Client.setCredentials(tokens);
                    
                    resolve(tokens);
                });
            }
        });
    }

    setCredentials(credentials) {
        this.oauth2Client.setCredentials(credentials);
    }

    refreshToken(refreshToken) {

    }
    

}

exports = module.exports = Auth;