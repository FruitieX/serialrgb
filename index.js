var express = require('express');
var _ = require('underscore');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var color = require('onecolor');
var curColor = color('hsl(0, 100%, 100%)');
var framerate = 60;

app.set('view engine', 'jade');

app.get('/', function(req, res) {
    res.render('index', {
        initColor: curColor.hex()
    });
});
app.use(express.static(__dirname + '/bower_components'));
http.listen(9191, function() {
    console.log('listening on 9191');
});

io.on('connection', function(socket) {
    socket.on('color', function(newColor) {
        curColor = color(newColor);
        if (!curColor) {
            curColor = color('hsl(0, 100%, 100%)');
        }
        updateColor();
    });
});

var serialPort = null;
var updateColor = _.throttle(function() {
    if (!serialPort) {
        console.error('not connected to serial port!');
        return;
    }

    var red = 255 * curColor.red();
    var green = 255 * curColor.green();
    var blue = 255 * curColor.blue();

    red = Math.max(0, Math.min(255, red));
    green = Math.max(0, Math.min(255, green));
    blue = Math.max(0, Math.min(255, blue));

    serialPort.write('R' + red + 'G' + green + 'B' + blue + '\n');
}, 1/framerate * 1000);

var SerialPort = require('serialport').SerialPort;

var openSerialPort = function(err) {
    if (serialPort) {
        serialPort.close(function() {
            serialPort = null;
            setTimeout(openSerialPort, 1000);
        });
    } else {
        serialPort = new SerialPort('/dev/ttyUSB0', {
            baudrate: 115200
        }, false);

        serialPort.on('error', function(err) {
            setTimeout(function() {
                console.log('serial port error: ' + err);
                console.log('retrying in 1000 ms...');
                openSerialPort();
            }, 1000);
        });
        serialPort.open(function(err) {
            if (err) {
                console.log('failed to open serial: ' + err);
                console.log('retrying in 1000 ms...');
                openSerialPort();
            } else {
                console.log('serial opened');
            }
        });
    }
};

openSerialPort();
