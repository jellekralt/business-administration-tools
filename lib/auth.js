'use-strict'

const Promise = require('bluebird');
const google = require('googleapis');
const OAuth2 = google.auth.OAuth2;

/**
 * Authentication Interface
 * 
 * @class Auth
 */
class Auth {

    /**
     * Creates an instance of Auth.
     * 
     * 
     * @memberOf Auth
     */
    constructor() {
        this.oauth2Client = new OAuth2(
            '***REMOVED***',
            '***REMOVED***',
            'http://localhost:9999'
        );
    }

    getAuthUrl() {
        return this.oauth2Client.generateAuthUrl({
            // 'online' (default) or 'offline' (gets refresh_token)
            access_type: 'offline',

            // If you only need one scope you can pass it as string
            scope: 'https://www.googleapis.com/auth/calendar'
        });
    }

    /**
     * Returns a token from a oauth code
     * 
     * @param {string} code - OAuth Code
     * @returns {Promise}
     * 
     * @memberOf Auth
     */
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

    /**
     * Sets credentials to the instance
     * 
     * @param {any} credentials
     * 
     * @memberOf Auth
     */
    setCredentials(credentials) {
        this.oauth2Client.setCredentials(credentials);
    }

    /**
     * Refreshes the token using a refresh token
     * 
     * @param {string} refreshToken
     * 
     * @memberOf Auth
     */
    refreshToken(refreshToken) {

    }
    

}

exports = module.exports = Auth;