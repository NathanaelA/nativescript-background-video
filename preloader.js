/**********************************************************************************
 * (c) 2017, Master Technology
 * Licensed under a MIT License
 *
 * Any questions please feel free to email me or put a issue up on the private repo
 * Version 0.1.1                                      Nathan@master-technology.com
 *********************************************************************************/
"use strict";

/* global NSObject, NSString, NSMutableDictionary, MTVideoDelegate, VideoHelper, Promise, AVURLAsset, NSNull */

var delegateId = 0;
var _VideoDelegate = NSObject.extend({
	wrapper: null,
	delegateId: 0,

	onEventDataBitRateError: function(id, fileName, bitRate, error) {
		var newData = fileName.toString();
		this.wrapper._onEvent(id, newData, bitRate, error);
	}
}, {protocols: [MTVideoDelegate]});


// These have to match the compiled plugin
var COMMAND = {QUIT: 0, SETTING: 1, DOWNLOAD: 2, CANCEL: 3};

function Preloader(settings) {
	if (!this instanceof Preloader) { // jshint ignore:line
		//noinspection JSValidateTypes
		return new Preloader(settings);
	}

	this._video = new VideoHelper();

	// Create Delegate
	//noinspection JSUnresolvedFunction
	this._delegate = _VideoDelegate.alloc().init();
	this._delegate.wrapper = this;
	this._video.delegate = this._delegate;

	// Track this delegateId
	delegateId++;
	this.delegateId = delegateId;
	this._delegate.delegateId = delegateId;

	if (settings.debugging) {
		this._debugging = true;
		console.log("Debugging Enabled!");
		this._video.enableDebugging();
	}
	this._lastSentAutoCancel = 0;
	if (settings.autoCancel) {
		this._autoCancel = settings.autoCancel;
	} else {
		this._autoCancel = 0;
	}

	this._commId = 0;
	this._commPromises = {};
	this._promiseCount = 0;
}

Object.defineProperty(Preloader.prototype, "autoCancel", {
	get: function() { return this._autoCancel; },
	set: function(val) { this._autoCancel = val; }
});

Preloader.prototype.downloadVideo = function(fileName, bitRate, title, callback) {
	var self = this;
	if (typeof title === 'function') {
		callback = title;
		title = "downloadedMedia";
	} else if (title == null) {
		title = "downloadedMedia";
	}
	return new Promise(function (resolve, reject) {
		// We don't need to keep sending this unless it has changed since the last time we sent it...
		if (self._lastSentAutoCancel !== self._autoCancel) {
			self._lastSentAutoCancel = self._autoCancel;
			self._sendMessage(COMMAND.SETTING, "autoCancel", self._autoCancel, "");
		}
		self._sendMessage(COMMAND.DOWNLOAD, fileName, bitRate, title, {resolve: resolve, reject: reject, callback: callback});
	});
};

Preloader.prototype.cancel = function() {
	this._sendMessage(COMMAND.CANCEL, "", 0, "");
};

Preloader.prototype.quit = function() {

	this._sendMessage(COMMAND.QUIT, "", 0, "");

	// Clear anything
	this._delegate.wrapper = null;
	this._video.delegate = null;
	this._delegate = null;
	this._video =  null;
};

Preloader.prototype._sendMessage = function(command, dataString, dataNumber, title, promise) {
	if (this._debugging) {
		console.log("iOS SendMessage: ", command, "Promise Id", promise ? (this._commId+1) : "none");
	}
	var transfer = NSMutableDictionary.alloc().init();
	if (promise) {
		this._commId++;
		//noinspection JSUnresolvedFunction
		transfer.setObjectForKey(this._commId, 'id');

		this._promiseCount++;
		this._commPromises[this._commId] = {p: promise, t: title};
	} else {
		//noinspection JSUnresolvedFunction
		transfer.setObjectForKey(0, 'id');
	}
	//noinspection JSUnresolvedFunction
	transfer.setObjectForKey(command, 'command');

	//noinspection EqualityComparisonWithCoercionJS
	if (dataString == null) { dataString = ""; } // jshint ignore:line
	if (dataString instanceof AVURLAsset) { // jshint ignore:line
		//noinspection JSUnresolvedFunction
		transfer.setObjectForKey(dataString, 'AVAsset');
		transfer.setObjectForKey(NSString.alloc().initWithString(""), 'dataString');

	} else {
		//noinspection JSUnresolvedFunction
		transfer.setObjectForKey(NSNull.null(), 'AVAsset');
		transfer.setObjectForKey(NSString.alloc().initWithString(dataString), 'dataString');
	}

	//noinspection JSUnresolvedFunction
	transfer.setObjectForKey(NSString.alloc().initWithString(title), 'dataTitle');

	//noinspection JSUnresolvedFunction
	transfer.setObjectForKey(dataNumber, 'dataNumber');

	//noinspection JSUnresolvedFunction
	this._video.addObject(transfer);
};

Preloader.prototype._onEvent = function (id, data, bitRate, isError) {
	var that = this;
	if (this._debugging) {
		console.log("Got Event", id, "File:", data, "BR:", bitRate, "Error:", isError, "Promises left:", this._promiseCount);
	}
	var promise, title = "";
	if (id === 0) {  // We aren't tracking this request
		return;
	} else if (this._commPromises[id]) {
		promise = this._commPromises[id].p;
		title = this._commPromisses[id].t;
		delete this._commPromises[id];
		this._promiseCount--;
	} else {
		if (this._debugging) {
			console.log("No existing promise for this id", id, " Error Status: ", isError);
			for (var key in this._commPromises) {
				if (this._commPromises.hasOwnProperty(key)) {
					console.log("    :", key);
				}
			}
			console.log("-----------------------");
		}
		return;
	}
	if (isError) {
		promise.reject(data);
	} else {
		// Data comes as "value" so we have to remove the Quotes
		if (data && data.length) {
			data = data.replace(/"/g, '');
		}
		var results = {file: data, bitRate: bitRate, title: title};
		if (typeof promise.callback === 'function') {
			promise.callback(null, results);
		}
		promise.resolve(results);
	}
};

module.exports = Preloader;