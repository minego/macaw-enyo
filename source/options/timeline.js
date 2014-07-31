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

name:												"optionsTimeline",
kind:												"optionsmenu",
classes:											"timeline",

events: {
	oncloseToaster:									"",
	onOpenToaster:									""
},

components: [
	{
		kind:										enyo.Scroller,
		components: [
			{
				name:								"panel",
				classes:							"panel",
				data: {
					items: [
						{
							label:					"Avatar",
							key:					"hideAvatar",

							onContent:				"Show",
							offContent:				"Hide",
							negate:					true
						},
						{
							label:					"Name",
							key:					"showUserName",

							onContent:				"Show",
							offContent:				"Hide"
						},
						{
							label:					"Handle",
							key:					"showScreenName",

							onContent:				"Show",
							offContent:				"Hide"
						},
						{
							label:					"Client Name",
							key:					"showVia",

							onContent:				"Show",
							offContent:				"Hide"
						},
						{
							label:					"Time",
							key:					"showTime",

							options: [
								{ label: "Relative",value: "relative"	},
								{ label: "Absolute",value: "absolute"	},
								{ label: "Hidden",	value: "hidden"		}
							]
						}
					]
				}
			}
		]
	}
]


});
