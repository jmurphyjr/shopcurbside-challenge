/**
 * Created by jack on 12/3/15.
 */
(function() {
    var CURBSIDE_CHALLENGE_URL = 'http://challenge.shopcurbside.com';
    var lastTime;
    var timer = Date.now() + 20000;
    var pending = false;
    var lastResponse = '';

    var previousFailedRequest = document.getElementById('prev-failed-request');

    var secretElement = document.getElementById('curbside-secret');
    var button = document.getElementById('execute-next-step');
    var nextRequest = document.getElementById('next-request');
    var currentResponse = document.getElementById('current-response');
    var currentError = document.getElementById('current-error');
    var currentSessionId = document.getElementById('current-session-id');

    var sessionId = null;

    var nextUrl = ['start'];
    var curbsideSecret = '';

    var Curbside = function() {
        this.messages = [];
    };

    Curbside.prototype.addMessage = function(data) {
        this.message = {
            id: data.id,
            depth: data.depth
        };

        if (data.hasOwnProperty('next')) {
            this.message.next = data.next;
        }

        if (data.hasOwnProperty('secret')) {
            this.message.secret = data.secret;
        }

        if (data.hasOwnProperty('message')) {
            this.message.message = data.message;
        }
    };

    function get() {
        var path = nextUrl.shift();

        console.log('get path is: ' + path);

        return new Promise(function(success, failure) {
            var request = new XMLHttpRequest();
            if (path === undefined) {
                failure('no more entries');
            }
            request.open('GET', CURBSIDE_CHALLENGE_URL + '/' + path);
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

    function failedJsonError(data) {
        if (data['error']) {
            currentError.innerText = data['error'];
            console.log(data);

            if (data.error === '"Session" header is missing. "/get-session" to get a session id.') {
                // previousFailedRequest.innerHTML = nextRequest.innerHTML;
                // nextRequest.innerHTML = 'get-session';
                // nextRequest.innerHTML = data.responseURL;
                // nextUrl.unshift('get-session');
                throw { name: 'MissingSessionId' };
            }
            else if (data.error === 'Invalid session id, a token is valid for 10 requests.') {
                // previousFailedRequest.innerHTML = nextRequest.innerHTML;
                // nextRequest.innerHTML = 'get-session';
                // nextRequest.innerHTML = data.responseURL;
                // nextUrl.unshift('get-session');
                throw { name: 'MissingSessionId' };
            }
        }
    }

    function failedResponse (data) {
        var respData;
        currentError.innerText = error.statusText;

        if (data.status === 404) {
            try {
                respData = JSON.parse(data.response);
                failedJsonError(respData);
            }
            catch (e) {
                if (e instanceof SyntaxError) {
                    // JSON Parse throws Syntax error when input is not JSON
                    console.log('failedResponse catch statement');
                }
                else if (e.name === 'MissingSessionId') {
                    console.log(data.responseURL);
                    var urlParse = document.createElement('a');
                    urlParse.href = data.responseURL;
                    console.log(urlParse);
                    nextUrl.unshift(urlParse.pathname);
                    nextUrl.unshift('get-session');
                    console.log(nextUrl);
                }
            }

            // Change way failures are handled. Figure out the failure,
            // then move on straight from here.
            // if ( )
        }
        return respData;
    }

    function propertyNames(inJson) {
        var newObj = {};
        Object.keys(inJson).forEach(function(key) {
            newObj[key.toLowerCase()] = inJson[key];
        });

        return newObj;
    }

    function processData(data) {
        // Force all keys to lower case;
        var json = propertyNames(JSON.parse(data.response));
        console.log(json);

        if (json.next) {
            if (json.next instanceof Array) {
                console.log('next is an array');
                Array.prototype.unshift.apply(nextUrl, json.next);
                console.log(nextUrl);
            }
            else {
                nextUrl.unshift(json.next);
            }
        }

        if (json.secret) {
            curbsideSecret += json.secret;
        }
    }

    function successResponse(data) {
        console.log(data);
        if (data.responseURL.indexOf('get-session') >= 0) {
            sessionId = data.response;
            currentSessionId.innerHTML = data.response;
            nextRequest.innerHTML = previousFailedRequest.innerHTML;
            previousFailedRequest.innerHTML = 'None';
        }
        else {
            processData(data);
            // nextRequest.innerHTML = nextUrl.shift();
        }

        currentError.innerHTML = '';
    }

    button.addEventListener('click', main);

    function main() {
        secretElement.innerHTML = curbsideSecret;
        if (!pending) {
            if (nextUrl.length === 0) {
                pending = false;
            }
            else {
                pending = true;
                (function () {
                    get().then(function (data) {
                        successResponse(data);

                        pending = false;
                        return true;
                    }, function (error) {
                        failedResponse(error);
                        pending = false;
                        return false;
                    });


                })();
            }
        }
        else {
            console.log(lastResponse);
        }
        var now = Date.now();

        if (now > timer) {
            console.log('We are iterating');
            return;
        }
        lastTime = now;
        window.requestAnimationFrame(main);
    }

    main();
})();
