/*
	anvil.js - an extensible build system
	version:	0.8.7
	author:		Alex Robson <alex@sharplearningcurve.com> (http://sharplearningcurve.com)
	copyright:	2011 - 2012
	license:	Dual licensed
				MIT (http://www.opensource.org/licenses/mit-license)
				GPL (http://www.opensource.org/licenses/gpl-license)
*/
var logFactory = function( anvil ) {
	
	var Log = function() {
	};

	Log.prototype.debug = function( x ) {
		anvil.events.raise( "log.debug", x );
	};

	Log.prototype.event = function( x ) {
		anvil.events.raise( "log.event", x );
	};

	Log.prototype.step = function( x ) {
		anvil.events.raise( "log.step", x );
	};

	Log.prototype.complete = function( x ) {
		anvil.events.raise( "log.complete", x );
	};

	Log.prototype.warning = function( x ) {
		anvil.events.raise( "log.warning", x );
	};

	Log.prototype.error = function( x ) {
		anvil.events.raise( "log.error", x );
	};

	var log = new Log();
	anvil.log = log;
	return log;
};

module.exports = logFactory;