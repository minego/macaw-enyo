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

name:						"smart-menu",
classes:					"smart-menu",

published: {
	title:					"",
	options:				[],
	showing:				false,
	modal:					false
},

events: {
	onCloseToaster:			"",
	onSelect:				""
},

components: [
	{
		name:				"title",
		classes:			"title"
	},
	{
		name:				"menu"
	},
	{
		name:				"controls",
		classes:			"controls",
		components: [{
			content:		$L("Cancel"),
			kind:			onyx.Button,
			classes:		"menu-cancel-button",
			ontap:			"back"
		}]
	}
],

create: function() {
	this.inherited(arguments);

	this.modalChanged();
	this.titleChanged();
	this.optionsChanged();
},

modalChanged: function() {
	if (this.modal) {
		this.$.controls.hide();
	} else {
		this.$.controls.show();
	}
},

titleChanged: function()
{
	if (this.title && this.title.length > 0) {
		this.$.title.setContent(this.title || '');
		this.$.title.show();
	} else {
		this.$.title.hide();
	}
},

optionsChanged: function()
{
	this.$.menu.destroyClientControls();

	var components = [];

	for (var i = 0, option; option = this.options[i]; i++) {
		components.push({
			content:	option.content,
			kind:		onyx.Button,
			classes:	"menu-item-button menuitem",
			ontap:		"handleSelect",
			index:		i
		});
	}

	this.$.menu.createComponents(components, { owner: this });
},

back: function(sender, event)
{
	this.doCloseToaster();
},

handleSelect: function(sender, event)
{
	/* Find the real sender */
	if (event && event.dispatchTarget) {
		sender = event.dispatchTarget;
	}

	if (sender && !isNaN(sender.index)) {
		this.options[sender.index].index = sender.index;

		this.doSelect(this.options[sender.index]);
	}
}

});



/*
	Show either a native select option, or a smart-menu when that isn't
	possible, like in a webOS application.
*/
enyo.kind({

name:						"smart-select",

published: {
	title:					"",
	options:				[],
	selected:				null
},

events: {
	onOpenToaster:			"",
	onCloseToaster:			"",
	onSelect:				""
},

components: [{
	name:					"button",
	kind:					onyx.Button,
	content:				'',
	ontap:					"showOptions",

	style: [
		"width:				100%;",
		"height:			100%;"
	].join('')
}],

create: function()
{
	this.inherited(arguments);

	if (!enyo.platform.webos) {
		/*
			Create a native <select>

			The select is the same size as this element, but has opacity set to
			0, so it will get the click.
		*/
		this.createComponent({
			kind:			"Select",
			name:			"select",
			onchange:		"handleSelect",

			style:			[
				"position:	relative;",
				"top:		-100%;",
				"width:		100%;",
				"height:	100%;",
				"opacity:	0;"
			].join(''),

			components:		[]
		});
	}

	this.optionsChanged();
},

optionsChanged: function()
{
	for (var i = 0, option; option = this.options[i]; i++) {
		if (option.selected) {
			this.$.button.setContent(option.content);
			this.selectedIndex = i;
		}

		option.index = i;
	}

	/*
		If we are using a select then create the options now. If we are using a
		"smart-menu" then they will be set when it is rendered (in showOptions),
		so we don't need to do anything here.
	*/
	if (this.$.select) {
		this.$.select.destroyClientControls();
		this.$.select.createComponents(this.options);
		this.$.select.setSelected(this.selectedIndex);
		this.$.select.render();
	}
},

showOptions: function()
{
	/* If using a native select it will get the event and open */
	if (!this.$.select) {
		this.doOpenToaster({
			component: {
				kind:		"smart-menu",
				options:	this.options,
				showing:	true,
				onSelect:	"handleMenu"
			},

			options: {
				owner:		this,
				notitle:	true
			}
		});
	}
},

handleMenu: function(sender, event)
{
	this.doCloseToaster();

	this.$.button.setContent(event.content);

	this.selectedIndex = event.index;
	this.doSelect(event);
},

handleSelect: function(sender, event)
{
	var index	= sender.getSelected();

	this.$.button.setContent(this.options[index].content);

	this.selectedIndex = index;
	this.doSelect(this.options[index]);
},

setSelected: function(sel)
{
	if (isNaN(sel)) {
		for (var i = 0, option; option = this.options[i]; i++) {
			if (sel === option || sel === option.value) {
				this.selectedIndex = i;
				this.$.button.setContent(option.content);
				return;
			}
		}
	} else {
		this.selectedIndex = sel;
		if (this.options[sel]) {
			this.$.button.setContent(this.options[sel].content);
		} else {
			this.$.button.setContent('');
		}
	}
},

getSelected: function()
{
	return(this.options[this.selectedIndex]);
}

});

