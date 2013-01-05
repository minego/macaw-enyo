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

*/

// TODO	Implement a scrim to capture clicks behind the toasters
// TODO	Implement options specifying if the scrim should be shown and how it
//		should behave.

enyo.kind({

name:							"toaster-chain",
classes:						"toaster-chain",

published: {
	length:						0
},

items:							[],
components:						[],

create: function()
{
	this.inherited(arguments);
},

push: function(component, options)
{
	var toaster;

	if (this.items.length) {
		this.items[this.items.length - 1].close();
	}

	toaster = this.createComponent({
		kind:					"toaster",

		components:				[ component ]
	}, options);

	toaster.render();
	this.items.push(toaster);

	setTimeout(enyo.bind(this, function() {
		toaster.open();
	}), 50);

	this.length = this.items.length;
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
	}

	this.length = this.items.length;
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


