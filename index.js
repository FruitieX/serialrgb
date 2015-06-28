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
    socket.on('color', _.throttle(function(newColor) {
        console.log('received ' + JSON.stringify(newColor));
        curColor = color(newColor);
        if (!curColor) {
            curColor = color('hsl(0, 100%, 100%)');
        }
        //updateColor();
    }, 1/framerate * 1000));
});

var serialPort = null;
var updateColor = function() {
    if (!serialPort) {
        console.error('not connected to serial port!');
        return;
    }

    var red = 255 * curColor.red();
    var green = 255 * curColor.green();
    var blue = 255 * curColor.blue();

    red = Math.floor(Math.max(0, Math.min(255, red)));
    green = Math.floor(Math.max(0, Math.min(255, green)));
    blue = Math.floor(Math.max(0, Math.min(255, blue)));

    var s = 'RGB\n' + red + '\n' + green + '\n' + blue + '\n';
    console.log('sending ' + s);
    serialPort.write(s);
    serialPort.drain(updateColor);
};

var SerialPort = require('serialport').SerialPort;

var openSerialPort = function(err) {
    console.log('opening serial port' + (err ? (' after error: ' + err) : ''));
    if (serialPort) {
        serialPort.close(function() {
            serialPort = null;
            openSerialPort();
        });
    } else {
        serialPort = new SerialPort('/dev/ttyUSB1', {
            baudrate: 115200
        }, false);

        serialPort.on('error', openSerialPort);
        serialPort.open(function(err) {
            updateColor();
            if (err) {
                console.log('failed to open serial: ' + err);
            } else {
                console.log('serial opened');
            }
        });
    }
};

openSerialPort();
