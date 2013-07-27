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

		ignoreback:		If true then a back gesture/key or escape key will NOT
						cloase the toaster chain.

		transparent:	If true then the scrim will be invisible

		noscrim:		If true then the scrim will be disabled

		nobg:			If true then the default toaster background will not be
						used.

		notitle:		If true then the title bar and close button will be
						hidden.

		title:			If set then the title bar will contain the provided text

		alwaysshow:		If true then the toaster will not be hidden when another
						toaster is added to the chain.

		wide:			If true then the toaster will use the full screen width.

		tall:			If true then the toaster will use the full screen height.

		instant:		Disable animations
*/

enyo.kind({

name:							"toaster-chain",
classes:						"toaster-chain",

published: {
	length:						0,
	toasters:					[],

	/* May be top, right, bottom or left */
	flyInFrom:					"bottom"
},

components: [
	{
		name:					"scrim",

		classes:				"scrim enyo-fit",
		ontap:					"handleScrim"
	}
],

create: function()
{
	this.inherited(arguments);

	this.slideInFromChanged();

	if (window.android) {
		/*
			The standard scrim method uses opacity, but on android with hardware
			acceleration enabled this often causes a large black block to be
			displayed.
		*/
		this.$.scrim.addClass('image');
	} else {
		this.$.scrim.addClass('opacity');
	}
},

rendered: function()
{
	this.inherited(arguments);

	/*
		Inserting a toaster can in some cases cause the main body of the app to
		scroll to show part of the toaster before it has scrolled into view.

		This generally happens when there is an input on that toaster that has
		focus. The browser is just trying to keep a focused input visible. This
		is very annoying though, so let's try to prevent it.
	*/
	var main;

	if ((main = document.getElementById("main"))) {
		main.addEventListener('scroll', function(e) {
			main.scrollTop	= 0;
			main.scrollLeft	= 0;
		}, false);
	}
},

slideInFromChanged: function()
{
	this.removeClass('top');
	this.removeClass('bottom');
	this.removeClass('left');
	this.removeClass('right');

	this.addClass(this.flyInFrom);
},

getLength: function()
{
	return(this.toasters.length);
},

getTop: function()
{
	if (!this.toasters.length) {
		return(null);
	}

	return(this.toasters[this.toasters.length - 1]);
},

showScrim: function(visible)
{
	this.hideScrim();
	if (visible) {
		this.$.scrim.addClass('translucent');
	} else {
		this.$.scrim.addClass('transparent');
	}
},

hideScrim: function()
{
	this.$.scrim.removeClass('translucent');
	this.$.scrim.removeClass('transparent');
},

push: function(component, options)
{
	var toaster;
	var last;
	var classes	= [];

	options = options || {};

	if (this.toasters.length) {
		last = this.toasters[this.toasters.length - 1];

		if (!last.options.alwaysshow) {
			last.removeClass('show');
			last.hide();
		}
	}

	if (!options.owner) {
		options.owner = this;
	}

	if (window.android || window.PalmSystem) {
		/* Always show wide toasters on these platforms for now */
		options.wide = true;
	}

	if (options.wide) {
		classes.push('full-width');
	} else {
		classes.push('slim-width');
	}

	if (options.tall) {
		classes.push('full-height');
	}

	if (options.instant) {
		classes.push('instant');
	}

	toaster = this.createComponent({
		kind:					"toaster",

		title:					options.title,
		notitle:				options.notitle,
		type:					options.type,
		classes:				classes.join(' '),
		components:				[ component ]
	}, { owner: options.owner });

	toaster.options = options;
	toaster.render();

	this.toasters.push(toaster);

	setTimeout(enyo.bind(this, function() {
		this.showTopToaster();
	}), 10);
},

pop: function(count, backevent)
{
	var toaster;

	this.hideScrim();
	if (isNaN(count)) {
		count = 1;
	}

	if (count < 1) {
		return;
	}

	for (var i = 0; i < count; i++) {
		if (backevent && (toaster = this.toasters[this.toasters.length - 1])) {
			if (toaster.options.ignoreback) {
				break;
			}
		}

		if ((toaster = this.toasters.pop())) {
			if (i == 0) {
				/*
					Let the first one animate being closed first, and simply
					destroy the others immediately since they aren't showing
					anyway.
				*/
				toaster.removeClass('show');

				setTimeout(enyo.bind(this, function() {
					toaster.hide();
					toaster.destroy();
				}), 500);
			} else {
				toaster.destroy();
			}
		}
	}

	if (this.toasters.length) {
		this.showTopToaster();
	} else {
		this.hideScrim();
	}
},

showTopToaster: function()
{
	this.hideScrim();

	if (this.toasters.length) {
		var		toaster	= this.toasters[this.toasters.length - 1];

		if (!toaster.options.noscrim) {
			this.showScrim(!toaster.options.transparent);
		}

		toaster.show();
		toaster.addClass('show');

		if (!toaster.options.nobg) {
			toaster.addClass('bg');
		}
	}
},

handleScrim: function()
{
	var	options;

	if (this.toasters.length) {
		options = this.toasters[this.toasters.length - 1].options;
	}
	options = options || {};

	if (!options.modal) {
		this.pop(this.toasters.length);
	}
}

});

enyo.kind({

name:							"toaster",
classes:						"toaster",

events: {
	onCloseToaster:				""
},

published: {
	title:						null,
	notitle:					false
},

components: [
	{
		name:					"title",
		classes:				"title toastertitle",

		components: [{
			classes:			"back icon",
			ontap:				"back"
		}]
	}
],

create: function()
{
	this.inherited(arguments);

	if (this.title) {
		this.$.title.setContent(this.title);
	}

	if (this.notitle) {
		this.$.title.addClass('hide');
	}
},

back: function(sender, event)
{
	this.doCloseToaster();
},

/*
	Pass show and hide on to the client controls so that they have a way to know
	when the toaster is shown or hidden.
*/
show: function()
{
	this.inherited(arguments);

	var	clients = this.getClientControls();

	for (var i = 0, c; c = clients[i]; i++) {
		c.show();
	}
},

hide: function()
{
	this.inherited(arguments);

	var	clients = this.getClientControls();

	for (var i = 0, c; c = clients[i]; i++) {
		c.hide();
	}
},

/*
	The toasters aren't actually children of the kinds that create them, but
	they need to get events.
*/
getBubbleTarget: function()
{
	return this.owner || this.parent;
}

});


