var express = require('express'),
    path = require('path'),
    app = express(),
    port = 5001;

app.get('/', function(req, res) {
    res.sendFile(path.join(__dirname, 'public/index.html'));
});

app.get(/(.*)/, function(req, res) {
    res.sendFile(path.join(__dirname, 'public/' + req._parsedUrl.pathname));
});

app.listen(port);

console.log('Starting server at port ' + port);
