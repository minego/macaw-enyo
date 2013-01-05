/*
	Source: https://github.com/webOS-ports/webos-ports-lib/tree/master/source/BackGesture.js

	Add an event listener for keyup to document to listen for the custom
	"U+1200001" key on OwOS or for the ESC key (U+001B) on other platforms and
	call onbackbutton to be compatible with PhoneGap
*/

(function() {
	document.addEventListener('keyup', function(ev) {
		if (ev.keyIdentifier == "U+1200001" || ev.keyIdentifier == "U+001B") {
			enyo.Signals && enyo.Signals.send && enyo.Signals.send('onbackbutton');
		}
	}, false);
})();
