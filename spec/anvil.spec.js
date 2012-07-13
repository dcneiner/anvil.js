require( "should" );

var _ = require( "underscore" );
var commander = require( "commander" );
var machina = require( "machina" );
var postal = require( "postal" );
var path = require( "path" );
var log = require( "./log.mock.js" );
var fs = require( "./fs.mock.js" )( _, path );
var scheduler = require( "../src/scheduler.js" )( _ );
var events = require( "../src/eventAggregator.js" )( _ );
var bus = require( "../src/bus.js")( _, postal );
var anvil = require( "../src/anvil.js" )( _, scheduler, fs, log, events, bus );
var manager = require( "./fakeManager.js" )( _ );
var locator = require( "../src/pluginLocator.js" )( _, manager, anvil );
var config = require( "../src/config.js" )( _, commander, path, anvil );

describe( "when setting up configuration and plugins", function() {

	var configCompleted = false;

	before( function( done ) {
		events.on( "plugins.configured", function() {
			configCompleted = true;
			done();
		} );
		config.initialize( [ "node", "anvil", "--pa", "test" ] );
	} );
	
	it( "should configure all plugins", function() {
		configCompleted.should.be.true;
	} );

	it( "should dispatch completed commander to plugins", function() {
		console.log( JSON.stringify( locator.instances[ "pluginA" ] ) );
		locator.instances[ "pluginA" ].config.should.equal( "test" );
	} );

} );