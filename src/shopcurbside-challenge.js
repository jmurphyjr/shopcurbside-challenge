/**
 * Created by jack on 12/3/15.
 */
(function() {
    var CURBSIDE_CHALLENGE_URL = 'http://challenge.shopcurbside.com';

    var Header = function() {
        this.sessionID = null;
        this.header = null;

    };

    Header.prototype._updateSessionId = function() {
        this.sessionID = makeRequest('get-session');
    };

    Header.prototype.updateHeader = function() {
        this._updateSessionId();
        this.header = { 'Session': this.sessionID };
    };

    Header.prototype.getHeader = function() {
        return self.header;
    };


    var processResponse = function(data) {
        console.log(data.responseType);
        if (data.responseType === 'application/json') {
            console.log('Json data received');
            console.log(data);
        }
        else {
            console.log('not json data');
            console.log(data);
        }
    };

    /**
     * Error callback for makeRequest.
     * @param error
     */
    var processError = function(error) {
        var response = JSON.parse(error.responseText);
        console.log(response.error);
        if (response.error.indexOf('header is missing') >= 0) {
            // Need to issue 'get-session'
            console.log('going to make request');
            makeRequest('get-session').then(processResponse, processError);
        }
        console.log(JSON.parse(error.responseText));
    };

    var makeRequest = function(path) {

        return new Promise(function(resolve, reject) {
        var request = new XMLHttpRequest();

        request.open('GET', CURBSIDE_CHALLENGE_URL + '/' + path, true);
            request.setRequestHeader()
        request.onload = function() {
            var status = request.status;
            var responseContentType = request.getResponseHeader('Content-Type');
            console.log(status);
            console.log(responseContentType);

            if (responseContentType === 'application/json' && status === 200) {
                request.responseType = 'application/json';
                resolve(request);
            }
            else if (responseContentType === 'application/json' && status === 404) {
                console.log('received error message ' + responseContentType);
                request.responseType = 'application/json';
                resolve(request);
            }
            else {
                reject(request);
            }
        };
            request.send();
        });
    };

    // Starts with start, which we know will throw an error since session is not available


    makeRequest('start').then(processResponse, processError);
})();
