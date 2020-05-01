"use strict";

var util = require("util"),
    EventEmitter = require("events").EventEmitter;
const {createBluetooth} = require('node-ble');

const {bluetooth, destroy} = createBluetooth();

function getAntiDosbytes(){
    var str = "011i3";
    var bytes = [];

    for (var i = 0; i < str.length; ++i) {
        bytes.push(str.charCodeAt(i));
    }

    return bytes

}


const BLEService =             "22bb746f-2bb0-7554-2d6f-726568705327";
const WakeCharacteristic =     "22bb746f-2bbf-7554-2d6f-726568705327";
const TXPowerCharacteristic =  "22bb746f-2bb2-7554-2d6f-726568705327";
const AntiDosCharacteristic =  "22bb746f-2bbd-7554-2d6f-726568705327";
const RobotControlService =    "22bb746f-2ba0-7554-2d6f-726568705327";
const CommandsCharacteristic = "22bb746f-2ba1-7554-2d6f-726568705327";
const ResponseCharacteristic = "22bb746f-2ba6-7554-2d6f-726568705327";

/**
 * An adaptor to communicate with a Bluetooth LE (aka 4.x) Interface
 *
 * @constructor
 * @param {String} peripheralId the BLE address to connect to
 * @param {Object} options optional parameters
 */
var Adaptor = module.exports = function Adaptor(peripheralId, options) {
    //var uuid = peripheralId.split(":").join("").toLowerCase();
    this.uuid = peripheralId;
    this.device = null;
    this.server = null;
    var opts = options || {};
    this.readHandler = function () {
        return;
    };

};

util.inherits(Adaptor, EventEmitter);

Adaptor.prototype.open = function open(callback) {
     const self = this;
     async function _open() {
         const adapter = await bluetooth.defaultAdapter();
         //if (! await adapter.isDiscovering())
         //    await adapter.startDiscovery();
         self.device = await adapter.waitDevice(self.uuid);
         await self.device.connect();
         self.server = await self.device.gatt();
         await self.writeServiceCharacteristic(BLEService, AntiDosCharacteristic, getAntiDosbytes());
         await self.writeServiceCharacteristic(BLEService, TXPowerCharacteristic, 7);
         await self.writeServiceCharacteristic(BLEService, WakeCharacteristic, 1);
         const response_char = await self.getServiceCharacteristic(RobotControlService, ResponseCharacteristic);
         await response_char.startNotifications();
         response_char.on("valuechanged", function (data) {
             if (data && data.length > 5) {
                 self.readHandler(data);
             }
         })
     }
     _open().then(callback)

};


Adaptor.prototype.getServiceCharacteristic = async function (serviceId, characteristicID){
    const service = await this.server.getPrimaryService(serviceId);
    return await service.getCharacteristic(characteristicID);
};

Adaptor.prototype.writeServiceCharacteristic = async function (serviceId, characteristicID, value){
    const char = await this.getServiceCharacteristic(serviceId, characteristicID, value);
    await char.writeValue(new Buffer(value));
};



/**
 * Writes data to the BLE device on the
 * RobotControlService/CommandsCharacteristic.
 * Triggers the provided callback when done.
 *
 * @param {Any} data info to be written to the device. turned into a buffer.
 * @param {Function} [callback] triggered when write is complete
 * @return {void}
 */
Adaptor.prototype.write = function write(data, callback) {
    this.writeServiceCharacteristic(RobotControlService, CommandsCharacteristic, data).then(callback);
};

/**
 * The provided callback will be triggered whenever the BLE device receives data
 * from the RobotControlService/ResponseCharacteristic "notify" event
 *
 * @param {Function} callback function to be invoked when data is read
 * @return {void}
 */
Adaptor.prototype.onRead = function onRead(callback) {
    this.readHandler = callback;
};

/**
 * Disconnects from the BLE device
 * The provided callback will be triggered after disconnecting
 *
 * @param {Function} callback function to be invoked when disconnected
 * @return {void}
 */
Adaptor.prototype.close = function close(callback = (() => {
})) {
    this.device.disconnect().then(callback);
};


/**
 * Reads a service characteristic from the BLE peripheral.
 *
 * Triggers the provided callback when data is retrieved.
 *
 * @param {Number} serviceId ID of service to get details for
 * @param {Number} characteristicId ID of characteristic to get details for
 * @param {Function} callback function to be invoked with value
 * @return {void}
 * @publish
 */
Adaptor.prototype.readServiceCharacteristic = function (serviceId,
                                                        characteristicId,
                                                        callback) {
    this.getCharacteristic(serviceId, characteristicId, function (error, c) {
        if (error) {
            return callback(error);
        }

        c.read(callback);
    });
};

