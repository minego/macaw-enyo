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

name:													"optionsUI",
kind:													"options",
classes:												"ui",

events: {
	oncloseToaster:										"",
	onOpenToaster:										""
},

components: [
	{
		kind:											enyo.Scroller,
		components: [
			{
				name:									"panel",
				data: {
					items: [
						{
							label:						"Theme",
							key:						"theme",

							options: [
								{ label: "Light",		value: "light"				},
								{ label: "Dark",		value: "dark"				},
								{ label: "Holo Dark",	value: "holo-dark"			},
								{ label: "Holo Red",	value: "holo-dark,holo-red"	},
								{ label: "Firefox OS",	value: "ffos"				},
								{ label: "Firefox OS Dark",
														value: "ffos,ffos-dark"		},
								{ label: "Macaw Bros",	value: "macawbros"			}
							]
						},

						{
							label:						"Font Size",
							key:						"fontSize",

							options: [
								{ label: "Microscopic",	value: "micro"	},
								{ label: "Tiny",		value: "tiny"	},
								{ label: "Small",		value: "small"	},
								{ label: "Medium",		value: "medium"	},
								{ label: "Large",		value: "large"	}
							]
						},
						{
							label:						"Toolbar",
							key:						"toolbar",

							options: [
								{ label: "Top",			value: "top"	},
								{ label: "Bottom",		value: "bottom"	},
								{ label: "Hidden",		value: "hide"	}
							]
						},
						{
							label:						"Tabs",
							key:						"tabs",

							options: [
								{ label: "Top",			value: "top"	},
								{ label: "Bottom",		value: "bottom"	},
								{ label: "Hidden",		value: "hide"	}
							]
						},
						{
							label:						"Image Previews",
							key:						"thumbnails",

							options: [
								{ label: "Off",			value: "off"	},
								{ label: "Small",		value: "small"	},
								{ label: "Large",		value: "large"	}
							]
						},
						{
							label:						"Enter to Submit",
							key:						"submitOnEnter"
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
