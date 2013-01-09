enyo.kind({
	name: "enyo.webOS.ServiceRequest",
	kind: enyo.Async,
	resubscribeDelay: 10000,
	published: {
		service:"",
		method:"",
		subscribe: false,
		resubscribe: false
	},
	constructor: function(inParams) {
		enyo.mixin(this, inParams);
		this.inherited(arguments);
		if(enyo.webOS._serviceCounter == undefined) {
			enyo.webOS._serviceCounter = 1;
		} else {
			enyo.webOS._serviceCounter++;
		}
		this.id = enyo.webOS._serviceCounter;
	},
	go: function(inParams) {
		if(!PalmServiceBridge) {
			this.fail({
				errorCode: -1,
				errorText: "Invalid device for Palm services. PalmServiceBridge not found."
			});
			return undefined;
		}
		this.params = inParams || {};
		this.bridge = new PalmServiceBridge();
		this.bridge.onservicecallback = this.clientCallback = enyo.bind(this, "serviceCallback");
		var fullUrl = this.service;
		if(this.method.length>0) {
			if(fullUrl.charAt(fullUrl.length-1) != "/") {
				fullUrl += "/";
			}
			fullUrl += this.method;
		}
		if(this.subscribe) {
			this.params.subscribe = this.subscribe;
		}
		this.bridge.call(fullUrl, enyo.json.stringify(this.params));
		return this;
	},
	cancel: function() {
		this.cancelled = true;
		this.responders = [];
		this.errorHandlers = [];
		if(this.resubscribeJob) {
			enyo.job.stop(this.resubscribeJob);
		}
		if(this.bridge) {
			this.bridge.cancel();
			this.bridge = undefined;
		}
	},
	serviceCallback: function(respMsg) {
		var parsedMsg, error;
		if(this.cancelled) {
			return;
		}
		try {
			parsedMsg = enyo.json.parse(respMsg);
		} catch(err) {
			var error = {
				errorCode: -1,
				errorText: respMsg
			};
			this.serviceFailure(error);
			return;
		}
		if (parsedMsg.errorCode || parsedMsg.returnValue === false) {
			this.serviceFailure(parsedMsg);
		} else {
			this.serviceSuccess(parsedMsg);
		}
	},
	serviceSuccess: function(inResponse) {
		var successCallback = undefined;
		if(this.responders.length>0) {
			successCallback = this.responders[0];
		}
		this.respond(inResponse);
		if(this.subscribe && successCallback) {
			this.response(successCallback);
		}
	},
	serviceFailure: function(inError) {
		var failureCallback = undefined;
		if(this.errorHandlers.length>0) {
			failureCallback = this.errorHandlers[0];
		}
		this.fail(inError);
		if(this.resubscribe && this.subscribe) {
			if(failureCallback) {
				this.error(failureCallback);
			}
			this.resubscribeJob = this.id + "resubscribe";
			enyo.job(this.resubscribeJob, enyo.bind(this, "goAgain"), this.resubscribeDelay);
		}
	},
	resubscribeIfNeeded: function() {
		
	},
	goAgain: function() {
		this.go(this.params);
		
	},
});