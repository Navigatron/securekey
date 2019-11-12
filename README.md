# Securekey

Send commands to credit card readers! Read settings, change settings, cause mayhem.

Supported devices:

- IDTech SecureKey m100
- IDTech SecureKey m130

The IDTech SREDKey uses *almost* identical firmware, so this might work there as well. (You'll need to change the productID constant though)

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

There are too many settings to list here. Open `settings.js` for a complete list.

Settings of note:

- `ALL_SETTINGS`
	- read-only
	- returns the current value of most settings

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

## Key Injection

It looks like keys need to be encrypted with the devices 'public key'. Once I find that, I can work on this.
