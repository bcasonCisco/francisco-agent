//Agent
//Need to sort out how to set customer ID for agent side differently than customer side
var demoConfig = {fcsdkWebappid:"FUSIONCSDK-A8C1D", ucceCall:true, fcsdkSipDomain:"moalab-pod4-ucc.com", agent:"60010",customer:"1004",fcsdkSessionApi:"http://10.122.23.204:8080/gateway/sessions/session" };
var gwUrl  = demoConfig.fcsdkSessionApi;
var user   = demoConfig.customer;
var pass   = demoConfig.customer;
var romote = demoConfig.agent;
var ucceCall = demoConfig.ucceCall;
var customerToAgent;
var agentToCustomer;
var aedConnected = 0;
var remoteVideo = null;
var topicCustomer = null;

var correlationId = 0;

var iosApp = navigator.userAgent.indexOf('MobileAdvisorGenericDemo') != -1;


$(document).ready(function() {
	
	//Adding Query String Pickup for Finessse Integrated Gadget
	var QueryString = function () {
		  // This function is anonymous, is executed immediately and
		  // the return value is assigned to QueryString!
		  var query_string = {};
		  var query = window.location.search.substring(1);
		  var vars = query.split("&");
		  for (var i=0;i<vars.length;i++) {
			var pair = vars[i].split("=");
				// If first entry with this name
			if (typeof query_string[pair[0]] === "undefined") {
			  query_string[pair[0]] = pair[1];
				// If second entry with this name
			} else if (typeof query_string[pair[0]] === "string") {
			  var arr = [ query_string[pair[0]], pair[1] ];
			  query_string[pair[0]] = arr;
				// If third or later entry with this name
			} else {
			  query_string[pair[0]].push(pair[1]);
			}
		  }
			return query_string;
		} ();
	
	function stringToBoolean(string){
		switch(string.toLowerCase()){
			case "true": case "yes": case "1": return true;
			case "false": case "no": case "0": case null: return false;
			default: return Boolean(string);
		}
	}
	
	if (QueryString.correlationId)
	{
		
		correlationId = QueryString.correlationId;
		topicCustomer = correlationId;
	}
	
	//--- Get session ID ---//
	var getSessionRequest = 
	{
		    "timeout": 1,
		    "webAppId": demoConfig.fcsdkWebappid,
			"allowedOrigins":null,
		    "voice": {
		        "username": 1005,
		        "domain": demoConfig.fcsdkSipDomain,
		        "inboundCallingEnabled": true,
		        "auth": {
		            "username": user,
		            "password": pass,
		            "realm": demoConfig.fcsdkSipDomain
		        }
		    },
			"aed":{
				"accessibleSessionIdRegex":".*",
				"maxMessageAndUploadSize":"5000",
				"dataAllowance":"5000"
			},
		    "urlSchemeDetails":{
		    	"secure":false,
		    	"host":"10.122.23.204",
		    	"port":8080
		    },
	};
		$.ajax({
			  type: "POST",
			  url: gwUrl,
			  accepts : "application/json",
			  dataType: "json",
			  contentType: "application/json; charset=utf-8",
			  data: JSON.stringify(getSessionRequest),
			  success: function(data) {
				  initWebRTC(data.sessionid);
				},
			  
			});
});
	//---End Get session ID ---//
	
	function initWebRTC(sessionId) {
	
		UC.onInitialised = function() {
			console.log('onInitialised called');
			//create AED topic (or connect)
			agentToCustomer = UC.aed.createTopic("from.agent"+"."+topicCustomer);
			customerToAgent = UC.aed.createTopic("from.customer"+"."+topicCustomer);
			
			customerToAgent.onConnectSuccess = function(data) {
				console.log("customerToAgent.onConnectSuccess");
				//now I know topic is connected
				
				aedConnected = aedConnected | 1;
			};
			agentToCustomer.onConnectSuccess = function(data) {
				aedConnected = aedConnected | 2;
				console.log("agentToCustomer.onConnectSuccess");
				if (ucceCall = true)
				{
					agentToCustomer.sendMessage("confirmed startSession");
					enterSession();
				}

			};
			agentToCustomer.onMessageReceived = function(msg) {
				console.log("xxx onMessageReceived " + msg);
			};
			customerToAgent.onMessageReceived = function(msg) {
				console.log("xx sonMessageReceived " + msg);
				if (msg.indexOf("chat:") == 0) {
					addRemoteChatMessage(msg.substring(5));
				}
				else {
					switch (msg) {
						case "startSession":
							var answer = confirm("Start session with customer?");
								if (answer){
									agentToCustomer.sendMessage("confirmed startSession");
									enterSession();
								}
								else{
									agentToCustomer.sendMessage("did not confirm startSession");	
								}
							break;
						case "shareRequestFromCustomer":
							enterInSharingUI();
							break;
						case "confirmed Sharing":
							enterInSharingUI();
							break;
						case "did not confirm Sharing":
							 alert("Customer did not confirm Sharing ");
							break;
						case "endSeesion":
							leaveSession();
							break;
						case "endLiveAssistSession":
							liveAssistEndSupport(true);
							break;
					}
				}
			};
			
			customerToAgent.connect();
			agentToCustomer.connect();
		};
		
		UC.onInitialisedFailed = function() {
			console.log('onInitialisedFailed called');
		};
		
		var stunServers = [];
		UC.start(sessionId, stunServers);
		
		if(uccCall = false)
		{	
			UC.phone.onLocalMediaStream = function(m) {
			document.getElementById('local').src = window.webkitURL.createObjectURL(m);
			};

		UC.phone.onRemoteMediaStream = function(m) {
			console.log('remote');
			document.getElementById('remote').src = window.webkitURL.createObjectURL(m);
			};
	
		UC.phone.onIncomingCall = function(newcall) {
			
			newcall.onRemoteMediaStream = function(remoteMediaStream) {
					console.log('remoteMediaStream');
					document.getElementById('remote').src = window.webkitURL.createObjectURL(remoteMediaStream);
			};
			newcall.onEnded = function() {
				leaveInCallUI();
			};
			newcall.answer();	//auto answer
			
			$('#answer').text("Answer - " + newcall.getRemotePartyDisplayName() + "("  + newcall.getRemoteAddress() + " )");
			$('#answer').show();
			enterInCallUI(newcall);
			};
		}
		liveAssistStartListen();
	}
	
	function enterInSharingUI() {
		$(".centerSharingBoxRequest" ).hide();
		$(".la-terminate-icon").show();
		$(".liveAssistActionBar").show();
	}
	
	function leaveInSharingUI() {
		$(".centerSharingBoxRequest" ).show();
		$(".la-terminate-icon").hide();
		$(".liveAssistActionBar").hide();
	}
	
	function enterInCallUI(call) {
		$(".call-terminate-icon").off();
		$(".call-terminate-icon").click(function() {
			call.end();
			leaveInCallUI();
		});
		$(".videoRequest").hide();
		$(".videoViews").show();
	}
	
	function leaveInCallUI() {
		$(".videoViews").hide();
		$(".videoRequest").show();
	}
	
	function liveAssistStartListen() {
		LiveAssistAgentSDK.startSupport({ 
			agentName : 'Agent', 
			agentPictureUrl : demoConfig.laUrl + "/liveassistserver/img/avatar.png",
			autoanswer : false ,
			correlationId : 'abcd',
			password : 'none',
			username : 'agent1',
			url: demoConfig.laUrl,			
		});
		$(".la-terminate-icon").off();
		$(".la-terminate-icon").click(function() {
			liveAssistEndSupport(false);
		});
	}

	function liveAssistEndSupport(remote) {
		if (!remote) {
			LiveAssistAgentSDK.endSupport();
			sendEndLiveAssistSession();
		}
		leaveInSharingUI();
		liveAssistStartListen();
	}
	
	//end call
//	function endCall() {
//		var call = UC.phone.getCalls()[0];
//		if (call != null)
//		{
//			UC.phone.getCalls()[0].end();
//			document.getElementById('remote').src = "";
//		}
//	}
	//App Event Distribution (AED) functions
	
	// if aed connected
	function isAedConnected()
	{
		if (aedConnected == 3)
			return true;
		else
			return false;	
	}
	
	function sendChatMessage() {
		var txt = $(".chatInput").val();
		if (txt != '') {
			agentToCustomer.sendMessage("chat:" + txt);
			$(".chatInput").val('');
			addLocalChatMessage(txt);
		}
	}
	
	function sendShareRequest()
	{
		agentToCustomer.sendMessage("shareRequestFromAgent");
	}
	function sendEndLiveAssistSession()
	{
		agentToCustomer.sendMessage("endLiveAssistSession");
	}
	function sendStartVideoCallRequest()
	{
		agentToCustomer.sendMessage("startVideoCallFromAgent");
	}
	function endSession()
	{
		agentToCustomer.sendMessage("endSession");
		leaveSession(); 
		liveAssistEndSupport(false);
	}
	function enterSession()
	{
		$(".chat-msgs-container").children().filter(":not(.persistent-msg)").remove();
		$(".display-in-session").show();
		$(".display-out-of-session").hide();
		navigate();
	}
	
	function leaveSession()
	{
		$("#controlbutton").click();
		$(".display-in-session").hide();
		$(".display-out-of-session").show();
	}
	
	
	function addLocalChatMessage(msg) {
		var elem = $("<div class='senderMsgContainer' align='right'><p class='senderName'>Brad</p><p class='senderMsg'>&nbsp;</p></div>");
		elem.find(".senderMsg").text(msg);
		$(".chat-msgs-container").append(elem);
		$(".chat-msgs-container").scrollTop($(".chat-msgs-container").prop("scrollHeight"));
	}
	
	function addRemoteChatMessage(msg) {
		var elem1 = $("<p class='recieverName'>John</p>");
		var elem2 = $("<p class='recieverMsg'></p>");
		elem2.text(msg);
		$(".chat-msgs-container").append(elem1);
		$(".chat-msgs-container").append(elem2);
		$(".chat-msgs-container").scrollTop($(".chat-msgs-container").prop("scrollHeight"));
	}
	
	function navigate(el) {
		if (!el) {
			el = $("#screenshare-tab")[0];
		}
		
	 	$(".selected-tab").removeClass('selected-tab');
	 	$('.tab-content').hide();
	 	$(el).addClass("selected-tab");
	 	var id = el.id.substr(0, el.id.indexOf("-")) + '-content';
	 	$("#" + id).show();
	 	
	 	//LiveAssistAgentSDK.shareView();
	}	
	
