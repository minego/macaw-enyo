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
	oncloseToaster:												"",
	onOpenToaster:												""
},

components: [
	{
		kind:													enyo.Scroller,
		components: [
			{
				name:											"panel",
				classes:										"panel",
				data: {
					items: [
						{
							label:								$L("Theme"),
							key:								"theme",

							options: [
								{ label: $L("Light"),			value: "light"				},
								{ label: $L("Dark"),			value: "dark"				},
								{ label: $L("Holo Dark"),		value: "holo-dark"			},
								{ label: $L("Holo Red"),		value: "holo-dark,holo-red"	},
								{ label: $L("Firefox OS"),		value: "ffos"				},
								{ label: $L("Firefox OS Dark"),
																value: "ffos,ffos-dark"		},
								{ label: $L("Macaw Bros"),		value: "macawbros"			}
							]
						},

						{
							label:								$L("Font Size"),
							key:								"fontSize",

							options: [
								{ label: $L("Microscopic"),		value: "micro"	},
								{ label: $L("Tiny"),			value: "tiny"	},
								{ label: $L("Small"),			value: "small"	},
								{ label: $L("Medium"),			value: "medium"	},
								{ label: $L("Large"),			value: "large"	}
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
},

destroy: function()
{
}

});
