/*global alert*/
window.requestFrame = (function (w,  suffix) {
	'use strict';
	return  w['webkitR' + suffix] ||
			w['r'       + suffix] ||
			w['mozR'    + suffix] ||
			w['msR'     + suffix] ||
			w['oR'      + suffix] ||

			// if native request animation frame not
			// available polyfill with setTimeout
			function (cb) { setTimeout(cb, 1000 / 60); };
})(window, 'equestAnimationFrame');

(function (window) {
	'use strict';

	var fireworks = [],
		firworkTrailLength = 3,
		particles = [],
		particleTrailLength = 5,
		canvas,
		ctx,

		// starting hue
		hue = 120,

		// when launching fireworks with a click, too many get launched at once
		// without a limiter, one launch per 5 loop ticks
		limiterTotal = 5,
		limiterTick = 0,

		// this will time the auto launches of fireworks, one launch per 80
		// loop ticks
		timerTotal = 50,
		timerTick = 49,
		mousedown = false,

		// full screen dimensions
		cw = window.innerWidth,
		ch = window.innerHeight,

		// mouse x,y
		mx,
		my;

	/**
	 * Firework
	 */
	function Firework( sx, sy, tx, ty ) {
		// actual coordinates
		this.x = sx;
		this.y = sy;

		// starting coordinates
		this.sx = sx;
		this.sy = sy;

		// target coordinates
		this.tx = tx;
		this.ty = ty;

		// distance from starting point to target
		this.distanceToTarget = calculateDistance( sx, sy, tx, ty );
		this.distanceTraveled = 0;

		// track the past coordinates of each firework to create a trail effect
		// increase the firworkTrailLength to create more prominent trails
		this.coordinates = [];
		this.coordinateCount = firworkTrailLength;

		// populate initial coordinate collection with the current coordinates
		while( this.coordinateCount-- ) {
			this.coordinates.push( [ this.x, this.y ] );
		}

		this.angle = Math.atan2( ty - sy, tx - sx );
		this.speed = 2;
		this.acceleration = 1.05;
		this.brightness = random( 50, 70 );

		// circle target indicator radius
		this.targetRadius = 1;
	}

	Firework.prototype = {
		update: function (index) {
			// remove last item in coordinates array
			this.coordinates.pop();

			// add current coordinates to the start of the array
			this.coordinates.unshift( [ this.x, this.y ] );
			
			// cycle the circle target indicator radius
			if( this.targetRadius < 8 ) {
				this.targetRadius += 0.3;
			} else {
				this.targetRadius = 1;
			}
			
			// speed up the firework
			this.speed *= this.acceleration;
			
			// get the current velocities based on angle and speed
			var vx = Math.cos( this.angle ) * this.speed,
				vy = Math.sin( this.angle ) * this.speed;

			// how far will the firework have traveled with velocities applied?
			this.distanceTraveled = calculateDistance(
				this.sx,
				this.sy,
				this.x + vx,
				this.y + vy);
			
			// if the distance traveled, including velocities, is greater than
			// the initial distance to the target, then the target has
			// been reached
			if( this.distanceTraveled >= this.distanceToTarget ) {
				createParticles( this.tx, this.ty );

				// remove the firework, use the index passed into the update function to determine which to remove
				fireworks.splice( index, 1 );
			} else {
				// target not reached, keep traveling
				this.x += vx;
				this.y += vy;
			}
		},

		draw: function () {
			ctx.beginPath();
			// move to the last tracked coordinate in the set, then draw a line to the current x and y
			ctx.moveTo( this.coordinates[ this.coordinates.length - 1][ 0 ], this.coordinates[ this.coordinates.length - 1][ 1 ] );
			ctx.lineTo( this.x, this.y );
			ctx.strokeStyle = 'hsl(' + hue + ', 100%, ' + this.brightness + '%)';
			ctx.stroke();

			ctx.beginPath();
			// draw the target for this firework with a pulsing circle
			ctx.arc( this.tx, this.ty, this.targetRadius, 0, Math.PI * 2 );
			ctx.stroke();
		}
	};

	/**
	 * Particle
	 */
	function Particle(x, y) {
		this.x = x;
		this.y = y;

		// track the past coordinates of each particle to create a trail effect
		// increase the particleTrailLength to create more prominent trails
		this.coordinates = [];
		this.coordinateCount = particleTrailLength;

		while( this.coordinateCount-- ) {
			this.coordinates.push( [ this.x, this.y ] );
		}

		// set a random angle in all possible directions, in radians
		this.angle = random( 0, Math.PI * 2 );
		this.speed = random( 1, 10 );

		// friction will slow the particle down
		this.friction = 0.95;

		// gravity will be applied and pull the particle down
		this.gravity = 1;

		// set the hue to a random number +-20 of the overall hue variable
		this.hue = random( hue - 20, hue + 20 );
		this.brightness = random( 50, 80 );
		this.alpha = 1;

		// set how fast the particle fades out
		this.decay = random( 0.015, 0.03 );
	}

	Particle.prototype = {
		update: function (index) {
			// remove last item in coordinates array
			this.coordinates.pop();
			
			// add current coordinates to the start of the array
			this.coordinates.unshift( [ this.x, this.y ] );
			
			// slow down the particle
			this.speed *= this.friction;
			
			// apply velocity
			this.x += Math.cos( this.angle ) * this.speed;
			this.y += Math.sin( this.angle ) * this.speed + this.gravity;
			
			// fade out the particle
			this.alpha -= this.decay;
			
			// remove the particle once the alpha is low enough, based on the passed in index
			if( this.alpha <= this.decay ) {
				particles.splice( index, 1 );
			}
		},

		draw: function () {
			ctx. beginPath();

			// move to the last tracked coordinates in the set, then draw a line to the current x and y
			ctx.moveTo( this.coordinates[ this.coordinates.length - 1 ][ 0 ], this.coordinates[ this.coordinates.length - 1 ][ 1 ] );
			ctx.lineTo( this.x, this.y );
			ctx.strokeStyle = 'hsla(' + this.hue + ', 100%, ' + this.brightness + '%, ' + this.alpha + ')';
			ctx.stroke();
		}
	};

	/**
	 * Helpers
	 */
	// get a random number within a range
	function random( min, max ) {
		return Math.random() * ( max - min ) + min;
	}

	// calculate the distance between two points
	function calculateDistance( p1x, p1y, p2x, p2y ) {
		var xDistance = p1x - p2x,
			yDistance = p1y - p2y;

		return Math.sqrt( Math.pow( xDistance, 2 ) + Math.pow( yDistance, 2 ) );
	}

	// create particle group/explosion
	function createParticles( x, y ) {
		// increase the particle count for a bigger explosion, beware of the canvas performance hit with the increased particles though
		var particleCount = 30;
		while( particleCount-- ) {
			particles.push( new Particle( x, y ) );
		}
	}

	function addHandler(elem, event, handler) {
		if (window.addEventListener) {
			elem.addEventListener(event, handler, false);
		} else {
			elem.attachEvent('on' + event, handler);
		}
	}

	/**
	 * Loop
	 */
	function loop() {
		var i;

		requestFrame(loop);

		hue += 0.5;

		// normally, clearRect() would be used to clear the canvas
		// we want to create a trailing effect though
		// setting the composite operation to destination-out will allow us to clear the canvas at a specific opacity, rather than wiping it entirely
		ctx.globalCompositeOperation = 'destination-out';

		// decrease the alpha property to create more prominent trails
		ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
		ctx.fillRect( 0, 0, cw, ch );

		// change the composite operation back to our main mode
		// lighter creates bright highlight points as the fireworks and particles overlap each other
		ctx.globalCompositeOperation = 'lighter';
		
		// loop over each firework, draw it, update it
		i = fireworks.length;
		while( i-- ) {
			fireworks[ i ].draw();
			fireworks[ i ].update( i );
		}
		
		// loop over each particle, draw it, update it
		i = particles.length;
		while( i-- ) {
			particles[ i ].draw();
			particles[ i ].update( i );
		}
		
		// launch fireworks automatically to random coordinates, when the mouse isn't down
		if( timerTick >= timerTotal ) {
			if( !mousedown ) {
				// start the firework at the bottom middle of the screen, then
				// set the random target coordinates, the random y coordinates
				// will be set within the range of the top half of the screen
				fireworks.push( new Firework( cw / 2, ch, random( 0, cw ), random( 0, ch / 2 ) ) );
				timerTick = 0;
			}
		} else {
			timerTick++;
		}
		
		// limit the rate at which fireworks get launched when mouse is down
		if( limiterTick >= limiterTotal ) {
			if( mousedown ) {
				// start the firework at the bottom middle of the screen, then set the current mouse coordinates as the target
				fireworks.push( new Firework( cw / 2, ch, mx, my ) );
				limiterTick = 0;
			}
		} else {
			limiterTick++;
		}
	}

	function bindEvents() {
		addHandler(canvas, 'mousemove', function (e) {
			e = e || window.event;
			mx = e.pageX - canvas.offsetLeft;
			my = e.pageY - canvas.offsetTop;
		});

		addHandler(canvas, 'mousedown', function (e) {
			e = e || window.event;
			if (e.preventDefault) {
				e.preventDefault();
			} else {
				e.returnValue = false;
			}
			mousedown = true;
		});

		addHandler(canvas, 'mouseup', function (e) {
			e = e || window.event;
			if (e.preventDefault) {
				e.preventDefault();
			} else {
				e.returnValue = false;
			}
			mousedown = false;
		});
	}

	function init() {
		// if ie 7 or ie 8 return;
		var msie = parseInt(((/msie (\d+)/.exec(navigator.userAgent.toLowerCase()) || [])[1]), 10);
		if (msie < 9) {
			alert('boom... ie' + msie + ' fireworks\n\n:*(');
			return;
		}

		canvas = document.createElement('canvas');
		canvas.id = 'canvas';
		canvas.style.cssText = 'z-index:20000;background:#000;background:rgba(0,0,0,0.88);cursor:crosshair;display:block;position:absolute;top:0;left:0;';

		document.body.appendChild(canvas);
		canvas.width = cw;
		canvas.height = ch;

		ctx = canvas.getContext( '2d' );

		bindEvents();
		loop();
	}

	init();
})(window);
