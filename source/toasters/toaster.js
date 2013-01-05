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

/*
	These kinds are used to manage a toaster chain. The toasters can be any
	components. As they are added they slide in from the bottom of the screen.

	Any number of toasters may be created, and only the last will be visible.
	Toasters may be popped off the chain to reveal the previous toaster.

	Example:
		A toaster chain should be created in the root of the application:

		{
			name:				"toasters",
			kind:				"toaster-chain"
		}

		Toasters may then be added by making a call like:
			this.$.toasters.push({
				content:		"This is a toaster",
				ontap:			"toastertap"
			}, { owner: this });

		Toasters may be removed by making a call like:
			this.$.toasters.pop();

		All toasters may be removed at once by calling:
			this.$.toasters.pop(this.$.toasters.length);


	The following options may be included when pushing a toaster:
		owner:			The object that should own the created component.

		modal:			If true then tapping on the scrim will NOT close the
						toaster chain.

		transparent:	If true then the scrim will be invisible

		noscrim:		If true then the scrim will be disabled
*/

enyo.kind({

name:							"toaster-chain",
classes:						"toaster-chain",

published: {
	length:						0
},

items:							[],
components: [
	{
		kind:					onyx.Scrim,
		name:					"scrim",

		classes:				"onyx-scrim-translucent",
		// classes:				"onyx-scrim-transparent",

		ontap:					"handleScrim"
	},
	{
		kind:					enyo.Signals,
		onbackbutton:			"pop"
	}
],

create: function()
{
	this.inherited(arguments);
},

push: function(component, options)
{
	var toaster;

	options = options || {};

	if (this.items.length) {
		this.items[this.items.length - 1].close();
	}

	toaster = this.createComponent({
		kind:					"toaster",

		components:				[ component ]
	}, { owner: options.owner || this });

	toaster.options = options;
	toaster.render();

	this.items.push(toaster);

	setTimeout(enyo.bind(this, function() {
		this.showTopToaster();
	}), 10);
},

pop: function(count)
{
	var toaster;

	if (isNaN(count)) {
		count = 1;
	}

	if (count < 1) {
		return;
	}

	for (var i = 0; i < count; i++) {
		if ((toaster = this.items.pop())) {
			if (i == 0) {
				/*
					Let the first one animate being closed first, and simply
					destroy the others immediately since they aren't showing
					anyway.
				*/
				toaster.close();

				setTimeout(enyo.bind(this, function() {
					toaster.destroy();
				}), 500);
			} else {
				toaster.destroy();
			}
		}
	}

	if (this.items.length) {
		this.items[this.items.length - 1].open();
	} else {
		/* The toaster's ZIndex is 300 */
		this.$.scrim.hideAtZIndex(299);
	}

	this.length = this.items.length;
},

showTopToaster: function()
{
	/* The toaster's ZIndex is 300 */
	if (this.items.length) {
		var		toaster	= this.items[this.items.length - 1];

		if (toaster.options.noscrim) {
			this.$.scrim.hideAtZIndex(299);
		} else {
			if (toaster.options.transparent) {
				this.$.scrim.setClasses("onyx-scrim-transparent");
			} else {
				this.$.scrim.setClasses("onyx-scrim-translucent");
			}

			this.$.scrim.showAtZIndex(299);
		}

		toaster.open();
	} else {
		this.$.scrim.hideAtZIndex(299);
	}

	this.length = this.items.length;
},

handleScrim: function()
{
	var	options;

	if (this.items.length) {
		options = this.items[this.items.length - 1].options;
	}
	options = options || {};

	if (!options.modal) {
		this.pop(this.length);
	}
}

});

enyo.kind({

name:							"toaster",
classes:						"toaster",

create: function()
{
	this.inherited(arguments);
},

open: function()
{
	this.addClass('show');
},

close: function()
{
	this.removeClass('show');
}

});


