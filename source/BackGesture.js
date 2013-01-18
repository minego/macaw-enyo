/*
	Source: https://github.com/webOS-ports/webos-ports-lib/tree/master/source/BackGesture.js

	Add an event listener for keyup to document to listen for the custom
	"U+1200001" key on OwOS or for the ESC key (U+001B) on other platforms and
	call onbackbutton to be compatible with PhoneGap
*/

(function() {
	document.addEventListener('deviceready', function(e) {
		document.addEventListener('backbutton', function(e) {
			enyo.Signals && enyo.Signals.send && enyo.Signals.send('onbackbutton');

			e.preventDefault();
		}, false);
	}, false);

	document.addEventListener('keyup', function(e) {
		switch (e.keyIdentifier) {
			case "U+1200001":
			case "U+001B":
			case "Back":
				enyo.Signals && enyo.Signals.send && enyo.Signals.send('onbackbutton');
				break;
		}

		e.preventDefault();
	}, false);
})();
