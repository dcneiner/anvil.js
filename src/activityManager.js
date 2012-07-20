var activityManagerFactory = function( _, machina, anvil ) {

	var isADependency = function( plugin, dependencies ) {
		return _.any( dependencies, function( dependency ) {
			return dependency === plugin.name;
		} );
	};

	var sort = function( plugins ) {
		var newList = [];
		_.each( plugins, function( plugin ) { plugin.visited = false; } );
		_.each( plugins, function( plugin ) { visit( plugins, plugin, newList ); } );
		return newList;
	};
			
	var visit = function( plugins, plugin, list ) {
		if( !plugin.visited ) {
			plugin.visited = true;
			_.each( plugins, function( neighbor ) {
				var dependsOn = isADependency( plugin, neighbor.dependencies );
				if( dependsOn ) {
					visit( plugins, neighbor, list );
				}
			} );
			list.unshift( plugin );
		}
	};

	var activityManager = {

		initialState: "waiting",
		activities: {},
		pipelines: {},
		activityIndex: 0,

		handleEvent: function( eventName ) {
			var self = this;
			anvil.events.on( eventName, function() {
				var args = Array.prototype.slice.call( arguments );
				args.unshift( eventName );
				self.handle.apply( self, args );
			} );
		},

		addPluginToActivity: function( plugin, activity ) {
			var plugins;
			if( !this.activities[ activity ] ) {
				plugins = [];
				this.activities[ activity ] = plugins;
			} else {
				plugins = this.activities[ activity ];
			}
			plugins.push( plugin );
		},

		onBuildStop: function( reason ) {
			anvil.log.error( "The build has stopped because: " + reason );
			transition( "interrupted" );
		},

		runActivity: function() {
			try {
				var self = this,
					order = anvil.config.activityOrder,
					activity = order[ this.activityIndex ],
					totalActivities = anvil.config.activityOrder.length,
					done = function() {
						var nextActivity = order[ ++self.activityIndex ];
						while( !self.states[ nextActivity ] && self.activityIndex < totalActivities ) {
							nextActivity = order[ ++self.activityIndex ];
						}
						if( self.activityIndex >= totalActivities ) {
							self.transition( "finished" );
						} else {
							self.transition( nextActivity );
						}
					};
				anvil.log.step( "starting activity, " + activity );
				anvil.scheduler.pipeline( undefined, this.pipelines[ activity ], done );
			} catch ( err ) {
				anvil.log.error( " error running activity " + anvil.config.activityOrder[ this.activityIndex ] + " : " + err );
			}
		},

		states: {
			"waiting": {
				_onEnter: function() {
					this.handleEvent( "plugins.configured" );
					this.handleEvent( "plugin.loaded" );
					this.handleEvent( "rebuild" );
					this.handleEvent( "config" );
					this.handleEvent( "build.stop" );
				},
				"plugin.loaded": function( plugin ) {
					var self = this;
					if( plugin.activities ) {
						_.each( plugin.activities, function( activity ) {
							self.addPluginToActivity( plugin, activity );
						} );
					} else {
						this.addPluginToActivity( plugin, plugin.activity );
					}
				},
				"plugins.configured": function() {
					var self = this;
					
					_.each( self.activities, function( plugins, activity ) {
						var sorted = sort( plugins );
						self.pipelines[ activity ] = _.map( sorted, function( plugin ) {
							if( plugin.run ) {
								return function( done ) {
									anvil.log.event( "running plugin: '" + plugin.name + "'" );
									plugin.run.apply( plugin, [ done, activity ] );
								};
							} else {
								return function( done ) { done(); };
							}
						} );
						self.states[ activity ] = {
							_onEnter: self.runActivity,
							"build.stop": self.onBuildStop
						};
					} );
					this.transition( _.first( anvil.config.activityOrder ) );
				}
			},
			"finished": {
				_onEnter: function() {
					anvil.log.complete( "build completed" );
					anvil.events.raise( "build.done" );
				},
				"rebuild": function( startingWith ) {
					this.activityIndex = _.indexOf( anvil.config.activityOrder, startingWith );
					anvil.log.step( this.activityIndex === 0 ? "rebuilding project" : "starting incremental build" );
					this.transition( startingWith );
				}
			},
			"interrupted": {
				"rebuild": function() {
					var start = anvil.config.activityOrder[ 0 ];
					anvil.log.step( "restarting previously failed build" );
					this.transition( start );
				}
			}
		}

	};

	var machine = new machina.Fsm( activityManager );
	return machine;
};

module.exports = activityManagerFactory;