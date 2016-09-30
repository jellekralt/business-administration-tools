var request = require('request');
var cheerio = require('cheerio');

var j = request.jar();
var request = request.defaults({ jar : j });

var LOGINURL = 'https://www.t-mobile.nl/login';

request(LOGINURL, function(err, resp, body) {
    if (err)
        throw err;
    $ = cheerio.load(body);

    var fieldUsername = $('[name=\'Row1.Column1.Cell2.Login.Username\']');
    var fieldPassword = $('[name=\'Row1.Column1.Cell2.Login.Password\']');
    var buttonSubmit = $('[name=\'Row1.Column1.Cell2.Login.Login\']');


    fieldUsername.val('***REMOVED***');
    fieldPassword.val('***REMOVED***');

    buttonSubmit.click();

    // TODO: scraping goes here!

});

// request.post(LOGINURL, {
//     form: {
//         'Row1.Column1.Cell2.Login.Username': '***REMOVED***',
//         'Row1.Column1.Cell2.Login.Password': '***REMOVED***',
//         'Row1.Column1.Cell2.Login.Login': 'Inloggen'
//     }
// }, function(err, resp, body) {
//     if (err)
//         throw err;
//     // $ = cheerio.load(body);
//     // console.log(pool);
//     // TODO: scraping goes here!

//     console.log(body);
// });