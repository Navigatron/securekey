'use strict';

const sk = require('./index.js');

const main = async ()=>{

	console.log('Attempting to open reader');
	let reader;

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

	// read serial number
	console.log('Reading serial number...');
	await reader.readSetting(sk.settings.SERIAL_NUMBER).then(response=>{
		console.log('serial number is: '+response.body.segments[0].payload.ascii);
	}).catch(err=>{
		console.log('got error');
		console.log(err);
	});

	// read firmware version
	console.log('Reading firmware version...');
	await reader.readSetting(sk.settings.FIRMWARE_VERSION).then(response=>{
		console.log('firmware version is: '+response.body.ascii);
	}).catch(err=>{
		console.log('got error');
		console.log(err);
	});

	// Let's try that read all settings command?
	console.log('Reading a lot of settings...');
	await reader.readSetting(sk.settings.ALL_SETTINGS).then(response=>{
		console.log('ALL SETTINGS READ');
		console.log('status: '+response.status.name);
		console.log('Received responses for X settings: '+response.body.segments.length);
		response.body.segments.forEach(segment=>{
			console.log(segment.function.name+' (0x'+segment.function.id.toString(16)+')');
			if(segment.payload.length!==0){
				console.log('    payload raw: '+segment.payload.raw);
				if(segment.payload.ascii)console.log('    payload ascii: '+segment.payload.ascii);
				if(segment.payload.name)console.log('    payload name: '+segment.payload.name);
			}else{
				console.log('    No Payload');
			}
		});
	}).catch(err=>{
		console.log('got error');
		console.log(err);
	});
};

main();
