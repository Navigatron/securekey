'use strict';

const settings = {
	FIRMWARE_VERSION: {
		id: 0x22,
		readable: true,
		writeable: false,
		// ascii
	},
	SERIAL_NUMBER: {
		id: 0x4E,
		readable: true,
		writeable: false,
		// ascii, 10 bytes, can be set once
	},
	ALL_SETTINGS: {
		id: 0x1F,
		readable: true,
		writeable: false,
		// segments
	},
	RESET_TO_DEFAULT: {
		id: 0x18,
		readable: false,
		writeable: true,
		// segments
	},
	MSR_READING: {
		id: 0x1A,
		options: {
			ENABLED: '1'.charCodeAt(0),
			DISABLED: '0'.charCodeAt(0)
		},
		readable: true,
		writeable: true
	},
	DECODING_METHOD: {
		id: 0x1D,
		options: {
			RAW_BOTH_DIRECTIONS: '0'.charCodeAt(0),
			DECODE_BOTH_DIRECTIONS: '1'.charCodeAt(0), // default
			STRIPE_MOVING_WITH_ENCODING: '2'.charCodeAt(0),
			STRIPE_MOVING_AGAINST_ENCODING: '3'.charCodeAt(0)
		},
		readable: true,
		writeable: true
	},
	MESSAGE_PREAMBLE: {
		id: 0xD2,
		readable: true,
		writeable: true
		// set to len (1 through 15 inclusive), string
	},
	MESSAGE_POSTAMBLE: {
		id: 0xD3,
		readable: true,
		writeable: true
	},
	TRACK_SELECTION: {
		id: 0x13,
		readable: true,
		writeable: true,
		// Which tracks to return?
		// Are they optional?
		// If a required track fails, none are sent.
		options: {
			ALL_TRACKS_OPTIONAL: '0'.charCodeAt(0),
			TRACK_1_REQUIRED: '1'.charCodeAt(0),
			TRACK_2_REQUIRED: '2'.charCodeAt(0),
			TRACK_1_AND_2_REQUIRED: '3'.charCodeAt(0),
			TRACK_3_REQUIRED: '4'.charCodeAt(0),
			TRACK_1_AND_3_REQUIRED: '5'.charCodeAt(0),
			TRACK_2_AND_3_REQUIRED: '6'.charCodeAt(0),
			ALL_TRACKS_REQUIRED: '7'.charCodeAt(0),
			TRACK_1_AND_2_OPTIONAL: '8'.charCodeAt(0),
			TRACK_2_AND_3_OPTIONAL: '9'.charCodeAt(0)
		}
	},
	MSR_TERMINATOR: {
		id: 0x21,
		readable: true,
		writeable: true
		// single byte character
		// default: 0x0D (CR, carriage return, \r)
		// 0x00: no terminator
		// 0x0A: LF, line-feed, \n
		// 0x30: CRLF, 0x0D0A, \r\n
	},
	ENCRYPTION_TYPE: {
		id: 0x4C,
		readable: true,
		writeable: true,
		options: {
			// I'm pretty sure there's a forbidden 'zero'
			// THERE IS I FOUND IT, AND IT'S THE DEFAULT?
			CLEARTEXT: '0'.charCodeAt(0), // default
			TDES: '1'.charCodeAt(0),
			AES: '2'.charCodeAt(0)
		}
	},
	KSN: {
		id: 0x51,
		readable: true,
		writable: false
		// returns ten bytes
		// left 59 bits = initial KSN
		// right 21 bits = encryption counter
	},
	SECURITY_LEVEL: {
		id: 0x7E,
		readable: true,
		writeable: false, // Set to true if you dare
		options: {
			OUT_OF_KEYS: '0'.charCodeAt(0), // cannot set to this level, indicates expired keys
			ONE: '1'.charCodeAt(0), // default
			TWO: '2'.charCodeAt(0),
			THREE: '3'.charCodeAt(0),
			// FOUR: '4'.charCodeAt(0) // does this exist?

		}
	},
	// If the card is lifted, say track 1 reads on track 2, what happens?
	OUTPUT_WHEN_SWIPE_LIFTED: {
		id: 0xAF,
		readable: true,
		writeable: true,
		options: {
			ABSOLUTELY_NOT: 0x00, // Fail to swipe if card is lifted
			SEND_UNENCRYPTED: 0x01 // Someone decided this should be the default!?
		}
	},
	// todo bit-level opcode 0x30
	// How many digits of the cc number to show at beginning
	PRE_PAN: {
		id: 0x49,
		readable: true,
		writeable: true,
		// single byte, 0x00 - 0x06
		// default: 0x04
	},
	// How many digits of the cc number to show at end
	POST_PAN: {
		id: 0x4A,
		readable: true,
		writeable: true
		// single byte, 0x00 - 0x04
		// default: 0x04
	},
	// What char to mask the cc number with
	PAN_MASK_CHAR: {
		id: 0x4B,
		readable: true,
		writeable: true,
		// single byte, character. 0x20 - 0x7E
		// default: '*'
	},
	// Send the cc expiration date in cleartext?
	DISPLAY_EXPIRATION_DATE: {
		id: 0x50,
		readable: true,
		writeable: true,
		options: {
			MASK: '0'.charCodeAt(0),
			CLEARTEXT: '1'.charCodeAt(0),
		}
	},
	SESSION_ID: {
		id: 0x54,
		readable: false,
		writeable: true,
		// Not sure what this does yet?
		// 8-byte string, contains anything
		// Used to identify current transaction
		// Used to prevent replays
		// Can only be used at security level 4
		// encrypted with card data and sent back
		// Persists until new sessionID recieved, or power cycle
	},
	KEY_MANAGEMENT: {
		id: 0x58,
		readable: true,
		writeable: true,
		options: {
			// I'm pretty sure there's another choice here
			DUKPT: '1'.charCodeAt(0) // default
		}
	},
	INCLUDE_HASH_DATA: {
		id: 0x5C,
		readable: true,
		writeable: true,
		// default is '7' - hash all encrypted tracks
		// what?
	},
	// which tracks to encrypt?
	ENCRYPT_TRACKS: {
		id: 0x84,
		readable: true,
		writeable: true,
		// 'which tracks to encrypt'
		// default is 0x00???
	},
	ENCRYPT_STRUCTURE_MSR: {
		id: 0x85,
		readable: true,
		writeable: true,
		options: {
			ORIGINAL: '0'.charCodeAt(0),
			ENHANCED: '1'.charCodeAt(0) // default
		}
	},
	MASK_TRACKS: {
		id: 0x86,
		readable: true,
		writeable: true,
		// 0x07 is default?
		// what does this mean
	},
	EnFmt: { // "For XML"
		id: 0x88,
		readable: true,
		writeable: true,
		// default: 0x023034
		// no idea
	},
	EXPIRATION_OFFSET: {
		id: 0x89,
		readable: true,
		writeable: true
		// 'Offset to date on ISO4049 track 3'
		// default: 0x34
	},
	ENCRYPT_STRUCTURE_KEYED: {
		id: 0x8F,
		readable: true,
		writeable: true,
		options: {
			ORIGINAL: '0'.charCodeAt(0),
			ENHANCED: '1'.charCodeAt(0) // default
		}
	},
	MASTER_KEY_LOADING_MODE: {
		id: 0xAB,
		readable: false,
		writeable: false
		// the hell is this?
	},
	MASTER_KEY_LOADED: {
		id: 0xAC,
		readable: true,
		writeable: false
		// returns 1 if the master key has been loaded
	},
	RKI_TIMEOUT: {// timeout measured in minutes?
		id: 0xAD,
		readable: true,
		writeable: true,
		// I don't know what this does
	},
	UNUSUAL_SPECIAL_SETTINGS: {
		// 'If bit 4 is set high, the USB enumeration will include
		// the reader's serial number'
		id: 0xAE,
		readable: true,
		writeable: true
		// no idea
	}

};

module.exports = settings;
