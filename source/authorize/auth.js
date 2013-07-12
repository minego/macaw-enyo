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

				content:		"Enter PIN:"
			},
			{
				name:			"pin",
				classes:		"pin",

				kind:			enyo.Input,

				placeholder:	"PIN",

				defaultFocus:	true,
				selectOnFocus:	true,

				onkeyup:		"pinChanged",
				onchange:		"pinChanged"
			},
			{
				name:			"step2btn",

				kind:			onyx.Button,
				classes:		"button",

				ontap:			"step2",
				disabled:		true,

				content:		"Next"
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

				ontap:			"step3",

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
				content:		"- Did you enter the PIN correctly?"
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

restart: function()
{
	this.$.step1.hide();
	this.$.step2.hide();
	this.$.step3.hide();
	this.$.failed.hide();

	/* Cleanup */
	this.params			= null;
	this.oauth_token	= null;
	this.oauth_verifier	= null;
	this.accesstoken	= null;

	window.twitterparams = null;

	this.$.step1.show();
},

step1twitter: function(skipwindow)
{
	this.$.step1.hide();

	/*
		Open the window right away to avoid being blocked by the browser's
		popup blocker.

		The call to twitter.authorize() will return the URL that we need to open
		in the window to continue.

		This isn't needed on webOS.
	*/
	if (skipwindow !== true && !window.PalmSystem) {
		window.open("", "_auth");
	}

	this.twitter = new TwitterAPI();
	this.twitter.authorize(function(account, url)
	{
		if (url) {
			window.open(url, "_auth");
			return;
		}

		if (!account) {
			this.$.failed.show();
			return;
		}

		this.account = account;
		this.$.step3.show();
	}.bind(this), this.oauth_verifier);
},

step1adn: function(skipwindow)
{
	this.$.step1.hide();

	/*
		Open the window right away to avoid being blocked by the browser's
		popup blocker.

		The call to adn.authorize() will return the correct URL to open in the
		window to continue.

		This isn't needed on webOS.
	*/
	if (skipwindow !== true && !window.PalmSystem) {
		window.open("", "_auth");
	}

	/*
		The first step in authorizaing with ADN will replace the entire app with
		the ADN authorization page. After successful authentication the app will
		be relaunched with the user's access token.

		There is no step 2 (PIN entry) for ADN, although it may be needed on
		some platforms where the redirect back to the application can't be used.

		In those cases a page will be displayed on http://minego.net/macawadn2/
		asking the user to copy and paste the token.
	*/
	this.adn = new ADNAPI();
	this.adn.authorize(function(account, url)
	{
		if (url) {
			window.open(url, "_auth");
			return;
		}

		if (!account) {
			this.$.failed.show();
			return;
		}

		this.account = account;
		this.$.step3.show();
	}.bind(this), this.accesstoken);
},

step2: function()
{
	this.$.step2.hide();

	this.service.authorize(function(account)
	{
		if (!account) {
			this.$.failed.show();
			return;
		}

		this.account = account;
		this.$.step3.show();
	}.bind(this), this.params, this.$.pin.getValue());
},

step3: function()
{
	this.$.step3.hide();
	this.doSuccess({ account: this.account });
},

pinChanged: function()
{
	var		value = this.$.pin.getValue();

	this.$.step2btn.setDisabled(true);

	if (isNaN(value)) {
		value = parseInt(value, 10);
		this.$.pin.setValue(value);
	}

	if (!isNaN(value)) {
		this.$.step2btn.setDisabled(false);
	} else {
		this.$.pin.setValue('');
	}
}

});
