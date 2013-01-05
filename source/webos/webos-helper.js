
if (window.PalmSystem) {
	enyo.requiresWindow(function() {
		Mojo = window.Mojo || {};

		Mojo.relaunch = function() {
			var params = enyo.json.parse(PalmSystem.launchParams) || {};

			if (params['palm-command'] == 'open-app-menu') {
				enyo.Signals.send("onToggleAppMenu");
			} else {
				enyo.Signals.send("onPalmRelaunch", params);
			}
		};

		Mojo.screenOrientationChanged = function(orientation) {
			enyo.Signals.send("onPalmOrientationChange", orientation);
		};
	});
}

enyo.kind({
name:								"webOSHelper",

rendered: function()
{
	this.inherited(arguments);

	if (window.PalmSystem) {
		PalmSystem.stageReady();
	}
}

});

