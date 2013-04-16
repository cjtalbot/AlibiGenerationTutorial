goog.require('goog.math.Vec2');

/**
 * This creates a new graph object.
 */
function Graph () {
	this.nodes = [];
	this.edges = [];
}

/**
 * This adds a new node to the graph
 * @param {Object} g graph to add node to
 * @param {number} num node number to use for reference
 * @param {string} type type of node this is
 * @param {string} name name for the node
 * @param {object} position x,y coordinate for node
 */
function addNode(g, num, type, name, position) {
	g.nodes[num] = new Node(num, type, name, position);

}

/**
 * This creates a new node
 * @param {number} num node number to use for reference
 * @param {string} type type of node this is
 * @param {string} name name for the node
 * @param {object} position x,y coordinate for node
 */
function Node(num, type, name, position) {
	this.num = num;
	this.type = type;
	this.name = name;
	this.position = position;
}

/**
 * This adds two new edges to the graph (one each direction)
 * @param {Object} g graph to add node to
 * @param {number} num1 node number for one end of the edge
 * @param {number} num2 node number for the other end of the edge
 */
function addEdge(g,num1, num2) {
	var size = 0;
	size = goog.math.Vec2.distance(
		new goog.math.Coordinate(
			g.nodes[num1].position.x, 
			g.nodes[num1].position.y),
		new goog.math.Coordinate(
			g.nodes[num2].position.x, 
			g.nodes[num2].position.y)
		);
	g.edges[g.edges.length] = new Edge(num1, num2, size);
	g.edges[g.edges.length] = new Edge(num2, num1, size);
}

/**
 * This creates a new edge
 * @param {number} num1 node number for one end of the edge
 * @param {number} num2 node number for the other end of the edge
 * @param {number} sizeEdge length of this edge
 */
function Edge(num1, num2, sizeEdge) {
	this.start = num1;
	this.end = num2;
	this.size = sizeEdge;
}

/**
 * This gets what nodes are adjacent to the requested node
 * @param {Object} g graph to add node to
 * @param {number} num node number to look for adjacent nodes for
 * @return {array} array of node numbers that are adjacent to the requested node
 */
function getAdjacentNodes(g, num) {
	var adjNodes = [];
	for (var i =0; i < g.edges.length; i++) {
		if (g.edges[i].start == num) {
			adjNodes[adjNodes.length] = g.edges[i].end;
		}
	}
	return adjNodes;
}

/**
 * This gets a node from the graph
 * @param {Object} g graph to add node to
 * @param {number} num node number to get
 * @return {object} node object requested
 */
function getNode(g, num) {
	return g.nodes[num];
}

/**
 * This prints out what the graph looks like
 * @param {Object} g graph to add node to
 */
function printGraph(g) {
	console.log('Nodes:');
	for (var i = 0; i < g.nodes.length; i++) {
		console.log('Num='+g.nodes[i].num+', Type='+g.nodes[i].type+
			', Name='+g.nodes[i].name+', Position=('+g.nodes[i].position.x+
			', '+g.nodes[i].position.y+')');
	}
	console.log('Edges:');
	for (var i = 0; i < g.edges.length; i++) {
		console.log('Start='+g.edges[i].start+', End='+g.edges[i].end+
			', Length='+g.edges[i].size);
	}
}

/**
 * This gets a random connected node from the graph
 * @param {Object} g graph to add node to
 * @param {number} num node number to find adjacent node for
 * @return {object} node information for an adjacent node
 */
function getRandomNode(g, num) {
	var poss = getAdjacentNodes(g,num);
	var goTo =Math.floor( Math.random() * poss.length);
	var node = getNode(g, poss[goTo]);
	return {x:node.position.x, 
			y:node.position.y, 
			num:node.num, 
			type:node.type, 
			name:node.name};
}

/**
 * This adds a new node to the graph
 * @param {Object} g graph to add node to
 * @param {number} num node number to get the next node in the circle for
 * @return {object} node information for the next node to move to
 */
function getNextNode(g, num) {
	var next = -1;
	switch(num) {
		case 0:
			next = 18;
			break;
		case 18:
			next = 1;
			break;
		case 1:
			next = 2;
			break;
		case 2:
			next = 3;
			break;
		case 3:
			next = 4;
			break;
		case 4:
			next = 5;
			break;
		case 5:
			next = 7;
			break;
		case 7:
			next = 8;
			break;
		case 8:
			next = 9;
			break;
		case 9:
			next = 10;
			break;
		case 10:
			next = 11;
			break;
		case 11:
			next = 12;
			break;
		case 12:
			next = 13;
			break;
		case 13:
			next = 14;
			break;
		case 14:
			next = 15;
			break;
		case 15:
			next = 16;
			break;
		case 16:
			next = 17;
			break;
		case 17:
			next = 2;
			break;
	}
	var node = {x:g.nodes[next].position.x, 
				y:g.nodes[next].position.y, 
				num:g.nodes[next].num, 
				type:g.nodes[next].type, 
				name:g.nodes[next].name};
	return node;
}


