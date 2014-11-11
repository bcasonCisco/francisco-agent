/*
 * Copyright (c) 2013-2014 CafeX Communications and other contributors, 
 * http://www.cafex.com

 * The above copyright notice and this permission notice shall be included in all copies
 * or substantial portions of the Software.

 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, 
 * INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A 
 * PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT 
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF 
 * CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE 
 * OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

var share = (function createShare() {
	var share = document.createElement("canvas");
	var $shareContainer = $(document.createElement("div"));
	$shareContainer.width("100%");
	$shareContainer.height("100%");
	$shareContainer.attr("id", "la-share-container");
	$shareContainer.css("overflow", "hidden");
	$shareContainer.css("position", "relative");
	
	document.getElementById("shareview").appendChild($shareContainer[0]);
	
	share.width = $shareContainer.width();
	share.height = $shareContainer.height();
	
	$shareContainer[0].appendChild(share);
	return share;
	
})();

//CISCO FIX - var customer = document.getElementById('customerview');
var documents = document.getElementById('documentsview');
var links = document.getElementById('linksview');
var push = document.getElementById('pushview');

var drawingLayer = document.getElementById('drawingview');

var drawButton = document.getElementById('drawbutton');
var controlButton = document.getElementById('controlbutton');
var clearButton = document.getElementById('clearbutton');

var draggableVideoWindow = (function createDraggableVideoWindow() {
	var videoWin = document.createElement("canvas");
	var $videoWin = $(videoWin);
	var $share = $(share);
	videoWin.zIndex = (share.zIndex || 1) + 1;
	videoWin.style.position = "absolute";
	videoWin.style.display = "none";
	$share.parent()[0].appendChild(videoWin);
	
	$videoWin.hover(function() {
		if (_self.drawing === true) {
			return;
		}
		
		videoWin.style.opacity = "0.3";
		videoWin.style.cursor = "move";
	}, function() {
		videoWin.style.opacity = "1.0";
		videoWin.style.cursor = share.style.cursor;
	});
	
	var $share = $(share);
	$videoWin.mousedown(function(e) {
		if (_self.drawing === true) {
			return;
		}
		
		var drg_h = $videoWin.outerHeight(),
		drg_w = $videoWin.outerWidth(),
		pos_y = $videoWin.offset().top + drg_h - e.pageY,
		pos_x = $videoWin.offset().left + drg_w - e.pageX;
		
		$(document).mousemove(function(e) {
			var newX = e.pageX + pos_x - drg_w,
			newY = e.pageY + pos_y - drg_h;
			
			$videoWin.offset({ top: newY, left: newX });
			
			var canvasPos = $videoWin.position();
			_self.sendMessageToConsumer("vidmove:" + canvasPos.left + "," + canvasPos.top, _self.topicSocket);

		});
		e.preventDefault();
	});
	
	$videoWin.mouseup(function() {
		$(document).off("mousemove");
	});
	
	return videoWin;
})();

var _self;

function getMousePos(canvas, evt) {
	var rect = canvas.getBoundingClientRect();
	return {
		x : evt.clientX - rect.left,
		y : evt.clientY - rect.top
	};
}

function encode(input, offset) {
		var keyStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
		var output = "";
		var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
		var i = offset;

		while (i < input.length) {
				chr1 = input[i++];
				chr2 = i < input.length ? input[i++] : Number.NaN; // Not sure if the index 
				chr3 = i < input.length ? input[i++] : Number.NaN; // checks are needed here

				enc1 = chr1 >> 2;
				enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
				enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
				enc4 = chr3 & 63;

				if (isNaN(chr2)) {
						enc3 = enc4 = 64;
				} else if (isNaN(chr3)) {
						enc4 = 64;
				}
				output += keyStr.charAt(enc1) + keyStr.charAt(enc2) +
									keyStr.charAt(enc3) + keyStr.charAt(enc4);
		}
		return output;
}

function loadBase64Image(canvas, src, x, y, width, height) {
		var img = new Image();
		
		img.src = src;
		img.onload = function() {
		var ctx = canvas.getContext('2d');

		ctx.drawImage(img, x, y, width, height);
		
		// TODO: ipad rendering code needs to be reworked
//		ctx.save();
//		ctx.translate(320, 320);
//		ctx.rotate(-90 * (Math.PI / 180));
//		ctx.translate(-240, -320);
//		ctx.drawImage(img, x * 2, y * 2, 80, 80);
//		ctx.restore();
		};

}

window.LiveAssistAgentSDK = {
	drawing: false,
	mouseDown: false,
	lastX: -1,
	lastY: 0,
	topicSocket: null,
	socketConnected: false,
	streamVersion: 1,
	universalTimeout: null,
	
	toByteArray : function(str) {
		var bytes = new Uint8Array(str.length+2);

		// limit it to 128 character strings
		var length = str.length;
		if (length > 128) {
			length = 128;
		}
		bytes[0] = _self.streamVersion;
		bytes[1] = length;
		
		for (var i = 0; i < length; ++i)
		{
				bytes[i+2] = str.charCodeAt(i);
		}
		
		return bytes;
	},
	
	sendMessageToConsumer : function(content, webSocket) {		
		// Write the commands down the web socket
		if (webSocket != null) {
			webSocket.send(_self.toByteArray(content));
		} else {
			console.log("webSocket is null!  Can't send message: " + content);
		}
	},
	
	doMouseDrag : function(event) {
		//Only support drags using the left mouse button
		if (!_self.mouseDown[0]) {
			return;
		}
		
		var mousePos = getMousePos(share, event);

		var ex = mousePos.x;
		var ey = mousePos.y;
		
		if (!_self.drawing) {
			_self.sendMessageToConsumer("dragmove:"+ex+","+ey, _self.topicSocket);
		} else {
			var ctx = drawingLayer.getContext('2d');
			ctx.beginPath();
			//FIX CISCO
			//ctx.moveTo(_self.lastX, _self.lastY+25);
			//ctx.lineTo(mousePos.x, mousePos.y+25);
			ctx.moveTo(_self.lastX, _self.lastY);
			ctx.lineTo(mousePos.x, mousePos.y);			
			ctx.closePath();

			ctx.strokeStyle = "#FF0000";
			ctx.lineWidth = 2;
			ctx.lineCap = 'round';
			ctx.lineJoin = 'round';
			ctx.stroke();

			var lx = _self.lastX;
			var ly = _self.lastY;
			
			_self.sendMessageToConsumer("draw:"+lx+","+ly+","+ex+","+ey, _self.topicSocket);
			
			_self.lastX = mousePos.x;
			_self.lastY = mousePos.y;
		}
	},
	
	doMouseDown : function(event) {
		var mousePos = getMousePos(share, event);
		
		// TODO: resolve ipad translation
//		var ex = 560 - mousePos.y;
//		var ey = mousePos.x;
//		ex /= 2;
//		ey /= 2;
		
		var ex = mousePos.x;
		var ey = mousePos.y;
		
		var button;
		if (event.which)
			button = event.which - 1;
		else if (event.button)
			button = event.button;
		else
			button = 0;  //make left button the default
		
		_self.mouseDown[button] = true;
		console.log("Set _self.mouseDown[" + button + "] to true");
		
		if (!_self.drawing) {
			_self.sendMessageToConsumer("touchdown:"+ex+","+ey+","+button, _self.topicSocket);
		} else {
			_self.lastX = mousePos.x;
			_self.lastY = mousePos.y;
		}
	},

	doMouseUp : function(event) {
		_self.lastX = -1;
		var mousePos = getMousePos(share, event);

		var ex = mousePos.x;
		var ey = mousePos.y;
		
		var button;
		if (event.which)
			button = event.which - 1;
		else if (event.button)
			button = event.button;
		else
			button = 0;  //make left button the default
		
		_self.mouseDown[button] = false;
		console.log("Set _self.mouseDown[" + button + "] to false");

		if (!_self.drawing) {
			_self.sendMessageToConsumer("touchup:"+ex+","+ey+","+button, _self.topicSocket);
		}
	},
	
	doDoubleClick : function(event) {
		_self.lastX = -1;
		var mousePos = getMousePos(share, event);
		
		var ex = mousePos.x;
		var ey = mousePos.y;
		
		if (!_self.drawing) {
			_self.sendMessageToConsumer("doubleclick:"+ex+","+ey, _self.topicSocket);
		}
	},

	docSelected : function(docUrl) {
		_self.sendMessageToConsumer("show:" + docUrl, _self.topicSocket);
		_self.shareView();
	},
	
	linkSelected : function(linkUrl) {
		_self.sendMessageToConsumer("link:" + linkUrl, _self.topicSocket);
		_self.shareView();
	},

	shareView: function() {
		document.getElementById("shareview").style.visibility = "visible";
		drawingLayer.style.visibility = "visible";

		//CISCO FIX - push.style.visibility = "hidden";
		//CISCO FIX - documents.style.visibility = "hidden";
		//CISCO FIX - customer.style.visibility = "hidden";
		//CISCO FIX - links.style.visibility = "hidden";
	},

	customerView: function() {
		document.getElementById("shareview").style.visibility = "hidden";
		drawingLayer.style.visibility = "hidden";

		push.style.visibility = "hidden";
		documents.style.visibility = "hidden";
		//CISCO FIX - customer.style.visibility = "visible";
		links.style.visibility = "hidden";
	},

	pushView: function() {
		document.getElementById("shareview").style.visibility = "hidden";
		drawingLayer.style.visibility = "hidden";

		push.style.visibility = "visible";
		documents.style.visibility = "hidden";
		//CISCO FIX - customer.style.visibility = "hidden";
		links.style.visibility = "hidden";
	},

	documentsView: function() {
		document.getElementById("shareview").style.visibility = "hidden";
		drawingLayer.style.visibility = "hidden";

		push.style.visibility = "hidden";
		documents.style.visibility = "visible";
		//CISCO FIX - customer.style.visibility = "hidden";
		links.style.visibility = "hidden";
	},
	
	linksView: function() {
		document.getElementById("shareview").style.visibility = "hidden";
		drawingLayer.style.visibility = "hidden";

		push.style.visibility = "hidden";
		documents.style.visibility = "hidden";
		//CISCO FIX - customer.style.visibility = "hidden";
		links.style.visibility = "visible";
	},
	
	drawSelected : function() {
		draggableVideoWindow.style.pointerEvents = "none";
		drawButton.style.backgroundColor = "green";
		controlButton.style.backgroundColor = "#777";
		clearButton.style.backgroundColor = "#777c";
		_self.drawing = true;
		//CISCO FIX - image location
		drawingLayer.style.cursor = "url(./images/pencil_cursor.png) 2 25, auto";
		share.style.cursor = "url(./images/pencil_cursor.png) 2 25, auto";
		//END CISCO FIX
		console.log("_self.drawing = true");
	},

	controlSelected : function() {
		draggableVideoWindow.style.pointerEvents = "auto";
		drawButton.style.backgroundColor = "#777";
		controlButton.style.backgroundColor = "green";
		clearButton.style.backgroundColor = "#777";
		_self.drawing = false;
		drawingLayer.style.cursor = null;
		share.style.cursor = null;
	},
	
	clearSelected : function() {
		_self.sendMessageToConsumer("clear:", _self.topicSocket);
		LiveAssistAgentSDK.clearLocalDrawPad();
	},
	
	clearLocalDrawPad : function() {
		var ctx = drawingLayer.getContext('2d');
		ctx.clearRect(0,0,700,700);	
	},
	
	clearShareView : function() {
		var ctx = share.getContext('2d');
		draggableVideoWindow.getContext('2d').clearRect(0,0,700,700);
		ctx.clearRect(0,0,700,700);
	},
	
	endSupport : function() {
		if (_self.socketConnected) {
			LiveAssistAgentSDK.sendMessageToConsumer("agentendsupport:", _self.topicSocket);
		
			_self.socketConnected = false;
			if (_self.topicSocket) {
				_self.topicSocket.onclose = function () {};
				_self.topicSocket.close();
			}
		}
		
		_self.inSession = false;
		$(share).parent().height("100%");
		LiveAssistAgentSDK.clearLocalDrawPad();
		LiveAssistAgentSDK.clearShareView();
	},
	
	populateDocumentsList : function() {
		console.log("Populating documents list");
		$.ajax({
			url: "/liveassist-resourcemanager/doclist",
			dataType: "json",
			success: function(data) {
				if (data == null || data.length == 0) {
					$('#documentsview').append('There are no documents available on this server.');
					return;
				}
				data.sort();  //Sort the list of docs alphabetically
				var prefix = "/documents/";
				for (var i = 0; i < data.length; i++) {
					var fullPath = '/liveassist-resourcemanager' + data[i];
					var shortPath = data[i];
					if (shortPath.substr(0, prefix.length) == prefix) {
						shortPath = shortPath.substr(prefix.length);
					}
					$('#documentsview').append('<a onclick="LiveAssistAgentSDK.docSelected(\'' + 
							fullPath + '\');">' + shortPath + '</a><br><br>');
				}
			}
		});
	},
	
	populateLinksList : function() {
		$.ajax({
			url: "/liveassist-resourcemanager/links.xml",
			dataType: "xml",
			success: function(xml) {
				$(xml).find('link').each(function() {
					var url = $(this).attr('url');
					var text = $(this).attr('text');
					console.log("link: url=" + url + ", text=" + text);
					$('#linksview').append('<a onclick="LiveAssistAgentSDK.linkSelected(\'' + url + 
							'\');">' + text + '</a><br><br>');
				});
			}
		});
	},
	
	sendAgentInfo : function() {
		if (_self.agentName != null) {
			console.log("agentName set to " + _self.agentName);
			_self.sendMessageToConsumer("agentname:" + _self.agentName, _self.topicSocket);
		} else {
			console.log("LiveAssistAgentSDK.agentName is null.");
		}
		
		if (_self.agentText != null) {
			console.log("agentText set to: " + _self.agentText);
			_self.sendMessageToConsumer("agenttext:" + _self.agentText, _self.topicSocket);
		} else {
			console.log("LiveAssistAgentSDK.agentText is null.");
		}

		if (_self.agentPictureUrl != null) {
			console.log("agentPictureUrl set to " + _self.agentPictureUrl);
			_self.sendMessageToConsumer("agentpic:" + _self.agentPictureUrl, _self.topicSocket);
		} else {
			console.log("LiveAssistAgentSDK.agentPictureUrl is null.");
		}
	},
	
	init : function(configuration) {
		_self = this;
		
		if (_self.inSession == true) {
			_self.rejectSupport(configuration.correlationId, configuration.url);
			return;
		}
		
		_self.mouseDown = [];
		_self.topic = configuration.correlationId;
		_self.inSession = true;
		
		_self.controlSelected();
		
		share.addEventListener("mousedown", LiveAssistAgentSDK.doMouseDown, false);
		share.addEventListener("mouseup", LiveAssistAgentSDK.doMouseUp, false);
		share.addEventListener("mousemove", LiveAssistAgentSDK.doMouseDrag, false);
		share.addEventListener("dblclick", LiveAssistAgentSDK.doDoubleClick, false);
		
		_self.setOnClickListeners();
		
		_self.agentName = configuration.agentName;
		_self.agentPictureUrl = configuration.agentPictureUrl;
		_self.agentText = configuration.agentText;
		
		_self.connectWebSocket(configuration);
	},
	
	setOnClickListeners : function() {		
		controlbutton.onclick = function() {
			LiveAssistAgentSDK.controlSelected();
		}

		drawbutton.onclick = function() {
			LiveAssistAgentSDK.drawSelected();
		}

		clearButton.onclick = function() {
			LiveAssistAgentSDK.clearSelected();
		}
	},
	
	getWebSocket : function(url, topicId) {
		var toUrl;
		
		if (url != null) {
			var webSocketUrlPrefix = url.replace(/^http(?=s?:)/, "ws");
			//FIX CISCO toUrl = webSocketUrlPrefix + "/liveassistserver/share?topic=" + _self.localAddress;
			toUrl = webSocketUrlPrefix + "/liveassistserver/share?topic=" + topicId;
		} else {
			var loc = window.location;
			if (loc.protocol === "https:") {
				toUrl = "wss:";
			} else {
				toUrl = "ws:";
			}
			toUrl = toUrl + "//" + loc.host + "/liveassistserver/share?topic="+topicId;
		}
		
		var webSocket = null;
		if ('WebSocket' in window) {
			webSocket = new WebSocket(toUrl);
		} else if ('MozWebSocket' in window) {
			webSocket = new MozWebSocket(toUrl);
		}
		
		if (webSocket != null) {	
			webSocket.binaryType = "arraybuffer";
		}
		return webSocket;
		
	},

	connectWebSocket : function(configuration) {
		_self.socketConnected = true;
		
		if (_self.topicSocket) {
			_self.topicSocket.onclose = function () {};
			_self.topicSocket.close();
		}
		
		_self.topicSocket = _self.getWebSocket(configuration.url, _self.topic || configuration.correlationId);
		if (_self.topicSocket == null) {
				alert('WebSocket is not supported by this browser.');
				return;
		}
		
		_self.topicSocket.onopen = function() {
			console.log(" Info: Topic Socket  connection opened.");
			_self.sentAgentDetails = false;  //reset this
			_self.sendMessageToConsumer("agentready:", _self.topicSocket);
		};
		
		_self.topicSocket.onmessage = function(event) {
			var arrayBuffer = new Uint8Array(event.data);
			var streamVersion = arrayBuffer[0];
			
			// need to align codes to either conform on numbers or strings as command words
			;(function handleStringCommand() {
				var strLength = arrayBuffer[1];
				var command = "";

				for (var i = 0; i < strLength; i++) {
					command += String.fromCharCode(arrayBuffer[i+2]);
				}
				
				var splitRegex = /^(.*?):(.*)$/;
				var match = splitRegex.exec(command);
				var type = (match !== null && match.length >= 1) ? match[1] : "";
				if (type == "noparticipants") {
					if (_self.universalTimeout == null) {
						_self.universalTimeout = setTimeout(function() {
							console.log("no participants resend agentready now");
							_self.universalTimeout = null;
							_self.sendMessageToConsumer("agentready:", _self.topicSocket);
						}, 1000);
					}
				}
			})();

			// Second byte == 0 means it is a screen replication event
			// Second byte == 1 means the client has requested to clear the annotations
			// Second byte == 2 means the consumer has ended the support session.
			// Second byte == 3 means the client is identifying the client type and screen orientation
			if (arrayBuffer[1] == 0) {
				var x = arrayBuffer[2] * 4;
				var y = arrayBuffer[3] * 4;
				var width = arrayBuffer[4] * 4;
				var height = arrayBuffer[5] * 4;

				/*if (x == 0 && y == 0) {
					var ctx = share.getContext('2d');
					ctx.clearRect(0,0,1000,1000);
				}*/
				
				// clear screen indicator
				if (width == 0 && height == 0) {
					console.log("Clear Context");
					var ctx = share.getContext('2d');
					ctx.clearRect(0,0,1000,1000);
					ctx = drawingLayer.getContext('2d');
					ctx.clearRect(0,0,1000,1000);
					draggableVideoWindow.getContext('2d').clearRect(0,0,700,700);
				}
				
				if ((width > 0) && (height > 0)) {
					var base64 = encode(arrayBuffer, 6);
					loadBase64Image(share, "data:image/png;base64," + base64, x, y, width, height)
				}
				if (!_self.sentAgentDetails) {
					_self.sendAgentInfo();
					_self.sentAgentDetails = true;
				}
			} else if (arrayBuffer[1] == 1) {
				// Request to clear the drawpad is coming from the client
				// So it must have already cleared itself.
				LiveAssistAgentSDK.clearLocalDrawPad();
			} else if (arrayBuffer[1] == 2) {
				// The agent has ended the support session
				LiveAssistAgentSDK.endSupport();
			} else if (arrayBuffer[1] == 3) {
				LiveAssistAgentSDK.clientTypeId = arrayBuffer[2];
				LiveAssistAgentSDK.clientOrientation = arrayBuffer[3];
				console.log("Received client type and orientation message.  clientTypeId = " + 
						LiveAssistAgentSDK.clientTypeId + "; clientOrientation = " + 
						LiveAssistAgentSDK.clientOrientation);
			} else if (arrayBuffer[1] == 4) {
				// This is for transfer of the video window canvas
				console.log("video window render received, rendering");
				var x = arrayBuffer[2] * 4;
				var y = arrayBuffer[3] * 4;
				var blockWidth = arrayBuffer[4] * 4;
				var blockHeight = arrayBuffer[5] * 4;
				var posXneg = arrayBuffer[6];
				var canvasX = arrayBuffer[7] * 4;
				var posYneg = arrayBuffer[8];
				var canvasY = arrayBuffer[9] * 4;
				var canvasWidth = arrayBuffer[10] * 4;
				var canvasHeight = arrayBuffer[11] * 4;
				var totalHeight = arrayBuffer[12] * 4;
				
				canvasY = (posYneg == 0) ? (canvasY * -1) : canvasY;
				canvasX = (posXneg == 0) ? (canvasX * -1) : canvasX;
				
				$(share).parent().height(totalHeight + 1);

				if (blockWidth == 0 && blockHeight == 0) {
					draggableVideoWindow.style.display = "none";
					return;
				} else {
					draggableVideoWindow.style.display = "block";
				}

				draggableVideoWindow.style.top = canvasY + "px";
				draggableVideoWindow.style.left = canvasX + "px";
				
				if (draggableVideoWindow.width != canvasWidth || draggableVideoWindow.height != canvasHeight) {
					draggableVideoWindow.width = canvasWidth;
					draggableVideoWindow.height = canvasHeight;
				}
				
				var base64 = encode(arrayBuffer, 13);
				loadBase64Image(draggableVideoWindow, "data:image/png;base64," + base64, x, y, blockWidth, blockHeight);
				
			}
		};
		_self.topicSocket.onclose = function() {
				console.log('Topic Socket Closed');
				_self.topicSocket.onclose = function () {};
				if (_self.socketConnected) {
					console.log("Reconnection of Topic Socket after 3s");
					setTimeout(function() { _self.connectWebSocket(configuration); }, 3000);
				}
		};
	},
	
	rejectSupport : function(configuration) {
		_self = this;
		console.log("rejecting support");
		var webSocket = LiveAssistAgentSDK.getWebSocket(configuration.url, configuration.correlationId);
		if (webSocket != null) {
			webSocket.onopen = function() {
				console.log("sending rejection");
				LiveAssistAgentSDK.sendMessageToConsumer("agentbusy:", webSocket);
				setTimeout(function() { webSocket.close(); }, 1000);
			};
			
			webSocket.onmessage = function() {
			
			};
		}
	},
	
	startSupport : function(configuration) {
		LiveAssistAgentSDK.init(configuration);
	}
}

LiveAssistAgentSDK.populateDocumentsList();
LiveAssistAgentSDK.populateLinksList();