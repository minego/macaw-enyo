/**
	A button control for installing webapps that hides (or turns into an update button)
	onces the web app is installed or on unsupported browsers.
*/

enyo.kind({
	name: "onyx.WebAppButton",
	kind: "onyx.Button",
	//* Label for the button when it will install the webapp
	installLabel: "Install",
	//* Label for the button when it will update the webapp
	updateLabel: "Update",
	//* Optionally specify the url of the webapp to install
	webAppUrl: undefined,
	/**
		If true, once installed, the button will turn into an update button, staying visible.
		Otherwise it hides button once installed.
	*/
	alwaysShow: false,
	events: {
		//* Event triggered when the install succeeded
		onInstallSuccess: "",
		//* Event triggered when the install encountered an error
		onInstallError: ""
	},
	//* @protected
    	handlers: {
		ontap:"install"
	},
	showing: false,
	checked: false,
	rendered: function() {
		this.inherited(arguments);
		if(!this.checked) {
			this.checked = true;
			enyo.WebAppInstaller.check(enyo.bind(this, function(response) {
				if(response.type!="unsupported") {
					this.setShowing(!response.installed || this.alwaysShow);
					this.setContent(((!response.installed) ? this.installLabel : this.updateLabel));
				}
			}));
		}
	},
	//* @public
	//* Installs the webapp. Automatically called when the button is pressed.
	install: function() {
		enyo.WebAppInstaller.install(enyo.bind(this, function(response) {
			if(!this.alwaysShow) {
				this.hide();
			}
			this.setContent(this.updateLabel);
			this.doInstallSuccess(response);
		}), enyo.bind(this, function(err) {
			this.doInstallError(err);
		}));
	}
});
