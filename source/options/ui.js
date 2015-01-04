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

name:															"optionsUI",
kind:															"optionsmenu",
classes:														"ui",

events: {
	onCloseToaster:												"",
	onOpenToaster:												"",
	onOptionsChanged:											""
},

components: [
	{
		kind:													enyo.Scroller,
		name:													"scroller",
		components: [
			{
				classes:										"panel",
				components: [
					{
						content:								"Theme",
						classes:								"label"
					}, {
						kind:									"smart-select",
						classes:								"value button",
						name:									"themetype",
						onSelect:								"themeTypeChanged",
						options: [
							{ content: $L("Original"),			value: "original"	},
							{ content: $L("Firefox OS"),		value: "ffos"		},
							{ content: $L("Material"),			value: "material"	},
							{ content: $L("Holo"),				value: "holo"		}
						]
					}, {
						tag:									"br"
					}, {
						content:								"",
						classes:								"label"
					}, {
						kind:									"smart-select",
						classes:								"value button",
						name:									"theme",
						key:									"theme",
						onSelect:								"themeChanged",
						options: [
						]
					}
				]
			}, {
				name:											"panel",
				classes:										"panel",
				data: {
					items: [
						{
							label:								$L("Font Size"),
							key:								"fontSize",

							options: [
								{ label: $L("Microscopic"),		value: "micro",		style: "10px;" 	},
								{ label: $L("Tiny"),			value: "tiny",		style: "12px;"	},
								{ label: $L("Small"),			value: "small"	,	style: "14px;"	},
								{ label: $L("Medium"),			value: "medium"	,	style: "16px;"	},
								{ label: $L("Large"),			value: "large"	,	style: "18px;"	}
							]
						},
						{
							label:								$L("Toolbar"),
							key:								"toolbar",

							options: [
								{ label: $L("Top"),				value: "top"	},
								{ label: $L("Bottom"),			value: "bottom"	}
								// TODO	Allow this to be hidden on webOS. It
								//		doesn't make sense on other platforms
								// { label: $L("Hidden"),			value: "hide"	}
							]
						},
						{
							label:								$L("Tabs"),
							key:								"tabs",

							options: [
								{ label: $L("Top"),				value: "top"	},
								{ label: $L("Bottom"),			value: "bottom"	},
								{ label: $L("Hidden"),			value: "hide"	}
							]
						},
						{
							label:								$L("Image Previews"),
							key:								"thumbnails",

							options: [
								{ label: $L("Off"),				value: "off"	},
								{ label: $L("Small"),			value: "small"	},
								{ label: $L("Large"),			value: "large"	}
							]
						},
						{
							label:								$L("Enter to Submit"),
							key:								"submitOnEnter"
						}
					]
				}
			}
		]
	}
],

create: function()
{
	this.inherited(arguments);

	switch (prefs.get("theme").split(',')[0]) {
		case "light":
		case "dark":
			this.$.themetype.setSelected("original");
			break;

		case "holo-dark":
			this.$.themetype.setSelected("holo");
			break;

		case "ffos":
			this.$.themetype.setSelected("ffos");
			break;

		case "material":
			this.$.themetype.setSelected("material");
			break;
	}
	this.themeTypeChanged();
},

themeTypeChanged: function(sender, event)
{
	var type;

	try {
		type = this.$.themetype.getSelected().value;
	} catch (e) {
		type = 'original';
	}

	switch (type) {
		case "original":
			this.$.theme.setOptions([
				{ content: $L("Light"),		value: "light"					},
				{ content: $L("Dark"),		value: "dark"					}
			]);
			break;

		case "material":
			this.$.theme.setOptions([
				{ content: $L("Light"),		value: "material"					},
				{ content: $L("Dark"),		value: "material,material-dark"		},
				{ content: $L("Blue Grey"),	value: "material,material-blue-grey"},
				{ content: $L("Cyan"),		value: "material,material-cyan"		},
				{ content: $L("Green"),		value: "material,material-green"	},
				{ content: $L("Orange"),	value: "material,material-orange"	},
				{ content: $L("Teal"),		value: "material,material-teal"		},
				{ content: $L("Indigo"),	value: "material,material-indigo"	},
				{ content: $L("Red"),		value: "material,material-red"		}
			]);
			break;

		case "holo":
			this.$.theme.setOptions([
				{ content: $L("Dark"),		value: "holo-dark"				},
				{ content: $L("Red"),		value: "holo-dark,holo-red"		}
			]);
			break;

		case "ffos":
			// TODO	Add other ffos color options
			this.$.theme.setOptions([
				{ content: $L("Orange"),	value: "ffos"					},
				{ content: $L("Blue"),		value: "ffos,ffos-blue"			},
				{ content: $L("Light Blue"),value: "ffos,ffos-light-blue"			},
				{ content: $L("Red"),		value: "ffos,ffos-red"			},
				{ content: $L("Green"),		value: "ffos,ffos-green"		},
				{ content: $L("Dark"),		value: "ffos,ffos-dark"			}
			]);
			break;
	}

	this.$.theme.setSelected(0);
	this.$.theme.setSelected(prefs.get("theme"));

	if (sender && event) {
		this.themeChanged(sender, event);
	}
},

themeChanged: function(sender, event)
{
	prefs.set("theme", this.$.theme.getSelected().value);
	this.doOptionsChanged({});
},

rendered: function()
{
	this.inherited(arguments);
	this.resizeHandler();
},

resizeHandler: function(sender, event)
{
	this.inherited(arguments);

	/* Fix the scroller height */
	this.$.scroller.applyStyle('max-height',
						(document.body.clientHeight - 34) + 'px');
}

});
