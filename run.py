from flask import Flask
from flask_jsonrpc import JSONRPC
from opentok_server.ot_server import *
app = Flask(__name__)
jsonrpc = JSONRPC(app, '/api', enable_web_browsable_api=True)

@jsonrpc.method('welcome')
def index():
	return 'welcome'

@jsonrpc.method('getSessionToken() -> list')
def getSessionToken():
	print "getSessionToken"
	ret = OpenTokServer.generate_token()
	return [ret[0], ret[1], ret[2], ret[3]]

@app.route('/')
def hello_world():
	return 'Hello World!'
if __name__ == '__main__':
	app.run()

