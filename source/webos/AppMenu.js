/*
   Copyright 2012 Arthur Thornton

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/
enyo.kind({
	name:						"enyo.AppMenu",
	kind:						onyx.Menu,
	classes:					"enyo-appmenu",
	defaultKind:				"enyo.AppMenuItem",
	published: {
		maxHeight:				400
	},

	components: [
		{
			kind:				enyo.Signals,
			onToggleAppMenu:	"toggle"
		}
	],

	//* @public
	toggle: function() {
		// if we're visible, hide it; else, show it
		if (this.showing) {
			this.hide();
		} else {
			this.show();
		}
	},

	//* @public
	show: function() {
		var bounds = this.getBounds();

		if (bounds.height > this.maxHeight) {
			this.setBounds({
				height: this.maxHeight
			});
		}

		this.inherited(arguments);
	},

	//* @private
	maxHeightChanged: function() {
		// if this is currently visible, go ahead and call show() to update the height if necessary
		if (this.showing) {
			this.show();
		}
	}
});

enyo.kind({
	name: "enyo.AppMenuItem",
	kind: onyx.MenuItem,
	classes: "enyo-item"
});

