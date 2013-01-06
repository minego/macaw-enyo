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
					"Before you can use your twitter account with Macaw you",
					"need to authorize it using twitter's website."
				].join(' ')
			},
			{
				classes:		"instructions",

				content:		"Tap the button below to continue."
			},
			{
				kind:			onyx.Button,
				classes:		"button",

				ontap:			"step1",

				content:		"Authorize Account"
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

	this.twitter = new TwitterAPI();
},

restart: function()
{
	this.$.step1.hide();
	this.$.step2.hide();
	this.$.step3.hide();
	this.$.failed.hide();

	this.$.step1.show();
},

step1: function()
{
	this.$.step1.hide();

	/*
		Open the window right away to avoid being blocked by the browser's
		popup blocker.

		The call to twitter.authorize() will open the correct URL in the same
		window that we just opened.

		This isn't needed on webOS.
	*/
	if (!window.PalmSystem) {
		window.open("", "_auth");
	}

	this.twitter.authorize(function(params)
	{
		if (!params) {
			this.$.failed.show();
			return;
		}

		this.$.step2.show();

		/* Save the params, they are needed to complete the authorization */
		this.params = params;
	}.bind(this));
},

step2: function()
{
	this.$.step2.hide();

	this.twitter.authorize(function(account)
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

	value = parseInt(value, 10);

	if (!isNaN(value)) {
		this.$.pin.setValue(value);
		this.$.step2btn.setDisabled(false);
	} else {
		this.$.pin.setValue('');
	}
}

});
