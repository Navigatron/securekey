'use strict';

// requires
const usb = require('usb');
const os = require('os');

// constants

const vendorID = 2765;
const productID = 9744;

// time in ms for libusb to wait for a response
const timeout = 2500;

const settings = require('./settings.js');

/*
Here's some interesting things:
set DvcType: 53 77 53 4B 5C 0B [11 bytes]
set DvcApp: 53 77 53 4B 5D 12 [18 bytes]
set DvcMsgVer: 53 77 53 4B 5E 03 [3 bytes]
set AppVer: 53 77 53 4B 5F 03 [3 bytes]
*/

// Global State

let reader;

// Utility functions

/*
name: crc
desc: Calculate the CRC of an array of bytes
in: Array of single-byte values
returns: single byte, to be used as crc
*/
const crc = d => d.reduce((a,i)=> a ^ i );

const arrayToAscii = a => a.reduce((a,i)=>a+=String.fromCharCode(i),'');

// get, make, open, close the reader

function openReader(){
	if(this.isOpen)return;
	const device = this._device;
	device.open();
	device.timeout = timeout;
	const interfaceZero = device.interface(0);
	if(os.platform()==='linux'){
		if(interfaceZero.isKernelDriverActive()){
			interfaceZero.detachKernelDriver();
		}
	}
	interfaceZero.claim();
	this.isOpen = true;
}

async function closeReader(){
	if(!this.isOpen)return;
	const device = this._device;
	return new Promise((resolve, reject)=>{
		device.interface(0).release(true, err => {
			if(err){
				reject(err);
			}
			device.close();
			this.isOpen=false;
			resolve();
		});
	});
}

const getReader = () => {
	if(reader === undefined){
		reader = _makeReader();
	}
	return reader;
};

const _makeReader = () => {
	const _device = usb.findByIds(vendorID, productID);
	if(_device === undefined){
		throw new Error('NO_READER_DETECTED');
	}
	return {
		_device,
		isOpen: false,
		open: openReader,
		close: closeReader,
		readSetting
	};
};

// Send data

/*
Send a frame to the device
@param {object} device - the open device to send to
@param {number[]} frame - buffer containing 8 bytes
*/
const _sendFrame = (device, frame) => {
	return new Promise((resolve, reject)=>{
		device.controlTransfer(
			0x21,
			0x09,
			0x0300,
			0x0000,
			frame,
			err=>{
				if(err){
					reject(err);
				}else{
					resolve();
				}
			}
		);
	});
};

/**
Break a packet into frames, send to the device.
@param device - the device to send to
@param {byte[]} packet - the packet to send
@returns Promise that resolves when packet has been sent
*/
const _sendPacket = async (device, packet) => {
	while(packet.length > 0){
		let frame = packet.splice(0,8);
		while(frame.length < 8){
			frame.push(0x00);
		}
		await _sendFrame(device, Buffer.from(frame));
	}
};

/**
Send a command to the device
@param device - The device to send to
@param {byte} command - read or write, 0x52 or 0x53
@param {byte} setting - the function ID to read/write
@param {byte[]} payload (optional) - value to write
@returns Promise that resolves when command has shipped.
*/
const _sendCommand = async (device, command, setting, payload) => {
	let packet = [0x02];
	packet.push(command);
	packet.push(setting);
	if(payload){
		packet.push(payload.length);
		packet.push(...payload);
	}
	packet.push(0x03);
	packet.push(crc(packet));
	return _sendPacket(device, packet);
};

// Read data

const _readFrame = device => {
	return new Promise((resolve, reject)=>{
		device.controlTransfer(
			0xa1,
			0x01,
			0x0300,
			0x0000,
			8,
			(err, data)=>{
				if(err){
					reject(err);
				}else{
					// if(data.length!==0)console.log('got frame: '+data.toString('hex'));
					resolve(data);
				}
			}
		);
	});
};

const _readPacket = async (device) => {
	let packet = [];
	let frame = [];
	// read empty frames until we get a response
	while(frame.length === 0){
		frame = await _readFrame(device);
	}
	// read full frames until we hit an empty one.
	while(frame.length !== 0){
		packet.push(...frame);
		frame = await _readFrame(device);
	}
	while(packet[packet.length-1] === 0){
		packet.pop();
	}
	// If returned only a single byte, done.
	if(packet.length === 1) return packet;
	// check the crc
	let myCRC = crc(packet.slice(1, packet.length-1));
	let sentCRC = packet[packet.length-1];
	if(myCRC !== sentCRC){
		// try again, with crc of 0x00
		packet.push(0x00);
		myCRC = crc(packet.slice(1, packet.length-1));
		sentCRC = packet[packet.length-1];
		if(myCRC !== sentCRC){
			// didn't fix it, crc is bad?
			throw new Error('this should be exceedingly rare');
		}// else we've fixed the problem.
	}
	return packet;
};

/*
ascii = raw converted to ascii
name = what raw actually means
for example, 49 = '1' in ascii, and means 'ENABLED' in the context of MSR_READING
response = {
	raw: 0x123456
	status: {
		raw: 0x06,
		name: 'ACK'
	},
	body: {
		raw: 'raw',
		parseType: 'string',
		ascii: 'string',
		segments: [
			{
				function: {
					id: 0x4E,
					name: 'SERIAL_NUMBER'
				},
				payload: {
					length: 15,
					raw: 0x1234,
					ascii: '1234'
				}
			}
		]
	},
	crc: {
		value: 0x1D
		isGood: true
	}
};
*/

const _readResponse = async (device, setting) => {
	// Packet
	let packet = await _readPacket(device);
	let response = {
		raw: packet
	};

	// Status
	response.status = {};
	response.status.raw = packet[0];
	if(response.status.raw===0x06){
		response.status.name = 'ACK';
	}else{
		response.status.name = 'NAK';
	}

	// Skip body if none
	if(packet.length===1) return response;

	// Body: raw, type
	response.body = {};
	response.body.raw = packet.slice(2, packet.length-2);
	// response.body.parseType = opcode.responseType;

	// Parse the body
	if(setting.id == settings.FIRMWARE_VERSION.id){
		response.body.ascii = arrayToAscii(response.body.raw);
	}else{
		response.body.segments = [];
		let buffer = response.body.raw;
		let pointer = 0;
		while(pointer < buffer.length){
			let ms = {}; // short for 'mySegment'
			ms.function = {};
			ms.function.id = buffer[pointer];
			ms.function.name = Object.keys(settings).find(settingName=>settings[settingName].id===ms.function.id);
			ms.payload = {};
			ms.payload.length = buffer[pointer+1];
			ms.payload.raw = buffer.slice(pointer+2, pointer+2+ms.payload.length);
			// unrecognized segment, leave raw
			if(ms.function.name === undefined){
				ms.function.name = 'UNKNOWN';
			}else if(
				settings[ms.function.name].options===undefined
			){
				ms.payload.ascii = arrayToAscii(ms.payload.raw);
			}else{
				// Search for the option value
				// This will need to change when we hit
				// bit-specific stuff
				let options = settings[ms.function.name].options
				let optionNames = Object.keys(options);
				ms.payload.name = optionNames.find(op=>
					options[op]===ms.payload.raw[0]
				);
			}
			response.body.segments.push(ms);
			pointer += 2+ms.payload.length;
		}
	}

	// CRC
	response.crc = {};
	response.crc.raw = packet[packet.length-1];
	response.crc.isGood = response.crc.raw === crc([0x02, ...response.body.raw, 0x03]);

	// done
	return response;
};

// Public functions to interact with the reader

async function readSetting(setting){
	if(!setting.readable){
		throw new Error('Cannot read that setting!');
	}
	const device = this._device;
	return _sendCommand(device, 0x52, setting.id).then(()=>{
		return _readResponse(device, setting)
	});
}

// Expose things to the outside world

module.exports = {
	getReader,
	settings
};
