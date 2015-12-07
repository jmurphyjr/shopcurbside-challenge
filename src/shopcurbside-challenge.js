(function() {
    var CURBSIDE_CHALLENGE_URL = 'http://challenge.shopcurbside.com';
    var pending = false;

    var sessionId = null;

    var nextUrl = ['start'];

    var secret;


    var Secret = function() {
        this.secretElement = document.getElementById('curbside-secret');
        this.secretElement.innerHTML = 'Processing...';
        this.secret = '';
    };

    Secret.prototype.addSecret = function(bit) {
        // Do not append empty strings
        if (bit !== '') {
            this.secret += bit;
        }
    };

    Secret.prototype.displaySecret = function() {
        this.secretElement.innerHTML = this.secret;
    };

    /**
     * @description Function to asynchronously request data from server.
     * @returns {Promise}
     */
    function get() {
        var path = nextUrl.shift();

        return new Promise(function(success, failure) {
            var request = new XMLHttpRequest();
            if (path === undefined) {
                failure('no more entries');
            }
            request.open('GET', CURBSIDE_CHALLENGE_URL + '/' + path, true);
            if (sessionId) {
                request.setRequestHeader('Session', sessionId);
            }
            request.addEventListener('load', function() {
                if (request.status === 200) {
                    success(request);
                }
                else {
                    failure(request);
                }
            });
            request.addEventListener('error', function() {
                failure(new Error('Network error'));
            });
            request.send();
        });
    }

    /**
     * Determine type of error returned. Currently, only handles.
     *   1. Session missing from request header.
     *   2. Invalid Session key.
     *
     * @param errorMsg Error message returned from api.
     */
    function failedJsonError(errorMsg) {
        if (errorMsg['error']) {
            if (errorMsg.error === '"Session" header is missing. "/get-session" to get a session id.') {
                throw { name: 'MissingSessionId' };
            }
            else if (errorMsg.error === 'Invalid session id, a token is valid for 10 requests.') {
                throw { name: 'MissingSessionId' };
            }
        }
    }

    /**
     * @description Function called by main in response to a failed get request.
     *
     * @param data XMLHttpRequest Object
     */
    function failedResponse (data) {

        var respData;

        if (data.status === 404) {
            try {
                respData = JSON.parse(data.response);
                failedJsonError(respData);
            }
            catch (e) {
                if (e.name === 'MissingSessionId') {
                    // Session ID is missing or invalid. Restore the current
                    // responseURL to nextUrl, then prepend 'get-session'
                    // to update the session ID.
                    var urlParse = document.createElement('a');
                    urlParse.href = data.responseURL;
                    nextUrl.unshift(urlParse.pathname);
                    nextUrl.unshift('get-session');
                }
                else {
                    // TODO: Identify and handle additional errors.
                    console.log('Unhandled error');
                    console.log(e);
                }
            }

        }
    }

    /**
     * @description Convert all property names of JSON document to lowercase.
     * @param inJson JSON like object
     * @returns {{}} A new object with all property names converted to lowercase.
     */
    function propertyNamesToLowercase(inJson) {
        var newObj = {};
        Object.keys(inJson).forEach(function(key) {
            newObj[key.toLowerCase()] = inJson[key];
        });

        return newObj;
    }

    /**
     * Process return data.
     * @param data
     */
    function processData(data) {
        // Force all keys to lower case;
        var json = propertyNamesToLowercase(JSON.parse(data.response));

        if (json.next) {
            if (json.next instanceof Array) {
                Array.prototype.unshift.apply(nextUrl, json.next);
            }
            else {
                nextUrl.unshift(json.next);
            }
        }

        /**
         * Add div with secret class to secretElement
         */
        if (json.secret) {
            secret.addSecret(json.secret);
        }
    }

    /**
     * @description Function called by main in response to a successful get request
     *
     * @param data XMLHttpRequest Object
     */
    function successResponse(data) {

        // If we sent a 'get-session' path, then update the sessionId
        if (data.responseURL.indexOf('get-session') >= 0) {
            sessionId = data.response;
        }
        // Otherwise, process data accordingly.
        else {
            processData(data);
        }

    }

    /**
     * The main function. Will continue as long as nextUrl length is greater than 0 (zero)
     */
    function main() {
        if (!pending) {
            if (nextUrl.length === 0) {
                secret.displaySecret();
                pending = false;
                return;
            }
            else {
                pending = true;
                get().then(function (data) {
                    successResponse(data);
                    pending = false;
                }, function (error) {
                    failedResponse(error);
                    pending = false;
                });
            }
        }
        window.requestAnimationFrame(main);
    }

    secret = new Secret();
    main();
})();
