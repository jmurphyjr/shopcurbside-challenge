#!/usr/bin/env python3
__author__ = 'Jack Murphy'
__version__ = '0.0.1'
__date__ = '2015-12-03 11:44:00'
__copyright__ = '2015'
__license__ = 'The MIT License (MIT)'
__contact__ = 'jmurphy.jr@gmail.com'

__doc__="""
Shop Curbside issued a challenge to find their secret. This is the __author__ submission.

@requires: U{Python<http://python.org/>} >= 3.0
"""
import http.client
import json
import collections

connection = http.client.HTTPConnection('challenge.shopcurbside.com')

class Secret:
    """
    Singleton Class to store the secret that ShopCurbside is revealing

    Ref: http://python-3-patterns-idioms-test.readthedocs.org/en/latest/Singleton.html
    """
    class __SingleSecret:
        def __init__(self):
            self.secret = ''

    instance = None

    def __init__(self):
        if not Secret.instance:
            Secret.instance = Secret.__SingleSecret()

    def __str__(self):
        return self.instance.secret

    def add_text(self, text):
        self.instance.secret += text

class Header:
    """
    Class to manage the header and session ID
    """
    def __init__(self):
        self.header = None
        self.set_header()

    def get_header(self):
        if self.header is None:
            self.set_header()

        return self.header

    def set_header(self):
        self.header = {'Session': self._get_session_id()}

    @staticmethod
    def _get_session_id():
        """Gets updated session ID.

            Note:
                Session IDs are valid for 10 requests

            Returns:
                (str) session_id
        """
        return make_request('/get-session')


def make_request(path):
    """
    Method to handle requests to URL

    Note:
        Function checks response for error and reissues request if necessary.
        Currently only session id expired error is handled.

    Args:
        path: The endpoint for this request

    Returns:
        str as JSON or TEXT dependent on 'Content-Type' specified in response Header
    """
    global header

    try:
        connection.request('GET', path, None, header.get_header())
    except NameError:
        connection.request('GET', path)

    response = connection.getresponse()

    decodedResponse = response.read().decode()

    if response.getheader('Content-Type') == 'application/json':
        decodedJSON = json.loads(decodedResponse)

        if 'error' in decodedJSON:
            # Response returned an error message. Assuming error
            # is expired session ID. Request must be resent
            # AFTER session ID is updated.
            header.set_header()
            decodedJSON = make_request(path)

        # Convert all keys to lower case
        response = dict((k.lower(), v) for k, v in decodedJSON.items())

    else:
        """Response is likely a Session ID"""
        response = decodedResponse

    return response


def process_response(input):

    secretText = Secret()
    values = []
    if isinstance(input['next'], str):
        values.append(input['next'])
    else:
        values.extend(input['next'])

    for value in values:

        thisURL = '/' + value

        thisJson = make_request(thisURL)

        if 'secret' in thisJson:
            secretText.add_text(thisJson['secret'])

        elif 'next' in thisJson:
            process_response(thisJson)

        else:
            print('Missed a message' + str(thisJson))

    return secretText

def main():
    shop_curbside_secret = process_response(make_request('/start'))

    # Reveal the ShopCurbside Secret!
    print (shop_curbside_secret)

if __name__ == '__main__':
    header = Header()
    print('Processing...')
    main()
