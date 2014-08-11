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

name:												"optionsmenu",
classes:											"options",

events: {
	onCloseToaster:									"",
	onOpenToaster:									"",
	onCreateAccount:								"",
	onOptionsChanged:								""
},

components: [
	{
		kind:										"smart-menu",
		title:										$L("Preferences"),
		items:										[ $L("Appearance"), $L("Timeline"), $L("Columns"), $L("Accounts") ],
		showing:									true,
		onSelect:									"showSection"
	}
],

create: function()
{
	this.inherited(arguments);

	if (this.$.panel && this.$.panel.data) {
		this.renderPanel(this.$.panel);
	}
},

destroy: function()
{
},

showSection: function(sender, event)
{
	/* Find the real sender */
	if (event && event.dispatchTarget) {
		sender = event.dispatchTarget;
	}

	var title	= null;
	var cmd		= null;
	var index	= sender.index || event.index;

	switch (index) {
		case 0:	cmd = 'UI';			title = $L('Appearance');	break;
		case 1:	cmd = 'Timeline';	title = $L('Timeline');		break;
		case 2:	cmd = 'Columns';	title = $L('Columns');		break;
		case 3:	cmd = 'Accounts';	title = $L('Accounts');		break;
	}
	if (!cmd) {
		return;
	}

	this.doOpenToaster({
		component: {
			kind:				"options" + cmd,
			onCreateAccount:	"createAccount",
			onOptionsChanged:	"optionsChanged"
		},

		options: {
			title:				title
		}
	});
},

renderPanel: function(panel)
{
	if (!panel || !panel.data) {
		return;
	}

	panel.addClass("tabdetails");

	panel.createComponent({
		content:				panel.data.title || ' ',
		classes:				"title"
	}, { owner: this } );

	for (var i = 0, item; item = panel.data.items[i]; i++) {
		var components	= [];
		var value		= item.key ? prefs.get(item.key) : null;

		if (!item.ontap) {
			components.push({
				content:			item.label || '',
				classes:			"label"
			});
		}

		if (item.options) {
			var options = [];

			for (var o = 0, option; option = item.options[o]; o++) {
				options.push({
					name:			item.key + '_' + option.value,

					content:		option.label || option.value,
					value:			option.value || option.label,
					active:			(value == option.value)
				});
			}

			components.push({
				classes:		"value",
				kind:			onyx.PickerDecorator,

				components: [{
					classes:	"button"
				}, {
					name:		item.key,
					key:		item.key,

					kind:		"onyx.Picker",
					components:	options,
					onSelect:	"itemSelected"
				}]
			});
		} else if (item.key) {
			components.push({
				name:			item.key,
				item:			item,

				classes:		"value",
				kind:			onyx.ToggleButton,
				value:			item.negate ? !value : value,

				onChange:		"toggleChanged",

				onContent:		item.onContent  || $L("On"),
				offContent:		item.offContent || $L("Off")
			});
		} else if (item.ontap) {
			components.push({
				content:				item.label || '',
				kind:					onyx.Button,
				style:					"width: 100%;",
				ontap:					item.ontap
			});
		}

		panel.createComponent({
			classes:	"option",
			components:	components
		}, { owner: this });
	}
},

itemSelected: function(sender, event)
{
	var key		= sender.key;
	var value	= event.selected.value;

	switch (key) {
		case "toolbar":
		case "tabs":
			var k, v;

			if (key == "toolbar") {
				k = 'tabs';
			} else {
				k = 'toolbar';
			}

			v = this.$[k].getSelected().value;

			/* Only one of these may have a value of top, or bottom */
			if (v === value && value != "hidden") {
				var k, v;

				if (v == "top") {
					v = "bottom";
				} else {
					v = "top";
				}

				this.$[k].setSelected(this.$[k + '_' + v]);
				prefs.set(k, v);
			}

			prefs.set(key, value);
			break;

		default:
			prefs.set(key, value);
			break;
	}

	this.doOptionsChanged({});
	return(true);
},

toggleChanged: function(sender, event)
{
	prefs.set(sender.item.key, sender.item.negate ? !sender.getValue() : sender.getValue());
	return(true);
},

createAccount: function(sender, event)
{
	/* The main kind knows how to do this, so just send an event */
	this.doCreateAccount({});
},

optionsChanged: function(sender, event)
{
	this.doOptionsChanged({});
}

});
