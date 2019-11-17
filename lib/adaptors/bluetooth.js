"use strict";

var util = require("util"),
    EventEmitter = require("events").EventEmitter;


/**
 * An adaptor to communicate with a serial port
 *
 * @constructor
 * @param {String} conn the serialport string to connect to
 */
var Adaptor = module.exports = function Adaptor(conn) {
    this.conn = conn;
    this.serialport;
};

util.inherits(Adaptor, EventEmitter);

/**
 * Opens a connection to the serial port.
 * Triggers the provided callback when ready.
 *
 * @param {Function} callback (err)
 * @return {void}
 */
Adaptor.prototype.open = function open(callback) {
    var self = this,
        port = this.serialport = new (require('bluetooth-serial-port')).BluetoothSerialPort();

    function emit(name) {
        return self.emit.bind(self, name);
    }

    function connect(addr, retry=5) {
        port.findSerialPortChannel(addr, function (channel) {
            port.connect(addr, channel, function () {
                self.emit("open");
                port.on("error", emit("error"));
                port.on("closed", emit("close"));
                port.on("data", emit("data"));
                callback();
            }, function () {
                console.log('cannot connect');
            });
        }, function () {
            if (retry > 0){
                console.log('device not found');
                connect(addr, --retry);
            }
        });
    }
    connect(this.conn);
};

/**
 * Writes data to the serialport.
 * Triggers the provided callback when done.
 *
 * @param {Any} data info to be written to the serialport. turned into a buffer.
 * @param {Function} [callback] triggered when write is complete
 * @return {void}
 */
Adaptor.prototype.write = function write(data, callback=(() => {})) {
    this.serialport.write(new Buffer(data), callback);
};

/**
 * Adds a listener to the serialport's "data" event.
 * The provided callback will be triggered whenever the serialport reads data
 *
 * @param {Function} callback function to be invoked when data is read
 * @return {void}
 */
Adaptor.prototype.onRead = function onRead(callback=(() => {})) {
    this.on("data", callback);
};

/**
 * Disconnects from the serialport
 * The provided callback will be triggered after disconnecting
 *
 * @param {Function} callback function to be invoked when disconnected
 * @return {void}
 */
Adaptor.prototype.close = function close(callback= (() => {})) {
    this.serialport.close(callback);
};
