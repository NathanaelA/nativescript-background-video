"use strict";
//var perfMon = require("nativescript-performance-monitor");
//var performanceMonitor = new perfMon.PerformanceMonitor();
var color = require("color");


var PluginPreloader = require('nativescript-background-video'); // require('./preloader');
var preloader = null;

var Observable = require("data/observable");
var ObservableArray = require("data/observable-array").ObservableArray;
var data = Observable.fromObject({total: 0, completed: 0, listview: new ObservableArray()});

function onNavigatingTo(args) {
	var page = args.object;

/*	performanceMonitor.start({
		textColor: new color.Color("white"),
		backgroundColor: new color.Color("black"),
		borderColor: new color.Color("black"),
		hide: false
	}); */

	for (var i=1;i<=100;i++) {
		data.listview.push({id: i, title: "Name "+i, desc: "Description "+i});
	}
	page.bindingContext = data;
}

exports.onNavigatingTo = onNavigatingTo;


var totalStarted = 0, totalCompleted = 0;
function workingDone(err, args) {
	if (err) {
		console.log("Error", err);
		data.listview.push({id: "-", title: "ERROR", desc: err});
	} else {
		data.listview.push({id: 100 + totalStarted, title: args.bitRate, desc: args.file});
	}
	totalCompleted++;
	data.completed = totalCompleted;
	if (totalCompleted === totalStarted) {
		console.log("!!! ALL Downloads are completed !!!");
		data.listview.push({id: "-", title: "!!!", desc: "All Downloads are done!!!"});
	}

}

exports.start = function() {
	if (preloader == null) {
		preloader = new PluginPreloader({debugging: false, autoCancel: 8});
	}

	totalStarted += 5;
	data.total = totalStarted;

	var fileName = "https://d21lpc610b89fb.cloudfront.net/AST201613510333251326CCA1FC425F4F825407625BCC5251DBBBD4CD3F0/playlist.m3u8";

	for (var i=0;i<5;i++) {
		var videoUrl = NSURL.URLWithString(fileName);
		var externalFile = AVURLAsset.alloc().initWithURLOptions(videoUrl, null);
		preloader.downloadVideo(externalFile, 2040000, workingDone);
	}
};

exports.quit = function() {
	if (preloader) {
		preloader.quit();
	}
	preloader = null;
};