/**
	Unified web app installation Enyo library for Firefox, Firefox for Android,
	FirefoxOS, Chrome, and iOS.

	Inspired by the installation library in Mozilla's mortar app stub.
*/

enyo.WebAppInstaller = {
	/**
		Checks to see if the webapp is installed or not.

		onResponse is callback with passes on object containing the properties
		_"type"_ (_"mozilla"_, _"chromeStore"_, _"ios"_, or _"unsupported"_) and _"installed"_
		(_true_ or _false_).
	*/
	check: function(onResponse) {
		var results = {type:"unsupported", installed:false};
		if(navigator.mozApps) {
			var request = navigator.mozApps.getSelf();
			request.onsuccess = function (response) {
				results.type = "mozilla";
				results.installed = (request.result) ? true : false;
				onResponse(results);
			};
			request.onerror = function(err) {
				enyo.error("Error checking Mozilla app status");
				onResponse(results);
			};
		} else if(typeof chrome !== 'undefined' && chrome.webstore && chrome.app) {
			results.type = "chromeStore";
			results.installed = (chrome.app.isInstalled) ? true : false;
			onResponse(results);
		} else if(typeof window.navigator.standalone !== "undefined") {
			results.type = "ios";
			results.installed = (window.navigator.standalone) ? true : false;
			onResponse(results);
		} else {
			onResponse(results);
		}
	},
	/**
		Installs a web app. Supports Mozilla apps, Chrome apps, and iOS (in the
		form of a prompt to add to home screen).

		The URL parameter is optional

		For Chrome apps, if no url is specified, the "chrome-webstore-item" link tag is used
		See [https://developers.google.com/chrome/web-store/docs/inline_installation](https://developers.google.com/chrome/web-store/docs/inline_installation)

		For Mozilla apps, if no url is specified, the current page URL + "/manifest.webapp"
		For manifest content details, see [https://developer.mozilla.org/en-US/docs/Apps/Manifest](https://developer.mozilla.org/en-US/docs/Apps/Manifest)
	*/
	install: function(url, onSuccess, onError) {
		if(arguments.length==2) { //no url specified
			onError = onSuccess || undefined;
			onSuccess = url || undefined;
			url = undefined;
		}
		if(navigator.mozApps) {
			if(!url) {
				var index = window.location.href.lastIndexOf("/");
				if(index > window.location.href.indexOf("://")+2) {
					url = window.location.href.substring(0, index+1) + "manifest.webapp";
				} else {
					url = window.location.href + "/manifest.webapp";
				}
			}
			var installRequest = navigator.mozApps.install(url);
			installRequest.onsuccess = onSuccess;
			installRequest.onerror = onError;
		} else if(typeof chrome !== 'undefined' && chrome.webstore && chrome.app) {
			chrome.webstore.install(url, onSuccess, onError);
		} else if(enyo.platform.ios) {
			alert("To install, press the share button in Safari and tap \"Add to Home Screen\"");
		}
	}
};

