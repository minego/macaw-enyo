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

name:									"Preview",
classes:								"preview",

published: {
	src:								null,	/* The preview image src */
	url:								null	/* The original url in the tweet */
},

handlers: {
	ontap:								"handleCommand"
},

events: {
	onOpenToaster:						"",
	onCloseToaster:						""
},

components: [
	{
		name:							"image",
		classes:						"image",
		kind:							enyo.ImageView
	},

	{
		name:							"controls",
		classes:						"controls",
		layoutKind:						"FittableColumnsLayout",

		components: [
			{
				classes:				"options icon",
				command:				"options"
			},

			{
				fit:					true,
				classes:				"center"
			},

			{
				classes:				"back icon",
				command:				"back"
			}
		]
	}
],

rendered: function()
{
	this.inherited(arguments);
},

create: function()
{
	this.inherited(arguments);

	if (this.src) {
		this.srcChanged();
	}
},

destroy: function()
{
	this.inherited(arguments);
},

srcChanged: function()
{
	xhrImages.load(this.src, function(url, inline) {
		this.$.image.setSrc(url);
	}.bind(this));
},

handleCommand: function(sender, event)
{
	var cmd;

	if (event && event.value) {
		/* Handle the menu event */
		cmd = event.value;

		/* Close the menu toaster */
		this.doCloseToaster();
	} else {
		/* Find the real sender */
		if (event && event.dispatchTarget) {
			sender = event.dispatchTarget;
		}

		cmd = sender.command || event.command;
	}

	if (!cmd) {
		return(true);
	}

	switch (cmd) {
		case "back":
			this.doCloseToaster();
			break;

		case "options":
			// TODO	Add more options, like share etc
			this.doOpenToaster({
				component: {
					kind:					"smart-menu",
					items:					[ $L("Open in browser") ],
					values:					[ "open" ],
					showing:				true,
					onSelect:				"handleCommand"
				},

				options: {
					owner:					this,
					notitle:				true
				}
			});
			break;

		case "open":
			window.open(this.src, "_blank");
			break;
	}

	return(true);
}

});


