var express = require('express');
var Http = require('http');
var Https = require('https');

var app = express();

var server = Http.createServer(app);

app.set('views', __dirname + '/views');
var jade = require('jade');
app.engine('jade', jade.__express);
app.set('view engine', 'jade');
// app.register('.html', require('jade'));
app.set('reload views', 1000);

app.put('*', express.bodyParser());
app.post('*', express.bodyParser());
app.use(express.query());
app.use(express.cookieParser());
app.use(express.static(__dirname + '/static'));

app.get('/player', function(req, res) {
	res.render('player', {
	/* data to view goes here */
	});
});

server.listen(5001);