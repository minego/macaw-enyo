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

name:								"Confirm",

/* Show all fields in the detail toaster */
classes:							"confirm",

published: {
	title:							"Are you sure?",

	options: [
		{
			classes:				"confirm",
			command:				"confirm"
		},

		{
			classes:				"cancel",
			command:				"cancel"
		}
	]
},

handlers: {
	ontap:							"handleTap"
},

events: {
	onCloseToaster:					"",
	onChoose:						""
},

components: [
	{
		name:						"title",
		classes:					"title"
	},

	{
		classes:					"controls",
		layoutKind:					"FittableColumnsLayout",

		components: [
			{
				name:				"icons",
				fit:				true,
				classes:			"center",

				components: [
				]
			}
		]
	}
],

create: function()
{
	this.inherited(arguments);

	this.$.title.setContent(this.title);

	for (var i = 0, o; o = this.options[i]; i++) {
		var icon = this.$.icons.createComponent({
			classes:	o.classes || o.command,
			command:	o.command
		}, { owner: this });

		icon.addClass("icon");
	}
},

handleTap: function(sender, event)
{
	/* Find the real sender */
	sender = event.dispatchTarget;

	if (sender.command) {
		this.doCloseToaster();

		this.doChoose({
			command:		sender.command
		});
	}

	return(true);
}

});


