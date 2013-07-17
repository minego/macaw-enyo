/* XHR based image loader */
var xhrImages = {

cache:		{ },
loading:	{ },

/*
	Load an image with XHR, if required.

	By default this function will attempt to return the original URL if it
	appears to be valid.

	This is needed for some use cases, such as chrome packaged apps which are
	not permitted to reference an image URL that does not match the app's origin
*/
load: function(url, cb, force) {
	var chromeapp	= false;

	try {
		if (chrome.app.window) {
			chromeapp = true;
		}
	} catch(e) {
	}

	if (!chromeapp && !force) {
		/* On most platforms the existing URL is just fine */
		cb(url, true);
		return;
	}

	if (0 == url.indexOf("blob:")) {
		/* This URL has already been converted to a blob */
		cb(url, true);
		return;
	}

	if (typeof(xhrImages.cache[url]) !== "undefined") {
		/* We have a cached blob */
		cb(xhrImages.cache, true);
		return;
	}

	if (xhrImages.loading[url]) {
		/* The image has already been requested */
		xhrImages.loading[url].push(cb);
		return;
	}

	xhrImages.loading[url] = [ cb ];

	var xhr	= new XMLHttpRequest();

	xhr.open('GET', url, true);
	xhr.responseType = 'blob';

	xhr.onload = function(e) {
		if (typeof(xhrImages.cache[url]) !== "undefined") {
			console.log('Double loaded image:', url);
		}

		xhrImages.done(url, window.webkitURL.createObjectURL(xhr.response));
	};

	xhr.onerror = function(e) {
		console.log('Could not load image', url);
		xhrImages.done(url, null);
	};

	try {
		xhr.send();
	} catch (e) {
		console.log('Could not load image', url);
		xhrImages.done(url, null);
	}
},

done: function(url, blob)
{
	var		cb;

	xhrImages.cache[url] = blob;

	while ((cb = xhrImages.loading[url].shift())) {
		cb(blob, false);
	}

	delete xhrImages.loading[url];
}


};
