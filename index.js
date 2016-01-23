var express = require('express');
var cors = require('cors');
var _ = require('underscore');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var color = require('onecolor');
var curColor = color('hsl(0, 100%, 50%)');
var framerate = 60;
var allFramerate = 20;

var mode = 'set';

var fadeTime = null;
var fadeStart = null;

var cycleAmount = 0.0001;

app.use(cors());

app.set('view engine', 'jade');

app.get('/', function(req, res) {
    res.render('index', {
        curColor: curColor.hex(),
        cycleAmount: cycleAmount
    });
});
app.post('/fadeout/:time', function(req, res) {
    console.log('starting fadeout');
    fadeTime = parseInt(req.params.time); // in ms
    fadeStart = Date.now();

    // turn back on after fade out + 10 sec
    // TODO: separate fade in function
    setTimeout(function() {
        console.log('resetting fade');
        fadeTime = null;
        fadeStart = null;
    }, fadeTime + 10000);

    res.json({message: 'ok'});
});
app.use(express.static(__dirname + '/bower_components'));
http.listen(9191, function() {
    console.log('listening on 9191');
});

var sendUpdate = function(socket) {
    socket.emit('update', {
        curColor: curColor.css(),
        cycleAmount: cycleAmount
    });
};

io.on('connection', function(socket) {
    sendUpdate(socket);
    socket.on('color', function(newColor) {
        cycleAmount = 0;
        curColor = color(newColor);
        sendUpdate(socket.broadcast);
    });
    socket.on('cycleAmount', function(newCycleAmount) {
        cycleAmount = Number(newCycleAmount);
        sendUpdate(socket.broadcast);
    });
});

var updateAll = _.throttle(function() {
    sendUpdate(io.sockets);
}, 1000 / allFramerate);

var updateColorInterval = null;
var startUpdateColor = function() {
    if (updateColorInterval) {
        clearInterval(updateColorInterval);
        updateColorInterval = null;
    }
    if (!serialPort) {
        console.error('not connected to serial port!');
        return;
    }

    updateColorInterval = setInterval(function() {
        curColor = curColor.hue(cycleAmount, true);

        var color = curColor;

        if (fadeTime && fadeStart) {
            var dt = Date.now() - fadeStart;
            var fade = dt / fadeTime;

            // bound to 0, 1
            fade = Math.min(1, Math.max(0, fade));

            // invert for a fadeout
            fade = 1 - fade;

            color = color.value(fade);
        }

        var red = 255 * color.red();
        var green = 255 * color.green();
        var blue = 255 * color.blue();

        red = Math.max(0, Math.min(255, red));
        green = Math.max(0, Math.min(255, green));
        blue = Math.max(0, Math.min(255, blue));

        updateAll();
        serialPort.write('R' + red + 'G' + green + 'B' + blue + '\n');
    }, 1/framerate * 1000);
};

var SerialPort = require('serialport').SerialPort;

var serialPort = null;
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
                startUpdateColor();
            }
        });
    }
};

openSerialPort();
