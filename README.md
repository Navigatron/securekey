# Securekey

Interact with IDTech Securekey m100 and m130 devices

## Installation

```
npm install --save Navigatron/securekey#master
```

## Example

```javascript
'use strict';

const sk = require('./index.js');

const main = async ()=>{
	let reader;
	console.log('Attempting to open reader...');
	try {
		reader = sk.getReader();
		reader.open();
	} catch (e) {
		if(e.message==='LIBUSB_ERROR_ACCESS'){
			console.log('Could not open reader - insufficient permissions');
		}else if(e.message==='NO_READER_DETECTED'){
			console.log('Could not get reader - not detected.');
		}else{
			console.log('UNKNOWN ERROR');
			throw e;
		}
		return;
	}

	console.log('Reading firmware version...');
	await reader.readSetting(sk.settings.FIRMWARE_VERSION).then(response=>{
		console.log('firmware version is: '+response.body.ascii);
	}).catch(err=>{
		console.log('got error');
		console.log(err);
	});
};

main();

```

## API

### `getReader`

Attempts to get a reference to the reader, using npm's `usb` package.

Throws `NO_READER_DETECTED` if a reader cannot be found.

### `reader.open`

Must be called before sending commands to the reader.

throws `LIBUSB_ERROR_ACCESS` if you have insufficient perms to claim the interfaces. (use sudo!)

### `reader.readSetting`

Read the value of a setting. Takes a `setting` object.

Returns a promise that resolves to a `response`. See response format below.

## Available Settings

```javascript
const sk = require('securekey');
console.log(sk.settings.FIRMWARE_VERSION);
```

- FIRMWARE_VERSION
	- read-only
	- returns a string in `response.body.ascii`
- SERIAL_NUMBER
	- read-only
	- response in `response.body.segments[0].payload.ascii`
- ALL_SETTINGS
	- read-only
	- `response.body.segments` is an array of all returned segments.
		- Each segment contains a function object and payload object
- RESET_TO_DEFAULT
	- write-only
	- resets most settings to their default values
- MSR_READING
	- read/write
	- Turns the magnetic stripe reader on/off
	- (only reading has been implemented as of now)
- DECODING_METHOD
	- read/write
	- How does the MSR decode swipes?

## Response Format

```javascript
response = {
	raw: ,// Array of single byte values, entire packet
	status: {
		raw: ,// Single byte status value
		name: // 'ACK' or 'NAK'
	},
	body: {
		raw: ,// Array of bytes, packet body
		ascii: ,// Only set for FIRMWARE_VERSION, body as string.
		segments: [
			{
				function: { // The setting
					id: ,// single byte id
					name: // setting name, or 'UNKNOWN'
				},
				payload: { // setting value
					length: ,// Length of payload
					raw: ,// Array of bytes
					ascii: ,// payload as string, only set if function is recognized and name isn't set
					name: // payload meaning, only set if function is recognized and payload meaning is known.
				}
			}
		]
	},
	crc: {
		value: ,// single byte, crc of the packet
		isGood: // Is the crc byte correct?
	}
};
```
