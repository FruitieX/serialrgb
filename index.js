var express = require('express');
var _ = require('underscore');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var onecolor = require('onecolor');

if (process.argv.length !== 3) {
    console.log('Usage: ./index.js <tty-device>');
    process.exit(0);
}

var fadeSpeed = 0.01;

var ledFramerate = 60;
var clientFramerate = 20;

var presets = {
    default: {
        color: onecolor('hsl(0, 100%, 100%)'),
        cycleSpeed: 0,
        alpha: 1,
        deleted: false
    }
};
var selectedPreset = 'default';

var updatePresets = function() {
    _.each(presets, function(preset, name) {
        preset.color = preset.color.hue(preset.cycleSpeed, true);

        if (selectedPreset === name) {
            // fade in active preset
            preset.alpha = Math.min(1, preset.alpha + fadeSpeed);
            preset.color = preset.color.value(preset.alpha);
        } else {
            // fade out inactive preset
            preset.alpha = Math.max(0, preset.alpha - fadeSpeed);
            preset.color = preset.color.value(preset.alpha);
        }

        // remove a deleted preset once it's faded out
        if (preset.deleted && !preset.alpha) {
            delete presets[name];
        }
    });
};

app.set('view engine', 'jade');

app.get('/', function(req, res) {
    res.render('index', {
        presets: presets,
        selectedPreset: selectedPreset
    });
});
app.use(express.static(__dirname + '/bower_components'));
http.listen(9191, function() {
    console.log('listening on 9191');
});

var sendUpdate = function(socket) {
    socket.emit('update', {
        presets: presets,
        selectedPreset: selectedPreset
    });
};

io.on('connection', function(socket) {
    sendUpdate(socket);

    socket.on('color', function(data) {
        // initialize preset if it doesn't exist
        if (!presets[data.preset]) {
            presets[data.preset] = {
                cycleSpeed: 0,
                alpha: 0,
                deleted: false
            };
        }

        // stop cycling this preset's color
        presets[data.preset].cycleSpeed = 0;
        presets[data.preset].color = onecolor(data.color);

        sendUpdate(socket.broadcast);
    });
    socket.on('cycleSpeed', function(data) {
        if (presets[data.preset]) {
            initPreset(data.preset);

            presets[data.preset].cycleSpeed = Number(data.cycleAmount);

            sendUpdate(socket.broadcast);
        } else {
            console.log('preset ' + data.preset + ' not found!');
        }
    });
    socket.on('deletePreset', function(data) {
        if (presets[data.preset]) {
            presets[data.preset].deleted = true;
            sendUpdate(socket);
        } else {
            console.log('preset ' + data.preset + ' not found!');
        }
    });
    socket.on('selectPreset', function(data) {
        if (presets[data.preset] && !presets[data.preset].deleted) {
            selectedPreset = data.preset;
            sendUpdate(socket);
        } else {
            console.log('preset ' + data.preset + ' not found!');
        }
    });
});

setInterval(function() {
    sendUpdate(io.sockets);
}, 1000 / clientFramerate);

setInterval(function() {
    if (!serialPort) {
        //console.error('not connected to serial port!');
        return;
    }

    updatePresets();

    var preset = presets[selectedPreset];

    var red = 255 * preset.color.red();
    var green = 255 * preset.color.green();
    var blue = 255 * preset.color.blue();

    red = Math.max(0, Math.min(255, red));
    green = Math.max(0, Math.min(255, green));
    blue = Math.max(0, Math.min(255, blue));

    console.log('R' + red + 'G' + green + 'B' + blue + '\n');
    //serialPort.write('R' + red + 'G' + green + 'B' + blue + '\n');
}, 1000 / ledFramerate);

var serialPort = true;
/*
var SerialPort = require('serialport').SerialPort;

var serialPort = null;
var openSerialPort = function(err) {
    if (serialPort) {
        serialPort.close(function() {
            serialPort = null;
            setTimeout(openSerialPort, 1000);
        });
    } else {
        serialPort = new SerialPort(process.argv[2], {
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
*/
