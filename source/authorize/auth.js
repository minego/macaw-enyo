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
		name:					"step1",
		classes:				"step step1",

		components: [
			{
				classes:		"instructions",

				content: [
					"Account authorization"
				].join(' ')
			},
			{
				classes:		"instructions",

				content:		"Select an account type"
			},
			{
				kind:			onyx.Button,
				classes:		"button",

				ontap:			"step1twitter",

				content:		"Twitter"
			},
			{
				kind:			onyx.Button,
				classes:		"button",

				ontap:			"step1adn",

				content:		"app.net"
			}
		]
	},

	{
		name:					"step2",
		classes:				"step step2",
		showing:				false,

		components: [
			{
				classes:		"instructions",

				content: [
					"Waiting for authorization"
				].join(' ')
			}
		]
	},

	{
		name:					"step3",
		classes:				"step step3",
		showing:				false,

		components: [
			{
				classes:		"instructions",

				content: [
					"Your new account has been successfully authorized for use",
					"in Macaw!"
				].join(' ')
			},
			{
				kind:			onyx.Button,
				classes:		"button",

				ontap:			"step3done",

				content:		"Done"
			}
		]
	},

	{
		name:					"failed",
		classes:				"step failed",
		showing:				false,

		components: [
			{
				classes:		"instructions",

				content: [
					"Account authorization failed. Please verify the",
					"following:"
				].join(' ')
			},
			{
				content:		"- Is your clock correct?"
			},
			{
				content:		"- Did you enter the correct credentials?"
			},
			{
				kind:			onyx.Button,
				classes:		"button",

				ontap:			"restart",
				content:		"Restart"
			}
		]
	}
],

create: function()
{
	this.inherited(arguments);

	switch (this.servicename) {
		case 'adn':
			/* Move on to step 2 */
			this.step1adn(true);
			break;

		case 'twitter':
			/* Move on to step 2 */
			this.step1twitter(true);
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
	this.doSuccess({ account: this.account });
}

});
