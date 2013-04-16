/**
 * @fileoverview This file provides a limeJS simulation of alibi generation.
 *	 Key presses (WASD) allow player to move blue dot.  The green dot is moved
 *   around square until it is in sight of the player at one of the portals.
 *   At that point, it generates a viable alibi for why the green dot is
 *   travelling down this segment of the world
 * @author Christine Talbot
 */

goog.provide('demo');
// include required files
goog.require('lime');
goog.require('lime.Director');
goog.require('lime.Layer');
goog.require('lime.Sprite');
goog.require('lime.Scene');
goog.require('lime.fill.Image');
goog.require('goog.math.Vec2');
goog.require('lime.RoundedRect');
goog.require('lime.Circle');
goog.require('goog.events.KeyEvent');
goog.require('lime.animation.MoveBy');
goog.require('lime.scheduleManager');

// "constants"
var WIDTH = 1024;
var HEIGHT = 768;
var CUR_NODE = 0;
var LAST_NODE = 0;
var LAST_TARGET = null;
var CUR_TARGET = null;
var ALIBI = false;
var KEY_DOWN = null;
var KEY_DONE = true;
var PROB_TABLE = null;
var FIRST_ALIBI_FROM = null;
var BEST_PATH = null;
var WAIT_TIME = null;
var WAITED = 0.0;
var NEXT_TARGET_PROBS = null;

// objects
var grid = null;
var person = null;
var player = null;
var curStateBox = null;
var curStateLbl1 = null;
var curStateLbl2 = null;
var curStateLbl3 = null;
var curStateLbl4 = null;
var curStateLbl5 = null;
var curStateLbl6 = null;

var debug = false;


/**
 * This starts the simulation and sets up the scene
 */
demo.start = function() {
	// create the graph of the world
	demo.createGraph();
	// create the prob tables
	demo.createProbs();

	// create new director for the simulation
	var director = new lime.Director(document.body, WIDTH, HEIGHT);
	
	// turn off the frames per second image
	director.setDisplayFPS(false);
	
	// create new scene
	var gridScene = new lime.Scene;

	// create main layer for the simulation
	var layer = new lime.Layer()
						.setAnchorPoint(0,0)
						.setPosition(0,0)
						.setSize(WIDTH,HEIGHT);
	
	// create layer with grid layout for classes
	var bkgrdLayer = new lime.Layer().setPosition(0,0).setSize(WIDTH,HEIGHT);
	gridScene.appendChild(bkgrdLayer);
	
	// make the classrooms purple so they stand out
	var bkgrdColor = new lime.Sprite()
							 .setAnchorPoint(0,0)
							 .setPosition(0,0)
							 .setSize(WIDTH,HEIGHT)
							 .setFill("#A0C")
							 .setOpacity(1);
	bkgrdLayer.appendChild(bkgrdColor);
	
	// put background image
	var bkgrdSprite = new lime.Sprite()
							  .setAnchorPoint(0,0)
							  .setPosition(0,0)
							  .setSize(WIDTH, HEIGHT)
							  .setFill(new lime.fill.Image('assets/grid2.png'))
							  .setOpacity(1);
	layer.appendChild(bkgrdSprite);
	
	// add the AI person that walks the halls
	person = new lime.Circle()
					 .setSize(40,40)
					 .setFill("#0F0")
					 .setPosition(grid.nodes[0].position.x, 
					 			  grid.nodes[0].position.y); 
	// using half the diameter of the circle i want
	layer.appendChild(person);
	
	// initialize the AI person's location
	LAST_NODE = CUR_NODE;
	CUR_NODE = 0;
	
	// add the player controlled blue dot
	player = new lime.Circle()
					 .setSize(30,30)
					 .setFill("#00F")
					 .setPosition(grid.nodes[14].position.x, 
					 			  grid.nodes[14].position.y); 
	// using half the diameter of the circle i want
	layer.appendChild(player);

	// add instructions image for player movement
	var instructions = new lime.Sprite()
						       .setAnchorPoint(1,1)
						       .setPosition(WIDTH,HEIGHT-20)
						       .setSize(465*5/9,163*5/9)
						       .setFill(new 
						       		lime.fill.Image('assets/instructions.png'))
						       .setOpacity(1);
	layer.appendChild(instructions);
	
	// add layer to overall scene
	gridScene.appendChild(layer);
	
	// create the layer to show the graph details
	var graphLayer = new lime.Layer()
							 .setPosition(0,0)
							 .setSize(WIDTH, HEIGHT);
	gridScene.appendChild(graphLayer);
	// add text, etc to the scene/layer
	demo.createGraphLayer(grid, graphLayer);
	
	// add current state box
	curStateBox = new lime.RoundedRect()
						  .setPosition(WIDTH/2, HEIGHT/2+20)
						  .setSize(400,200)
						  .setFill("#FFF");
	gridScene.appendChild(curStateBox);
	curStateLbl1 = new lime.Label()
						   .setSize(24)
						   .setAnchorPoint(0,0)
						   .setPosition(WIDTH/2 - 160, HEIGHT/2 - 55)
						   .setText("No alibi currently");
	gridScene.appendChild(curStateLbl1);
	curStateLbl2 = new lime.Label()
						   .setSize(24)
						   .setAnchorPoint(0,0)
						   .setPosition(WIDTH/2 - 160, HEIGHT/2 - 5)
						   .setText("Current Info 2");
	gridScene.appendChild(curStateLbl2);
	curStateLbl3 = new lime.Label()
						   .setSize(24)
						   .setAnchorPoint(0,0)
						   .setPosition(WIDTH/2 - 135, HEIGHT/2 + 20)
						   .setText("Current Info 3");
	gridScene.appendChild(curStateLbl3);
	curStateLbl4 = new lime.Label()
						   .setSize(24)
						   .setAnchorPoint(0,0)
						   .setPosition(WIDTH/2 - 160, HEIGHT/2 + 45)
						   .setText("Current Info 4");
	gridScene.appendChild(curStateLbl4);
	curStateLbl5 = new lime.Label()
						   .setSize(24)
						   .setAnchorPoint(0,0)
						   .setPosition(WIDTH/2 - 160, HEIGHT/2 + 70)
						   .setText("Current Info 5");
	gridScene.appendChild(curStateLbl5);
	curStateLbl6 = new lime.Label()
						   .setSize(24)
						   .setAnchorPoint(0,0)
						   .setPosition(WIDTH/2 - 160, HEIGHT/2 + 95)
						   .setText("");
	gridScene.appendChild(curStateLbl6);
	
	// set active scene
	director.replaceScene(gridScene);
	
	// use lime scheduler to run animations
	demo.runAnimations();
	
	// listen for keydown for moving the player on the board
	goog.events.listen(document, ['keydown'], function(e) {
		if (KEY_DOWN === null) { // ignore secondary keys pressed
			switch (e.keyCode) {
				case goog.events.KeyCodes.W:
				case goog.events.KeyCodes.A:
				case goog.events.KeyCodes.S:
				case goog.events.KeyCodes.D:
					demo.checkMove(e.keyCode);
					break;
				default:
					// error do nothing
					break;
			}
		}
	});

}

/**
 * This function checks to see if the player can move in the direction that the
 *   key press is requesting it to move.
 * @param {goog.events.KeyCodes} key W,A,S,or D for the key that was pressed
 */
demo.checkMove = function(key) {

	var portal = demo.atPortal(player); // check if player at a portal
	if (portal !== -1) {
		var dir = demo.segmentExists(portal, key); // check if can move in dir
		if (dir.node !== -1) {
			// create animation and move
			KEY_DOWN = key; // save the key down
			KEY_DONE = false;
			var maxAmt = goog.math.Vec2.distance(
				new goog.math.Coordinate(
					grid.nodes[dir.node].position.x, 
					grid.nodes[dir.node].position.y),
				new goog.math.Coordinate(
					player.getPosition().x, 
					player.getPosition().y)
				);
			// move player up to the distance left on this segment
			demo.runPlayerAnimations(key, maxAmt); 
		} else {
			// do nothing
		}
	} else {
		var edge = demo.correctDir(key); // check if can move in dir pressed
		if (edge.num !== -1) {
			// create animation and move
			KEY_DOWN = key; // save the key
			KEY_DONE = false;
			var maxAmt = goog.math.Vec2.distance(
				new goog.math.Coordinate(
					grid.nodes[edge.node].position.x, 
					grid.nodes[edge.node].position.y),
				new goog.math.Coordinate(
					player.getPosition().x, 
					player.getPosition().y)
				);
			// move player up to the distance left on this segment
			demo.runPlayerAnimations(key, maxAmt);
		} else {
			// do nothing
		}
	}
}

/**
 * This checks if the player / person (identified by which) is at a portal or
 *   inbetween portals.
 * @param {Object} which player or person object / sprite
 * @return {number} which node of the graph at or -1
 */
demo.atPortal = function(which) {
	for (var i=0; i < grid.nodes.length; i++) {
		if (grid.nodes[i].position.x === which.getPosition().x && 
			grid.nodes[i].position.y === which.getPosition().y) {
				return i;
		}
	}
	return -1; // not at a portal
}

/**
 * This checks if a segment exists which allows the player to move in the
 *   direction of the key that was pressed from the portal provided.
 * @param {number} portal the node number for the portal at
 * @param {goog.events.KeyCodes} key the key that was pressed (WASD)
 * @return {number} which edge of the graph at or -1
 */
demo.segmentExists = function(portal, key) {
	var segment = {x:-1, y:-1, node:-1};
	// gives array of connected nodes
	var adjNodes = getAdjacentNodes(grid, portal);
	// for each connected node, check if player is on it
	for (var i=0; i < adjNodes.length; i++) {
		if (grid.nodes[adjNodes[i]].position.x === player.getPosition().x) { 
			//then this segment is vertical
			if (grid.nodes[adjNodes[i]].position.y > player.getPosition().y) { 
				// this segment goes south of the player
				if (key === goog.events.KeyCodes.S) {
					segment.x = grid.nodes[adjNodes[i]].position.x;
					segment.y = grid.nodes[adjNodes[i]].position.y;
					segment.node = grid.nodes[adjNodes[i]].num;
				} // otherwise can't move
			} else { // this segment goes north
				if (key === goog.events.KeyCodes.W) {
					segment.x = grid.nodes[adjNodes[i]].position.x;
					segment.y = grid.nodes[adjNodes[i]].position.y;
					segment.node = grid.nodes[adjNodes[i]].num;
				}
			}
		} else { // this segment goes left to right
			if (grid.nodes[adjNodes[i]].position.x > player.getPosition().x) { 
				// this segment goes right of the player
				if (key === goog.events.KeyCodes.D) {
					segment.x = grid.nodes[adjNodes[i]].position.x;
					segment.y = grid.nodes[adjNodes[i]].position.y;
					segment.node = grid.nodes[adjNodes[i]].num;
				} // otherwise can't move
			} else { // this segment goes left
				if (key === goog.events.KeyCodes.A) {
					segment.x = grid.nodes[adjNodes[i]].position.x;
					segment.y = grid.nodes[adjNodes[i]].position.y;
					segment.node = grid.nodes[adjNodes[i]].num;
				}
			}
		}
	}
	return segment;
	
}

/**
 * This gives the max distance that can be moved in a specified direction given
 *   by the key passed in.
 * @param {number} amt the max length of the remaining segment
 * @param {goog.events.KeyCodes} key the key that was pressed
 * @return {object} the x & y coordinates to move to
 */
demo.getAmt = function(amt, key) {
	var result = {x:0, y:0};
	switch(key) {
		case goog.events.KeyCodes.A:
			result.x = -1 * amt;
			break;
		case goog.events.KeyCodes.D:
			result.x = amt;
			break;
		case goog.events.KeyCodes.W:
			result.y = -1*amt;
			break;
		case goog.events.KeyCodes.S:
			result.y = amt;
			break;
		default:
			break;
	}
	return result;
}

/**
 * This moves the player (blue) dot on the screen and loops while the key
 *   remains pressed.
 * @param {goog.events.KeyCodes} key key that was pressed
 * @param {number} maxAmt max amount can move on the segment
 */
demo.runPlayerAnimations = function(key, maxAmt) {

	var moveAmt = demo.getAmt(Math.min(maxAmt, 8), key);
	var spriteMove = new lime.animation.MoveBy(moveAmt.x, moveAmt.y)
					.setEasing(lime.animation.Easing.LINEAR)
					.setSpeed(3);
	player.runAction(spriteMove);
	
	// listen for the move animation to stop
	goog.events.listen(spriteMove, lime.animation.Event.STOP, function() {

		if (!KEY_DONE) {
			demo.checkMove(key); // this will re-fire animation if ok to do so
		}			   	
					   	
	});
	
	// listen for key to be released
	goog.events.listen(document, ['keyup'], function(e) {
		// as long as it's the key that's pressed
		if (e.keyCode === KEY_DOWN) {
			// stops the mvmt for the keyboard when the current key is released
			KEY_DONE = true;
			KEY_DOWN = null;
			// stop animation
			spriteMove.stop();
		} 
	}); // end listen for key to be released
}

/**
 * This checks if the player can move in the direction specified by key.
 * @param {goog.events.KeyCodes} key key that was pressed
 * @return {object} which node of the graph moving towards or -1
 */
demo.correctDir = function(key) {
	var result = {num:-1, node:-1};
	// need to figure out which semgent we're on
	for (var i=0; i < grid.edges.length; i++) {
		if (grid.nodes[grid.edges[i].start].position.x === 
			player.getPosition().x) { // in the right line
				if (grid.nodes[grid.edges[i].start].position.y > 
					player.getPosition().y && 
					grid.nodes[grid.edges[i].end].position.y < 
					player.getPosition().y) { 
						// only have to do one direction since both dirs are
						// in the graph
						if (key === goog.events.KeyCodes.W || 
							key === goog.events.KeyCodes.S) {
								result.num = i;
								result.node = (key === goog.events.KeyCodes.W)?
											  (grid.edges[i].end):
											  (grid.edges[i].start);
						}
				} // else not on this segment
		} else {
			if (grid.nodes[grid.edges[i].start].position.y === 
				player.getPosition().y) { // in the right line
					if (grid.nodes[grid.edges[i].start].position.x > 
						player.getPosition().x && 
						grid.nodes[grid.edges[i].end].position.x < 
						player.getPosition().x) {
							if (key === goog.events.KeyCodes.A || 
								key === goog.events.KeyCodes.D) {
									result.num = i;
									result.node = (key === 
										goog.events.KeyCodes.A)?
										(grid.edges[i].end):
										(grid.edges[i].start);
							}
					} // else not on this segment
			} // else not in line of sight
		}
	}
	
	// then if key works for the direction the segment goes
	return result;
}

/**
 * This prints the text-related items from the graph / waypoints being used.
 * @param {Object} g the graph for the simulation
 * @param {Object} graphLayer the limejs layer to add things to
 */
demo.createGraphLayer = function(g, graphLayer) {
	var node;
	var text;
	var edge;
	
	for (var i = 0; i < g.nodes.length; i++) {

		if (g.nodes[i].type !== 'portal' || debug) {
			text = new lime.Label()
						   .setSize(12)
						   .setPosition(g.nodes[i].position.x, 
						   				g.nodes[i].position.y);
			if (debug && g.nodes[i].type === 'portal') {
				text.setText(g.nodes[i].num); // shows the numbers everywhere
			} else {
				text.setText(g.nodes[i].name); // only shows names of rooms
			}
			graphLayer.appendChild(text);
		}
	}	

}

/**
 * This is used as a loop for the green dot AI person to move around in the img.
 */
demo.runAnimations = function() {
	// only calculate alibis when hit a portal and don't have one already
	var postn = -1;
	if (!ALIBI) { // go in circles

		var needOne = demo.checkInSight();	
		if (needOne) {
			ALIBI = true;
			postn = demo.calcFirstAlibi(); // get an alibi

			curStateBox.setFill("#0FF");
			curStateLbl1.setText("Have alibi");
			// set other labels to details on my alibi
			curStateLbl2.setText("Current plan is to move from:");
			curStateLbl3.setText(grid.nodes[LAST_TARGET].name +
								 " to " + 
								 grid.nodes[CUR_TARGET].name);
			curStateLbl4.setText("Current position = (" +
								 person.getPosition().x.toFixed(1) +
								 ", " +
								 person.getPosition().y.toFixed(1) +
								 ")");
			curStateLbl5.setText("Goal position = (" +
								 postn.x.toFixed(1) +
								 ", " +
								 postn.y.toFixed(1) +
								 ")");
			var anim = new lime.animation.MoveTo(postn.x, postn.y)
							  			 .setEasing(lime.animation.Easing
							  			 						  .LINEAR)
										 .setSpeed(3);
			person.runAction(anim);
			
			LAST_NODE = CUR_NODE;
			CUR_NODE = postn.num;
			
			// when done moving, loop to this function again
			goog.events.listen(anim, 
							   lime.animation.Event.STOP, 
							   demo.runAnimations); // loop forever
		} else {
			postn = getNextNode(grid, CUR_NODE); // get next circular node
			curStateLbl2.setText("Moving from:");
			curStateLbl3.setText(((grid.nodes[CUR_NODE].type ==='portal' )?
								(grid.nodes[CUR_NODE].type +
								" " +
								grid.nodes[CUR_NODE].num):
								(grid.nodes[CUR_NODE].name)) +
								" to " + 
								((postn.type ==='portal' )?
								(postn.type +
								" " +
								postn.num):
								(postn.name)));
			curStateLbl4.setText("Current position = (" +
								 person.getPosition().x.toFixed(1) +
								 ", " +
								 person.getPosition().y.toFixed(1) +
								 ")");
			curStateLbl5.setText("Goal position = (" +
								 postn.x.toFixed(1) +
								 ", " +
								 postn.y.toFixed(1) +
								 ")");
			var anim = new lime.animation.MoveTo(postn.x, postn.y)
							  			 .setEasing(lime.animation.Easing
							  			 						  .LINEAR)
							 			 .setSpeed(3);
			person.runAction(anim);
			
			LAST_NODE = CUR_NODE;
			CUR_NODE = postn.num;
			
			// when done moving, loop through again
			goog.events.listen(anim, 
							   lime.animation.Event.STOP, 
							   demo.runAnimations); // loop forever
		}
	} else { // follow alibi
		// check if reached alibi location yet
		if (demo.reachedTarget() && WAITED === 0.0) {
			// wait, then generate next alibi
			WAITED = 0.0;
			curStateLbl6.setText("Waiting in target for " +
								 (WAIT_TIME[CUR_TARGET]/1000).toFixed(1) +
								 " seconds");
			lime.scheduleManager.callAfter(demo.waitDone, 
										   null, 
										   WAIT_TIME[CUR_TARGET]);

		} else {
			WAITED = 0.0;
			postn = demo.getNextAlibiPortal(); // get next portal
			curStateLbl2.setText("Current plan is to move from:");
			curStateLbl3.setText(grid.nodes[LAST_TARGET].name +
								 " to " +
								 grid.nodes[CUR_TARGET].name);
			curStateLbl4.setText("Current position = (" +
								 person.getPosition().x.toFixed(1) +
								 ", " +
								 person.getPosition().y.toFixed(1) +
								 ")");
			curStateLbl5.setText("Goal position = (" +
								 postn.x.toFixed(1) +
								 ", " +
								 postn.y.toFixed(1) +
								 ")");
			var anim = new lime.animation.MoveTo(postn.x, postn.y)
							  			 .setEasing(lime.animation.Easing
							  			 						  .LINEAR)
							  			 .setSpeed(3);
			person.runAction(anim);
			
			LAST_NODE = CUR_NODE;
			CUR_NODE = postn.num;
			
			// when done moving, loop and repeat
			goog.events.listen(anim, 
							   lime.animation.Event.STOP, 
							   demo.runAnimations); // loop forever
		}
	}
	
}

/**
 * This gets the next portal to go to based on its current alibi and path
 * @return {object} node information for where to go next
 */
demo.getNextAlibiPortal = function() {
	var portal = -1;
	// get next node for best path between current portal and target
	if (grid.nodes[CUR_NODE].type === 'portal') {
		portal = BEST_PATH[CUR_NODE][CUR_TARGET];
	} else {
		portal = BEST_PATH[CUR_NODE];
	}
	return {x:grid.nodes[portal].position.x, 
			y:grid.nodes[portal].position.y, 
			type:grid.nodes[portal].type, 
			num:grid.nodes[portal].num, 
			name:grid.nodes[portal].name};
}

/**
 * This generates the next alibi for the green dot AI person using probabilities
 */
demo.getNextAlibi = function() {

	// do something like first alibi, but don't set the old position randomly
	// need to calculate the first alibi & set our last target & current target
	var bestTarget = -1;
	
	if (Math.random() > 0.5 || 
		NEXT_TARGET_PROBS[CUR_NODE] === LAST_TARGET || 
		NEXT_TARGET_PROBS[CUR_NODE] === CUR_NODE) {
			bestTarget = Math.floor(Math.random() * 15)+19;
			if (bestTarget === CUR_NODE || bestTarget === LAST_TARGET) {
				bestTarget = Math.floor(Math.random() * 15)+19;
			}
	} else {
		bestTarget = NEXT_TARGET_PROBS[CUR_NODE];
	}
	
	// set the values
	LAST_TARGET = CUR_TARGET;
	CUR_TARGET = bestTarget;
	
	demo.runAnimations(); // start loop again
}

/**
 * This makes the green dot AI person wait in a target for a random amount of 
 *   time based on the target type.
 * @param {number} delta how much time has passed already
 */
demo.waitDone = function(delta) {
	WAITED += delta;

	if (WAITED >= WAIT_TIME[CUR_TARGET]) {

		curStateLbl6.setText("");
		demo.getNextAlibi();

	} else {
		lime.scheduleManager.callAfter(demo.waitDone, 
									   null, 
									   WAIT_TIME[CUR_TARGET]);
	}
	
}


/**
 * This checks if the green dot / AI person has reached their current target yet
 * @return {boolean} whether at current target or not
 */
demo.reachedTarget = function() {
	return (CUR_NODE === CUR_TARGET);
}

/**
 * This checks if the player can see the green dot / AI person
 * @return {boolean} whether the player can see the green dot
 */
demo.checkInSight = function() {
	// check if in-sight of player -- need more complex
	var result = false;

	if (Math.abs(player.getPosition().x - person.getPosition().x) < 20.0 || 
		Math.abs(player.getPosition().y - person.getPosition().y) < 20.0) {
			result = true;
	}
	return result;
}

/**
 * This generates the first alibi for the green dot / AI person based on 
 *   probabilities and current location.
 * @return {object} which node to move to next based on the new alibi generated
 */
demo.calcFirstAlibi = function() {
	// need to calculate the first alibi & set our last target & current target
	var bestTarget = -1;
	var bestTargetProb = 0;
	var bestFrom = -1;
	
	// find what segment I'm on
	var segment = CUR_NODE;
	// get the highest probability target from the probTable
	for (var p=19; p <= 33; p++) {
		if (BEST_PATH[LAST_NODE][p] === CUR_NODE && 
			PROB_TABLE[segment][p] > bestTargetProb) {
				bestTarget = p;
				bestTargetProb = PROB_TABLE[segment][p];
		}
	}
	
	// get a likely from candidate
	var checkNode = LAST_NODE;
	var adjNodes;
	var tempNode;
	while (grid.nodes[checkNode].type === 'portal') {
		tempNode = checkNode;
		adjNodes = getAdjacentNodes(grid, checkNode); // find adj nodes
		for (var x = 0; x < adjNodes.length; x++) {
			if (adjNodes[x] !== PROB_TABLE[CUR_NODE][bestTarget] && 
				adjNodes[x] !== CUR_NODE ) {
					if (checkNode === tempNode) { // take it if have nothing
						checkNode = adjNodes[x];
					} else {
						if (Math.random() > .5) { // only take with a prob
							checkNode = adjNodes[x];
						}
					}
			}
		}
	}
	bestFrom = checkNode;
	if (checkNode === CUR_NODE) { // in case didn't find any
		bestFrom = 19;
	}
	
	// set the values
	LAST_TARGET = bestFrom;
	CUR_TARGET = bestTarget;
	return {x:grid.nodes[BEST_PATH[CUR_NODE][CUR_TARGET]].position.x, 
			y:grid.nodes[BEST_PATH[CUR_NODE][CUR_TARGET]].position.y, 
			type:grid.nodes[BEST_PATH[CUR_NODE][CUR_TARGET]].type, 
			num:grid.nodes[BEST_PATH[CUR_NODE][CUR_TARGET]].num, 
			name:grid.nodes[BEST_PATH[CUR_NODE][CUR_TARGET]].name};
}

/**
 * This figures out which segment the person / player (determined by which) is
 *   on.
 * @param {Object} which player or person object / sprite
 * @return {number} which edge of the graph at or -1
 */
demo.getSegment = function(which) {
	var segment = -1;
	var portal = demo.atPortal(which);
	
	if (portal === -1) {
		// for each edge check to see if we're on it
		for (var i=0; i < grid.edges.length; i++) {
			if (grid.nodes[grid.edges[i].start].position.x === 
				which.getPosition().x) { // in the right line
					if (grid.nodes[grid.edges[i].start].position.y > 
						which.getPosition().y && 
						grid.nodes[grid.edges[i].end].position.y < 
						which.getPosition().y) { 
							// only have to do one direction since both dirs 
							// are in the graph
							
							// on segment
							segment = i;
					} // else not on this segment
			} else {
				if (grid.nodes[grid.edges[i].start].position.y === 
					which.getPosition().y) { // in the right line
						if (grid.nodes[grid.edges[i].start].position.x > 
							which.getPosition().x && 
							grid.nodes[grid.edges[i].end].position.x < 
							which.getPosition().x) {
								//on segment
								segment = i;
						} // else not on this segment
				} // else not in line of sight
			}
		}
	} else {
		// return the segment where start = portal
		for (var j=0; j < grid.edges.length; j++) {
			if (grid.edges[j].start === portal) {
				segment = j;
			}
		}
	}

	return segment;
}


/**
 * This generates the waypoint graph to be used for the simulation
 */
demo.createGraph = function() {
	grid = new Graph();
	
	// left vertical hallway
	addNode(grid,0,'portal', 'Photography Classroom', {x:221.6, y:727.48});
	addNode(grid,1,'portal', 'Janitor Closet', {x:221.6, y:670.38});
	addNode(grid,2,'portal', 'Lower Left Hallway Intersection', 
		{x:221.6, y:592.9});
	addNode(grid,3,'portal', 'Computer Lab', {x:221.6, y:510.15});
	addNode(grid,4,'portal', 'Chemistry Lab', {x:221.6, y:259.68});
	addNode(grid,5,'portal', 'Upper Left Hallway Intersection', 
		{x:221.6, y:162.6});
	addNode(grid,6,'portal', 'Upper Left Stairwell', {x:221.6, y:101.29});
	
	// top horizontal hallway
	addNode(grid,7,'portal', 'Science Classroom', {x:346.24, y:162.6});
	addNode(grid,8,'portal', 'Math Classroom', {x:502.79, y:162.6});
	addNode(grid,9,'portal', 'Gymnasium', {x:663.02, y:162.6});
	addNode(grid,10,'portal', 'Woodshop Classroom', {x:740.37, y:162.6});
	addNode(grid,11,'portal', 'Upper Right Hallway Intersection', 
		{x:796.1, y:162.6});
	
	// right vertical hallway
	addNode(grid,12,'portal', 'History Classroom', {x:796.1, y:248.63});
	addNode(grid,13,'portal', 'Foreign Language Classroom', 
		{x:796.1, y:480.69});
	addNode(grid,14,'portal', 'Lower Right Hallway Intersection', 
		{x:796.1, y:592.9});
	
	// bottom horizontal hallway
	addNode(grid,15,'portal', 'Health Classroom', {x:670.38, y:592.9});
	addNode(grid,16,'portal', 'Psychology Classroom', {x:506.47, y:592.9});
	addNode(grid,17,'portal', 'Filing Closet', {x:315.88, y:592.9});
	
	// missed one room in vertical hallway
	addNode(grid,18,'portal', 'Supply Closet', {x:221.6, y:716.43});

	// add the inside classroom nodes:	
	addNode(grid,19,'classroom', 'Photo. Classroom', 
		{x:88.40287769784173, y:727.48});
	addNode(grid,20,'closet', 'Janitor Closet', 
		{x:88.40287769784173, y:670.38});
	addNode(grid,21,'lab', 'Computer Lab', {x:88.40287769784173, y:510.15});
	addNode(grid,22,'lab', 'Chemistry Lab', {x:93.92805755395683, y:259.68});
	addNode(grid,23,'cafeteria', 'Cafeteria', {x:86.56115107913669, y:101.29});
	addNode(grid,24,'classroom', 'Science Classroom', 
		{x:346.24, y:68.14388489208633});
	addNode(grid,25,'classroom', 'Math Classroom', 
		{x:502.79, y:66.3021582733813});
	addNode(grid,26,'classroom', 'Gymnasium', {x:663.02, y:279.9424460431655});
	addNode(grid,27,'classroom', 'Woodshop Classroom', 
		{x:740.37, y:66.3021582733813});
	addNode(grid,28,'classroom', 'History Classroom', 
		{x:920.863309352518, y:248.63});
	addNode(grid,29,'classroom', 'Spanish Classroom', 
		{x:924.5467625899281, y:480.69});
	addNode(grid,30,'classroom', 'Health Classroom', 
		{x:670.38, y:690.6474820143885});
	addNode(grid,31,'classroom', 'Psych. Classroom', 
		{x:506.47, y:690.6474820143885});
	addNode(grid,32,'closet', 'File Closet', {x:315.88, y:655.6546762589928});
	addNode(grid,33,'closet', 'Supply Closet', 
		{x:340.71942446043164, y:716.43});

	// add all the edges to connect the nodes
	addEdge(grid,0,18);
	addEdge(grid,0,19);
	addEdge(grid,18,33);
	addEdge(grid,18,1);
	addEdge(grid,1,20);
	addEdge(grid,1,2);
	addEdge(grid,2,17);
	addEdge(grid,2,3);
	addEdge(grid,3,4);
	addEdge(grid,3,21);
	addEdge(grid,4,5);
	addEdge(grid,4,22);
	addEdge(grid,5,6);
	addEdge(grid,6,23);
	addEdge(grid,5,7);
	addEdge(grid,7,24);
	addEdge(grid,7,8);
	addEdge(grid,8,25);
	addEdge(grid,8,9);
	addEdge(grid,9,26);
	addEdge(grid,9,10);
	addEdge(grid,10,27);
	addEdge(grid,10,11);
	addEdge(grid,11,12);
	addEdge(grid,12,28);
	addEdge(grid,12,13);
	addEdge(grid,13,29);
	addEdge(grid,13,14);
	addEdge(grid,14,15);
	addEdge(grid,15,30);
	addEdge(grid,15,16);
	addEdge(grid,16,31);
	addEdge(grid,16,17);
	addEdge(grid,17,32);
	
}

/**
 * This creates all the probability information used within the simulation.
 *   This would normally be run through a prior full simulation with predefined
 *   behavior models.
 */
demo.createProbs = function() {
	// create the table of probabilities to use for alibi generation
	// each entry indicates a segment, then shows the prob for being on that
	// segment and going from/to different pairs of rooms
	// format: probTable[segment (assumes @ start or moving from start to end)]
	// [destination target #] = %chance
	// will use second table for the first alibi firstAlibiFrom[segment]
	//[source target #] = % prob
	// for all others will save its last target it visited
	PROB_TABLE = new Array(grid.edges.length);
	FIRST_ALIBI_FROM = new Array(grid.edges.length);
	var sumSoFarDest = 0.0;
	var sumSoFarSrc = 0.0;
	var tempDestProb = 0.0;
	var tempSrcProb = 0.0;
	for(var segment=0; segment < grid.edges.length; segment++) {
		sumSoFarDest = 0.0;
		sumSoFarSrc = 0.0;
		PROB_TABLE[segment] = new Array(grid.nodes.length);
		FIRST_ALIBI_FROM[segment] = new Array(grid.nodes.length);
		for (var dest=0; dest < grid.nodes.length; dest++) {
			tempDestProb = Math.random() * (1.0-sumSoFarDest); // sums to 1
			tempSrcProb = Math.random() * (1.0-sumSoFarSrc);
			if (dest === grid.nodes.length) {
				tempDestProb = 1.0-sumSoFarDest;
				tempSrcProb = 1.0-sumSoFarSrc;
			}
			sumSoFarDest += tempDestProb;
			sumSoFarSrc += tempSrcProb;
			PROB_TABLE[segment][dest] = tempDestProb;
			FIRST_ALIBI_FROM[segment][dest] = tempSrcProb;
		}
	}
	
	BEST_PATH = new Array(19);
	for (var i=0; i < 19; i++) {
		BEST_PATH[i] = new Array(33);
	}
	// need to save paths for each portal to target via 
	// bestPath[portal #][target #] = next goto location
	BEST_PATH[0][19] = 19;
	BEST_PATH[0][20] = 18;
	BEST_PATH[0][21] = 18;
	BEST_PATH[0][22] = 18;
	BEST_PATH[0][23] = 18;
	BEST_PATH[0][24] = 18;
	BEST_PATH[0][25] = 18;
	BEST_PATH[0][26] = 18;
	BEST_PATH[0][27] = 18;
	BEST_PATH[0][28] = 18;
	BEST_PATH[0][29] = 18;
	BEST_PATH[0][30] = 18;
	BEST_PATH[0][31] = 18;
	BEST_PATH[0][32] = 18;
	BEST_PATH[0][33] = 18;
	BEST_PATH[1][19] = 18;
	BEST_PATH[1][20] = 20;
	BEST_PATH[1][21] = 2;
	BEST_PATH[1][22] = 2;
	BEST_PATH[1][23] = 2;
	BEST_PATH[1][24] = 2;
	BEST_PATH[1][25] = 2;
	BEST_PATH[1][26] = 2;
	BEST_PATH[1][27] = 2;
	BEST_PATH[1][28] = 2;
	BEST_PATH[1][29] = 2;
	BEST_PATH[1][30] = 2;
	BEST_PATH[1][31] = 2;
	BEST_PATH[1][32] = 2;
	BEST_PATH[1][33] = 18;
	BEST_PATH[2][19] = 1;
	BEST_PATH[2][20] = 1;
	BEST_PATH[2][21] = 3;
	BEST_PATH[2][22] = 3;
	BEST_PATH[2][23] = 3;
	BEST_PATH[2][24] = 3;
	BEST_PATH[2][25] = 3;
	BEST_PATH[2][26] = 3;
	BEST_PATH[2][27] = 3;
	BEST_PATH[2][28] = 17;
	BEST_PATH[2][29] = 17;
	BEST_PATH[2][30] = 17;
	BEST_PATH[2][31] = 17;
	BEST_PATH[2][32] = 17;
	BEST_PATH[2][33] = 1;
	BEST_PATH[3][19] = 2;
	BEST_PATH[3][20] = 2;
	BEST_PATH[3][21] = 21;
	BEST_PATH[3][22] = 4;
	BEST_PATH[3][23] = 4;
	BEST_PATH[3][24] = 4;
	BEST_PATH[3][25] = 4;
	BEST_PATH[3][26] = 4;
	BEST_PATH[3][27] = 4;
	BEST_PATH[3][28] = 4;
	BEST_PATH[3][29] = 2;
	BEST_PATH[3][30] = 2;
	BEST_PATH[3][31] = 2;
	BEST_PATH[3][32] = 2;
	BEST_PATH[3][33] = 2;
	BEST_PATH[4][19] = 3;
	BEST_PATH[4][20] = 3;
	BEST_PATH[4][21] = 3;
	BEST_PATH[4][22] = 22;
	BEST_PATH[4][23] = 5;
	BEST_PATH[4][24] = 5;
	BEST_PATH[4][25] = 5;
	BEST_PATH[4][26] = 5;
	BEST_PATH[4][27] = 5;
	BEST_PATH[4][28] = 5;
	BEST_PATH[4][29] = 5;
	BEST_PATH[4][30] = 3;
	BEST_PATH[4][31] = 3;
	BEST_PATH[4][32] = 3;
	BEST_PATH[4][33] = 3;
	BEST_PATH[5][19] = 4;
	BEST_PATH[5][20] = 4;
	BEST_PATH[5][21] = 4;
	BEST_PATH[5][22] = 4;
	BEST_PATH[5][23] = 6;
	BEST_PATH[5][24] = 7;
	BEST_PATH[5][25] = 7;
	BEST_PATH[5][26] = 7;
	BEST_PATH[5][27] = 7;
	BEST_PATH[5][28] = 7;
	BEST_PATH[5][29] = 7;
	BEST_PATH[5][30] = 4;
	BEST_PATH[5][31] = 4;
	BEST_PATH[5][32] = 4;
	BEST_PATH[5][33] = 4;
	BEST_PATH[6][19] = 5;
	BEST_PATH[6][20] = 5;
	BEST_PATH[6][21] = 5;
	BEST_PATH[6][22] = 5;
	BEST_PATH[6][23] = 23;
	BEST_PATH[6][24] = 5;
	BEST_PATH[6][25] = 5;
	BEST_PATH[6][26] = 5;
	BEST_PATH[6][27] = 5;
	BEST_PATH[6][28] = 5;
	BEST_PATH[6][29] = 5;
	BEST_PATH[6][30] = 5;
	BEST_PATH[6][31] = 5;
	BEST_PATH[6][32] = 5;
	BEST_PATH[6][33] = 5;
	BEST_PATH[7][19] = 5;
	BEST_PATH[7][20] = 5;
	BEST_PATH[7][21] = 5;
	BEST_PATH[7][22] = 5;
	BEST_PATH[7][23] = 5;
	BEST_PATH[7][24] = 24;
	BEST_PATH[7][25] = 8;
	BEST_PATH[7][26] = 8;
	BEST_PATH[7][27] = 8;
	BEST_PATH[7][28] = 8;
	BEST_PATH[7][29] = 8;
	BEST_PATH[7][30] = 5;
	BEST_PATH[7][31] = 5;
	BEST_PATH[7][32] = 5;
	BEST_PATH[7][33] = 5;
	BEST_PATH[8][19] = 7;
	BEST_PATH[8][20] = 7;
	BEST_PATH[8][21] = 7;
	BEST_PATH[8][22] = 7;
	BEST_PATH[8][23] = 7;
	BEST_PATH[8][24] = 7;
	BEST_PATH[8][25] = 25;
	BEST_PATH[8][26] = 9;
	BEST_PATH[8][27] = 9;
	BEST_PATH[8][28] = 9;
	BEST_PATH[8][29] = 9;
	BEST_PATH[8][30] = 9;
	BEST_PATH[8][31] = 9;
	BEST_PATH[8][32] = 7;
	BEST_PATH[8][33] = 7;
	BEST_PATH[9][19] = 8;
	BEST_PATH[9][20] = 8;
	BEST_PATH[9][21] = 8;
	BEST_PATH[9][22] = 8;
	BEST_PATH[9][23] = 8;
	BEST_PATH[9][24] = 8;
	BEST_PATH[9][25] = 8;
	BEST_PATH[9][26] = 26;
	BEST_PATH[9][27] = 10;
	BEST_PATH[9][28] = 10;
	BEST_PATH[9][29] = 10;
	BEST_PATH[9][30] = 10;
	BEST_PATH[9][31] = 10;
	BEST_PATH[9][32] = 8;
	BEST_PATH[9][33] = 8;
	BEST_PATH[10][19] = 9;
	BEST_PATH[10][20] = 9;
	BEST_PATH[10][21] = 9;
	BEST_PATH[10][22] = 9;
	BEST_PATH[10][23] = 9;
	BEST_PATH[10][24] = 9;
	BEST_PATH[10][25] = 9;
	BEST_PATH[10][26] = 9;
	BEST_PATH[10][27] = 27;
	BEST_PATH[10][28] = 11;
	BEST_PATH[10][29] = 11;
	BEST_PATH[10][30] = 11;
	BEST_PATH[10][31] = 11;
	BEST_PATH[10][32] = 11;
	BEST_PATH[10][33] = 9;
	BEST_PATH[11][19] = 12;
	BEST_PATH[11][20] = 12;
	BEST_PATH[11][21] = 10;
	BEST_PATH[11][22] = 10;
	BEST_PATH[11][23] = 10;
	BEST_PATH[11][24] = 10;
	BEST_PATH[11][25] = 10;
	BEST_PATH[11][26] = 10;
	BEST_PATH[11][27] = 10;
	BEST_PATH[11][28] = 12;
	BEST_PATH[11][29] = 12;
	BEST_PATH[11][30] = 12;
	BEST_PATH[11][31] = 12;
	BEST_PATH[11][32] = 12;
	BEST_PATH[11][33] = 12;
	BEST_PATH[12][19] = 13;
	BEST_PATH[12][20] = 13;
	BEST_PATH[12][21] = 13;
	BEST_PATH[12][22] = 11;
	BEST_PATH[12][23] = 11;
	BEST_PATH[12][24] = 11;
	BEST_PATH[12][25] = 11;
	BEST_PATH[12][26] = 11;
	BEST_PATH[12][27] = 11;
	BEST_PATH[12][28] = 28;
	BEST_PATH[12][29] = 13;
	BEST_PATH[12][30] = 13;
	BEST_PATH[12][31] = 13;
	BEST_PATH[12][32] = 13;
	BEST_PATH[12][33] = 13;
	BEST_PATH[13][19] = 14;
	BEST_PATH[13][20] = 14;
	BEST_PATH[13][21] = 14;
	BEST_PATH[13][22] = 14;
	BEST_PATH[13][23] = 12;
	BEST_PATH[13][24] = 12;
	BEST_PATH[13][25] = 12;
	BEST_PATH[13][26] = 12;
	BEST_PATH[13][27] = 12;
	BEST_PATH[13][28] = 12;
	BEST_PATH[13][29] = 29;
	BEST_PATH[13][30] = 14;
	BEST_PATH[13][31] = 14;
	BEST_PATH[13][32] = 14;
	BEST_PATH[13][33] = 14; // stopped here
	BEST_PATH[14][19] = 15;
	BEST_PATH[14][20] = 15;
	BEST_PATH[14][21] = 15;
	BEST_PATH[14][22] = 15;
	BEST_PATH[14][23] = 15;
	BEST_PATH[14][24] = 13;
	BEST_PATH[14][25] = 13;
	BEST_PATH[14][26] = 13;
	BEST_PATH[14][27] = 13;
	BEST_PATH[14][28] = 13;
	BEST_PATH[14][29] = 13;
	BEST_PATH[14][30] = 15;
	BEST_PATH[14][31] = 15;
	BEST_PATH[14][32] = 15;
	BEST_PATH[14][33] = 15;
	BEST_PATH[15][19] = 16;
	BEST_PATH[15][20] = 16;
	BEST_PATH[15][21] = 16;
	BEST_PATH[15][22] = 16;
	BEST_PATH[15][23] = 16;
	BEST_PATH[15][24] = 16;
	BEST_PATH[15][25] = 14;
	BEST_PATH[15][26] = 14;
	BEST_PATH[15][27] = 14;
	BEST_PATH[15][28] = 14;
	BEST_PATH[15][29] = 14;
	BEST_PATH[15][30] = 30;
	BEST_PATH[15][31] = 16;
	BEST_PATH[15][32] = 16;
	BEST_PATH[15][33] = 16;
	BEST_PATH[16][19] = 17;
	BEST_PATH[16][20] = 17;
	BEST_PATH[16][21] = 17;
	BEST_PATH[16][22] = 17;
	BEST_PATH[16][23] = 17;
	BEST_PATH[16][24] = 17;
	BEST_PATH[16][25] = 17;
	BEST_PATH[16][26] = 17;
	BEST_PATH[16][27] = 15;
	BEST_PATH[16][28] = 15;
	BEST_PATH[16][29] = 15;
	BEST_PATH[16][30] = 15;
	BEST_PATH[16][31] = 31;
	BEST_PATH[16][32] = 17;
	BEST_PATH[16][33] = 17;
	BEST_PATH[17][19] = 2;
	BEST_PATH[17][20] = 2;
	BEST_PATH[17][21] = 2;
	BEST_PATH[17][22] = 2;
	BEST_PATH[17][23] = 2;
	BEST_PATH[17][24] = 2;
	BEST_PATH[17][25] = 2;
	BEST_PATH[17][26] = 2;
	BEST_PATH[17][27] = 16;
	BEST_PATH[17][28] = 16;
	BEST_PATH[17][29] = 16;
	BEST_PATH[17][30] = 16;
	BEST_PATH[17][31] = 16;
	BEST_PATH[17][32] = 32;
	BEST_PATH[17][33] = 2;
	BEST_PATH[18][19] = 0;
	BEST_PATH[18][20] = 1;
	BEST_PATH[18][21] = 1;
	BEST_PATH[18][22] = 1;
	BEST_PATH[18][23] = 1;
	BEST_PATH[18][24] = 1;
	BEST_PATH[18][25] = 1;
	BEST_PATH[18][26] = 1;
	BEST_PATH[18][27] = 1;
	BEST_PATH[18][28] = 1;
	BEST_PATH[18][29] = 1;
	BEST_PATH[18][30] = 1;
	BEST_PATH[18][31] = 1;
	BEST_PATH[18][32] = 1;
	BEST_PATH[18][33] = 33;
	// do the target to first portal (faster than searching every time)
	BEST_PATH[19] = 0;
	BEST_PATH[20] = 1;
	BEST_PATH[21] = 3;
	BEST_PATH[22] = 4;
	BEST_PATH[23] = 6;
	BEST_PATH[24] = 7;
	BEST_PATH[25] = 8;
	BEST_PATH[26] = 9;
	BEST_PATH[27] = 10;
	BEST_PATH[28] = 12;
	BEST_PATH[29] = 13;
	BEST_PATH[30] = 15;
	BEST_PATH[31] = 16;
	BEST_PATH[32] = 17;
	BEST_PATH[33] = 18;
	
	WAIT_TIME = new Array(34);
	NEXT_TARGET_PROBS = new Array(34);
	var tempTargetNum = -1;
	// generate how long to wait at each target before going to next target
	for (var i=19; i <=33; i++) {
		if (grid.nodes[i].type === 'closet' || grid.nodes[i].type == 'stairs') {
			WAIT_TIME[i] = (Math.random() * 4000) + 2000; 
			// at least 2 seconds, at most 6 seconds
		} else {
			WAIT_TIME[i] = (Math.random() * 5000) + 5000; 
			// at least 5 seconds, at most 10 seconds
		}
		tempTargetNum = Math.floor(Math.random() * 15)+19;
		if (tempTargetNum !== i) {
			NEXT_TARGET_PROBS[i] = tempTargetNum;
		} else {
			tempTargetNum = Math.floor(Math.random() * 15) + 19;
			if (tempTargetNum !== i) {
				NEXT_TARGET_PROBS[i] = tempTargetNum;
			} else {
				NEXT_TARGET_PROBS[i] = (i > 25)?(i-6):(i+8);
			}
		}
		
	}
	

}

goog.exportSymbol('demo.start', demo.start);