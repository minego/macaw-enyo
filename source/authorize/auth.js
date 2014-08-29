/*
	Copyright (c) 2010, Micah N Gorrell
	All rights reserved.

	THIS SOFTWARE IS PROVIDED BY THE AUTHOR ``AS IS'' AND ANY EXPRESS OR IMPLIED
	WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
	MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO
	EVENT SHALL THE AUTHOR BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
	SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
	PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS;
	OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
	WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR
	OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF
	ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

enyo.kind({

name:							"authorize",
classes:						"authorize",

published: {
	servicename:				null,
	modal:						false,

	/* Used for ADN */
	accesstoken:				null,

	/* Used for Twitter */
	oauth_token:				null,
	oauth_verifier:				null
},

events: {
	onCancel:					"",
	onSuccess:					""
},

components: [
	{
		kind:					"smart-menu",
		name:					"step1",
		classes:				"step step1",
		title:					$L("Select an account type"),
		options: [{
			content:			$L("Twitter"),
			nextstep:			"step1twitter"
		}, {
			content:			$L("app.net"),
			nextstep:			"step1adn"
		}],
		showing:				true,
		onSelect:				"selectStep"
	},
	{
		name:					"step2",
		classes:				"step step2",
		showing:				false,

		kind:					"smart-menu",
		title:					$L("Waiting for authorization"),
		options:				[],
		modal:					true
	},
	{
		name:					"step3",
		classes:				"step step3",
		showing:				false,

		kind:					"smart-menu",
		title:					$L("Your new account has been successfully authorized for use in Macaw!"),
		cancelLabel:			$L("Done"),
		options:				[],
		onCancel:				"step3done",
		modal:					false
	},
	{
		name:					"failed",
		classes:				"step failed",
		showing:				false,

		kind:					"smart-menu",
		title: [
			$L("Account authorization failed. Please verify the following:"),
			"<br/>- " + $L("Is your clock correct?"),
			"<br/>- " + $L("Did you enter the correct credentials?")
		].join('\n'),
		cancelLabel:			$L("Restart"),
		options:				[],
		onCancel:				"restart",
		modal:					false
	}
],

create: function()
{
	this.inherited(arguments);

	if (this.modal) {
		this.$.step1.setModal(true);
	}

	switch (this.servicename) {
		case 'adn':
		case 'twitter':
			/* Move on to step 2 */
			this.step1(true, this.servicename);
			break;

		default:
			/* The first question asks the service type */
			break;
	}
},

destroy: function()
{
	this.restart();
	this.inherited(arguments);
},

restart: function()
{
	this.$.step1.hide();
	this.$.step3.hide();
	this.$.failed.hide();

	/* Cleanup */
	this.params			= null;
	this.oauth_token	= null;
	this.oauth_verifier	= null;
	this.accesstoken	= null;
	this.account		= null;

	window.twitterparams = null;

	if (this.readyloop) {
		clearTimeout(this.readyloop);
	}

	this.$.step1.show();
},

ready: function(win)
{
	var w;

	if (typeof(win) === "string") {
		w = document.getElementById(win);

		if (w) {
			w = w.contentWindow;
		}
	} else {
		w = win;
	}

	if (this.readyloop) {
		clearTimeout(this.readyloop);
	}

	if (w) w.postMessage({ name: "authready" }, "*");

	this.readyloop = setTimeout(function()
	{
		this.ready(win);
	}.bind(this), 1000);
},

step1twitter: function(skipwindow)
{
	this.step1(skipwindow, 'twitter');
},

step1adn: function(skipwindow)
{
	this.step1(skipwindow, 'adn');
},

step1: function(skipwindow, servicename)
{
	var arg;
	var chromeapp	= false;

	try {
		if (chrome.app.window) {
			chromeapp = true;
		}
	} catch(e) {
	}

	this.$.step1.hide();

	/*
		Open the window right away to avoid being blocked by the browser's
		popup blocker.

		The call to twitter.authorize() will return the URL that we need to open
		in the window to continue.

		This isn't needed on webOS, BB10, or in a chrome app.
	*/
	if (!chromeapp && skipwindow !== true &&
		!enyo.platform.webos &&
		!enyo.platform.blackberry
	) {
		window.open("", "_auth");
	}

	switch (servicename) {
		case "twitter":
			this.service = new TwitterAPI();
			arg = this.oauth_verifier;
			break;

		case "adn":
			this.service = new ADNAPI();
			arg = this.accesstoken;
			break;
	}

	this.service.authorize(function(account, url)
	{
		if (url) {
			if (!chromeapp) {
				this.ready(window.open(url, "_auth"));
			} else {
				this.$.step2.destroyClientControls();
				this.$.step2.createComponent({
					allowHtml: true,
					content: [
						'<webview',
							'id="authwebview"',
							'src="' + url + '"',
							'style="width: 100%; height: 100%;"',
						'></webview>'
					].join('\n')
				}, { owner: this });
				this.$.step2.render();

				this.ready('authwebview');
			}
			this.$.step2.show();
			return;
		}

		this.$.step2.hide();

		if (account) {
			this.account = account;
			this.$.step3.show();
			return;
		}

		if (!this.account) {
			this.$.failed.show();
		}
	}.bind(this), arg);
},

step3done: function()
{
	/* Done */
	this.$.step3.hide();
	this.doSuccess({ account: this.account, service: this.service });
},

selectStep: function(sender, event)
{
	var cmd;
	var arg;

	if (event && event.nextstep && this[event.nextstep]) {
		this[event.nextstep]();
	}
}

});
