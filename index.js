var express = require('express');
var _ = require('underscore');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var color = {
    red: 255,
    green: 255,
    blue: 255
};
var framerate = 60;

app.set('view engine', 'jade');

app.get('/', function(req, res) {
    res.render('index', {
        initColor: 'rgb ' + color.red + ' ' + color.green + ' ' + color.blue
    });
});
app.use(express.static(__dirname + '/bower_components'));
http.listen(9191, function() {
    console.log('listening on 9191');
});

io.on('connection', function(socket) {
    socket.on('color', _.throttle(function(newColor) {
        color = newColor;
        console.log(color);
        updateColor();
    }, 1/framerate * 1000));
});

var updateColor = function() {
    serialPort.write('RGB\n');
    serialPort.write(color.red + '\n');
    serialPort.write(color.green + '\n');
    serialPort.write(color.blue + '\n');
};

var SerialPort = require('serialport').SerialPort;
var serialPort = new SerialPort('/dev/ttyUSB1', {
    baudrate: 115200
}, false);

serialPort.open(function(err) {
    if (err) {
        console.log('failed to open serial: ' + err);
    } else {
        console.log('serial opened');
        updateColor();
    }
});
