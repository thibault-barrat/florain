/*********************/
/* Carte des acteurs */
/*********************/

L.Control.StyledLayerControl = L.Control.Layers.extend({
    options: {
        collapsed: true,
        position: 'topright',
        autoZIndex: true,
        group_togglers: {
            show: false,
            labelAll: 'All',
            labelNone: 'None'
        },
        groupDeleteLabel: 'Delete the group'
    },

    initialize: function(baseLayers, groupedOverlays, options) {
        var i,
            j;
        L.Util.setOptions(this, options);

        this._layerControlInputs = [];
        this._layers = [];
        this._lastZIndex = 0;
        this._handlingClick = false;
        this._groupList = [];
        this._domGroups = [];

        for (i in baseLayers) {
            for (var j in baseLayers[i].layers) {
                this._addLayer(baseLayers[i].layers[j], j, baseLayers[i], false);
            }
        }

        for (i in groupedOverlays) {
            for (var j in groupedOverlays[i].layers) {
                this._addLayer(groupedOverlays[i].layers[j], j, groupedOverlays[i], true);
            }
        }


    },

    onAdd: function(map) {
        this._initLayout();
        this._update();

        map
            .on('layeradd', this._onLayerChange, this)
            .on('layerremove', this._onLayerChange, this)
            .on('zoomend', this._onZoomEnd, this);

        return this._container;
    },

    onRemove: function(map) {
        map
            .off('layeradd', this._onLayerChange)
            .off('layerremove', this._onLayerChange);
    },

    addBaseLayer: function(layer, name, group) {
        this._addLayer(layer, name, group, false);
        this._update();
        return this;
    },

    addOverlay: function(layer, name, group) {
        this._addLayer(layer, name, group, true);
        this._update();
        return this;
    },

    removeLayer: function(layer) {
        var id = L.Util.stamp(layer);
        delete this._layers[id];
        this._update(); 
        return this;
    },

    removeGroup: function(group_Name, del) {
        for (group in this._groupList) {
            if (this._groupList[group].groupName == group_Name) {
                for (layer in this._layers) {
                    if (this._layers[layer].group && this._layers[layer].group.name == group_Name) {
                        if (del) {
                            this._map.removeLayer(this._layers[layer].layer);
                        }
                        delete this._layers[layer];
                    }
                }
                delete this._groupList[group];
                this._update();
                break;
            }
        }
    },

    removeAllGroups: function(del) {
        for (group in this._groupList) {
                for (layer in this._layers) {
                    if (this._layers[layer].group && this._layers[layer].group.removable) {
                        if (del) {
                            this._map.removeLayer(this._layers[layer].layer);
                        }
                        delete this._layers[layer];
                    }
                }
                delete this._groupList[group];
        }
        this._update();
    },

    selectLayer: function(layer) {
        this._map.addLayer(layer);
        this._update();
    },

    unSelectLayer: function(layer) {
        this._map.removeLayer(layer);
        this._update();
    },

    selectGroup: function(group_Name) {
        this.changeGroup(group_Name, true)
    },

    unSelectGroup: function(group_Name) {
        this.changeGroup(group_Name, false)
    },

    changeGroup: function(group_Name, select) {
        for (group in this._groupList) {
            if (this._groupList[group].groupName == group_Name) {
                for (layer in this._layers) {
                    if (this._layers[layer].group && this._layers[layer].group.name == group_Name) {
                        if (select) {
                            this._map.addLayer(this._layers[layer].layer);
                        } else {
                            this._map.removeLayer(this._layers[layer].layer);
                        }
                    }
                }
                break;
            }
        }
        this._update();
    },


    _initLayout: function() {
        var className = 'leaflet-control-layers',
            container = this._container = L.DomUtil.create('div', className);

        //Makes this work on IE10 Touch devices by stopping it from firing a mouseout event when the touch is released
        container.setAttribute('aria-haspopup', true);

        if (!L.Browser.touch) {
            L.DomEvent.disableClickPropagation(container);
            L.DomEvent.on(container, 'wheel', L.DomEvent.stopPropagation);
        } else {
            L.DomEvent.on(container, 'click', L.DomEvent.stopPropagation);
        }

        var section = document.createElement('section');
        section.className = 'ac-container ' + className + '-list';

        var form = this._form = this._section = L.DomUtil.create('form');

        section.appendChild(form);

        if (this.options.collapsed) {
            if (!L.Browser.android) {
                L.DomEvent
                    .on(container, 'mouseover', this._expand, this)
                    .on(container, 'mouseout', this._collapse, this);
            }
            var link = this._layersLink = L.DomUtil.create('a', className + '-toggle', container);
            link.href = '#';
            link.title = 'Layers';

            if (L.Browser.touch) {
                L.DomEvent
                    .on(link, 'click', L.DomEvent.stop)
                    .on(link, 'click', this._expand, this);
            } else {
                L.DomEvent.on(link, 'focus', this._expand, this);
            }

            this._map.on('click', this._collapse, this);
            // TODO keyboard accessibility

        } else {
            this._expand();
        }

        this._baseLayersList = L.DomUtil.create('div', className + '-base', form);
        this._overlaysList = L.DomUtil.create('div', className + '-overlays', form);

        container.appendChild(section);

        // process options of ac-container css class - to options.container_width and options.container_maxHeight
        for (var c = 0; c < (containers = container.getElementsByClassName('ac-container')).length; c++) {
            if (this.options.container_width) {
                containers[c].style.width = this.options.container_width;
            }

            // set the max-height of control to y value of map object
            this._default_maxHeight = this.options.container_maxHeight ? this.options.container_maxHeight : (this._map.getSize().y - 70);
            containers[c].style.maxHeight = this._default_maxHeight;

        }

        window.onresize = this._on_resize_window.bind(this);

    },

    _on_resize_window: function() {
        // listen to resize of screen to reajust de maxHeight of container
        for (var c = 0; c < containers.length; c++) {
            // input the new value to height
            containers[c].style.maxHeight = (window.innerHeight - 90) < this._removePxToInt(this._default_maxHeight) ? (window.innerHeight - 90) + "px" : this._removePxToInt(this._default_maxHeight) + "px";
        }
    },

    // remove the px from a css value and convert to a int
    _removePxToInt: function(value) {
        if (typeof value === 'string') {
            return parseInt(value.replace("px", ""));
        }
        return value;
    },

    _addLayer: function(layer, name, group, overlay) {
        var id = L.Util.stamp(layer);

        this._layers[id] = {
            layer: layer,
            name: name,
            overlay: overlay
        };

        if (group) {
            var groupId = this._groupList.indexOf(group);

            // if not find the group search for the name
            if (groupId === -1) {
                for (g in this._groupList) {
                    if (this._groupList[g].groupName == group.groupName) {
                        groupId = g;
                        break;
                    }
                }
            }

            if (groupId === -1) {
                groupId = this._groupList.push(group) - 1;
            }

            this._layers[id].group = {
                name: group.groupName,
                id: groupId,
                expanded: group.expanded,
                removable: group.removable
            };
        }

        if (this.options.autoZIndex && layer.setZIndex) {
            this._lastZIndex++;
            layer.setZIndex(this._lastZIndex);
        }
    },

    _update: function() {
        if (!this._container) {
            return;
        }

        this._baseLayersList.innerHTML = '';
        this._overlaysList.innerHTML = '';

        this._domGroups.length = 0;

        this._layerControlInputs = [];

        var baseLayersPresent = false,
            overlaysPresent = false,
            i,
            obj;

        for (i in this._layers) {
            obj = this._layers[i];
            this._addItem(obj);
            overlaysPresent = overlaysPresent || obj.overlay;
            baseLayersPresent = baseLayersPresent || !obj.overlay;
        }

    },

    _onLayerChange: function(e) {
        var obj = this._layers[L.Util.stamp(e.layer)];

        if (!obj) {
            return;
        }

        if (!this._handlingClick) {
            this._update();
        }

        var type = obj.overlay ?
            (e.type === 'layeradd' ? 'overlayadd' : 'overlayremove') :
            (e.type === 'layeradd' ? 'baselayerchange' : null);

        this._checkIfDisabled();

        if (type) {
            this._map.fire(type, obj);
        }
    },

    _onZoomEnd: function(e) {
        this._checkIfDisabled();
    },

    _checkIfDisabled: function(layers) {
        var currentZoom = this._map.getZoom();

        for (layerId in this._layers) {
            if (this._layers[layerId].layer.options && (this._layers[layerId].layer.options.minZoom || this._layers[layerId].layer.options.maxZoom)) {
                var el = document.getElementById('ac_layer_input_' + this._layers[layerId].layer._leaflet_id);
                if (currentZoom < this._layers[layerId].layer.options.minZoom || currentZoom > this._layers[layerId].layer.options.maxZoom) {
                    el.disabled = 'disabled';
                } else {
                    el.disabled = '';
                }
            }
        }
    },

    // IE7 bugs out if you create a radio dynamically, so you have to do it this hacky way (see http://bit.ly/PqYLBe)
    _createRadioElement: function(name, checked) {

        var radioHtml = '<input type="radio" class="leaflet-control-layers-selector" name="' + name + '"';
        if (checked) {
            radioHtml += ' checked="checked"';
        }
        radioHtml += '/>';

        var radioFragment = document.createElement('div');
        radioFragment.innerHTML = radioHtml;

        return radioFragment.firstChild;
    },

    _addItem: function(obj) {
        var label = document.createElement('div'),
            input,
            checked = this._map.hasLayer(obj.layer),
            id = 'ac_layer_input_' + obj.layer._leaflet_id,
            container;


        if (obj.overlay) {
            input = document.createElement('input');
            input.type = 'checkbox';
            input.className = 'leaflet-control-layers-selector';
            input.defaultChecked = checked;

            label.className = "menu-item-checkbox";
            input.id = id;

        } else {
            input = this._createRadioElement('leaflet-base-layers', checked);

            label.className = "menu-item-radio";
            input.id = id;
        }

        this._layerControlInputs.push(input);
        input.layerId = L.Util.stamp(obj.layer);

        L.DomEvent.on(input, 'click', this._onInputClick, this);
        
        var name = document.createElement('label');
      	name.setAttribute("for", id);
        name.innerHTML = obj.name;

        label.appendChild(input);
        label.appendChild(name);
        

        if (obj.layer.StyledLayerControl) {

            // configure the delete button for layers with attribute removable = true
            if (obj.layer.StyledLayerControl.removable) {
                var bt_delete = document.createElement("input");
                bt_delete.type = "button";
                bt_delete.className = "bt_delete";
                L.DomEvent.on(bt_delete, 'click', this._onDeleteClick, this);
                label.appendChild(bt_delete);
            }

            // configure the visible attribute to layer
            if (obj.layer.StyledLayerControl.visible) {
                this._map.addLayer(obj.layer);
            }
            
            

        }


        if (obj.overlay) {
            container = this._overlaysList;
        } else {
            container = this._baseLayersList;
        }

        var groupContainer = this._domGroups[obj.group.id];

        if (!groupContainer) {

            groupContainer = document.createElement('div');
            groupContainer.id = 'leaflet-control-accordion-layers-' + obj.group.id;
            
            // verify if group is expanded
            var s_expanded = obj.group.expanded ? ' checked = "true" ' : '';

            // verify if type is exclusive
            var s_type_exclusive = this.options.exclusive ? ' type="radio" ' : ' type="checkbox" ';
            
            inputElement = document.createElement('input');
            inputElement.id ='ac' + obj.group.id;
            inputElement.type = 'checkbox';
            inputElement.name = 'accordion-1';
            inputElement.className = 'menu';
            inputElement.defaultChecked = checked;
            
            inputElement2 = document.createElement('input');
            inputElement2.id ='ac_group_input' + obj.group.id;
            inputElement2.type = 'checkbox';
            inputElement2.className = 'leaflet-control-category-selector';
            inputElement2.defaultChecked = checked;
            
            inputLabel = document.createElement('label');
            inputLabel.setAttribute('for', 'ac' + obj.group.id);
            inputLabel.for ='ac' + obj.group.id;
            inputLabel.className = 'chevron';
            inputLabel.innerHTML = '<i class="fa fa-chevron-down unchecked"></i><i class="fa fa-chevron-up checked"></i>';
            
            inputLabel2 = document.createElement('label');
            inputLabel2.setAttribute('for', 'ac_group_input' + obj.group.id);
            inputLabel2.for ='ac_group_input' + obj.group.id;
            inputLabel2.setAttribute("data-group-name", obj.group.name);
            inputLabel2.className = 'category-name';
            inputLabel2.innerHTML = obj.group.name;

            /*inputElement = '<input id="ac' + obj.group.id + '" name="accordion-1" class="menu" ' + s_expanded + s_type_exclusive + '/>';
            inputElement2 = '<input type="checkbox" class="leaflet-control-category-selector" checked id="ac_group_input' + obj.group.id + '" />';
            inputLabel = '<label class="chevron" for="ac' + obj.group.id + '"><i class="fas fa-chevron-down unchecked"></i><i class="fas fa-chevron-up checked"></i></label>';
            inputLabel2 = '<label class="category-name" for="ac_group_input' + obj.group.id + '" data-group-name="' + obj.group.name +'">' + obj.group.name + '</label>';*/

            article = document.createElement('article');
            article.className = 'ac-large';
            
            var categoryContainer = L.DomUtil.create('div', 'category-container');
            if(inputElement2.checked) {
                if (L.Browser.touch) {
                    L.DomEvent
                        .on(inputLabel2, 'click', L.DomEvent.stop)
                        .on(inputLabel2, 'click', this._onUnSelectGroup, this);
                } else {
                    L.DomEvent
                        .on(inputLabel2, 'click', L.DomEvent.stop)
                        .on(inputLabel2, 'focus', this._onUnSelectGroup, this);
                }
            }
            if(!inputElement2.checked) {
                if (L.Browser.touch) {
                    L.DomEvent
                        .on(inputLabel2, 'click', L.DomEvent.stop)
                        .on(inputLabel2, 'click', this._onSelectGroup, this);
                } else {
                    L.DomEvent
                        .on(inputLabel2, 'click', L.DomEvent.stop)
                        .on(inputLabel2, 'focus', this._onSelectGroup, this);
                }
            }
            


                /*if (L.Browser.touch) {
                    L.DomEvent
                        .on(categoryContainer, 'click', L.DomEvent.stop)
                        .on(categoryContainer, 'click', this._onUnSelectGroup, this);
                } else {
                    L.DomEvent
                        .on(categoryContainer, 'click', L.DomEvent.stop)
                        .on(categoryContainer, 'focus', this._onUnSelectGroup, this);
                }*/

                /*// Link none
                var linkNone = L.DomUtil.create('a', 'group-toggle-none', togglerContainer);
                linkNone.href = '#';
                linkNone.title = this.options.group_togglers.labelNone;
                linkNone.innerHTML = "Unselect";
                linkNone.setAttribute("data-group-name", obj.group.name);

                if (L.Browser.touch) {
                    L.DomEvent
                        .on(linkNone, 'click', L.DomEvent.stop)
                        .on(linkNone, 'click', this._onUnSelectGroup, this);
                } else {
                    L.DomEvent
                        .on(linkNone, 'click', L.DomEvent.stop)
                        .on(linkNone, 'focus', this._onUnSelectGroup, this);
                }*/
            
            if (obj.layer.StyledLayerControl) {
                // configure the hidden attribute to layer
                if (obj.layer.StyledLayerControl.hiddenSubLayers) {
                    groupContainer.className += ' hidden-sub-layers'; 
                }


            }

            article.appendChild(label);

            // process options of ac-large css class - to options.group_maxHeight property
            if (this.options.group_maxHeight) {
                article.style.maxHeight = this.options.group_maxHeight;
            }
            
            categoryContainer.appendChild(inputElement2);
            categoryContainer.appendChild(inputLabel2);
            categoryContainer.appendChild(inputLabel);
            //categoryContainer.innerHTML = inputElement2 + inputLabel2 + inputLabel;
            //groupContainer.innerHTML = inputElement;
            groupContainer.appendChild(inputElement);
            groupContainer.appendChild(categoryContainer);
            groupContainer.appendChild(article);
            
            // Link to toggle all layers
            if (obj.overlay && this.options.group_togglers.show) {

                // Toggler container
                var togglerContainer = L.DomUtil.create('div', 'group-toggle-container', groupContainer);

                // Link All
                var linkAll = L.DomUtil.create('a', 'group-toggle-all', togglerContainer);
                linkAll.href = '#';
                linkAll.title = this.options.group_togglers.labelAll;
                linkAll.innerHTML = "Select";
                linkAll.setAttribute("data-group-name", obj.group.name);

                if (L.Browser.touch) {
                    L.DomEvent
                        .on(linkAll, 'click', L.DomEvent.stop)
                        .on(linkAll, 'click', this._onSelectGroup, this);
                } else {
                    L.DomEvent
                        .on(linkAll, 'click', L.DomEvent.stop)
                        .on(linkAll, 'focus', this._onSelectGroup, this);
                }

                // Separator
                var separator = L.DomUtil.create('span', 'group-toggle-divider', togglerContainer);
                separator.innerHTML = ' / ';

                // Link none
                var linkNone = L.DomUtil.create('a', 'group-toggle-none', togglerContainer);
                linkNone.href = '#';
                linkNone.title = this.options.group_togglers.labelNone;
                linkNone.innerHTML = "Unselect";
                linkNone.setAttribute("data-group-name", obj.group.name);

                if (L.Browser.touch) {
                    L.DomEvent
                        .on(linkNone, 'click', L.DomEvent.stop)
                        .on(linkNone, 'click', this._onUnSelectGroup, this);
                } else {
                    L.DomEvent
                        .on(linkNone, 'click', L.DomEvent.stop)
                        .on(linkNone, 'focus', this._onUnSelectGroup, this);
                }

                if (obj.overlay && this.options.group_togglers.show && obj.group.removable) {
                    // Separator
                    var separator = L.DomUtil.create('span', 'group-toggle-divider', togglerContainer);
                    separator.innerHTML = ' / ';
                }

                if (obj.group.removable) {
                    // Link delete group
                    var linkRemove = L.DomUtil.create('a', 'group-toggle-none', togglerContainer);
                    linkRemove.href = '#';
                    linkRemove.title = this.options.groupDeleteLabel;
                    linkRemove.innerHTML = this.options.groupDeleteLabel;
                    linkRemove.setAttribute("data-group-name", obj.group.name);

                    if (L.Browser.touch) {
                        L.DomEvent
                            .on(linkRemove, 'click', L.DomEvent.stop)
                            .on(linkRemove, 'click', this._onRemoveGroup, this);
                    } else {
                        L.DomEvent
                            .on(linkRemove, 'click', L.DomEvent.stop)
                            .on(linkRemove, 'focus', this._onRemoveGroup, this);
                    }
                }

            }

            container.appendChild(groupContainer);

            this._domGroups[obj.group.id] = groupContainer;
        } else {
            groupContainer.getElementsByTagName('article')[0].appendChild(label);
        }


        return label;
    },

    _onDeleteClick: function(obj) {
        var node = obj.target.parentElement.childNodes[0];
        n_obj = this._layers[node.layerId];

        // verify if obj is a basemap and checked to not remove
        if (!n_obj.overlay && node.checked) {
            return false;
        }

        if (this._map.hasLayer(n_obj.layer)) {
            this._map.removeLayer(n_obj.layer);
        }

        obj.target.parentNode.remove();

        return false;
    },

    _onSelectGroup: function(e) {
        this.selectGroup(e.target.getAttribute("data-group-name"));
    },

    _onUnSelectGroup: function(e) {
        this.unSelectGroup(e.target.getAttribute("data-group-name"));
    },

    _onRemoveGroup: function(e) {
        this.removeGroup(e.target.getAttribute("data-group-name"), true);
    },

    _expand: function() {
        L.DomUtil.addClass(this._container, 'leaflet-control-layers-expanded');
    },

    _collapse: function() {
        this._container.className = this._container.className.replace(' leaflet-control-layers-expanded', '');
    }
});

L.Control.styledLayerControl = function(baseLayers, overlays, options) {
    return new L.Control.StyledLayerControl(baseLayers, overlays, options);
};


(function () {

L.Control.FullScreen = L.Control.extend({
	options: {
		position: 'topleft',
		title: 'Full Screen',
		titleCancel: 'Exit Full Screen',
		forceSeparateButton: false,
		forcePseudoFullscreen: false,
		fullscreenElement: false
	},
	
	onAdd: function (map) {
		var className = 'leaflet-control-zoom-fullscreen', container, content = '';
		
		if (map.zoomControl && !this.options.forceSeparateButton) {
			container = map.zoomControl._container;
		} else {
			container = L.DomUtil.create('div', 'leaflet-bar');
		}
		
		if (this.options.content) {
			content = this.options.content;
		} else {
			className += ' fullscreen-icon';
		}

		this._createButton(this.options.title, className, content, container, this.toggleFullScreen, this);

		this._map.on('enterFullscreen exitFullscreen', this._toggleTitle, this);

		return container;
	},
	
	_createButton: function (title, className, content, container, fn, context) {
		this.link = L.DomUtil.create('a', className, container);
		this.link.href = '#';
		this.link.title = title;
		this.link.innerHTML = content;

		L.DomEvent
			.addListener(this.link, 'click', L.DomEvent.stopPropagation)
			.addListener(this.link, 'click', L.DomEvent.preventDefault)
			.addListener(this.link, 'click', fn, context);
		
		L.DomEvent
			.addListener(container, fullScreenApi.fullScreenEventName, L.DomEvent.stopPropagation)
			.addListener(container, fullScreenApi.fullScreenEventName, L.DomEvent.preventDefault)
			.addListener(container, fullScreenApi.fullScreenEventName, this._handleFullscreenChange, context);
		
		L.DomEvent
			.addListener(document, fullScreenApi.fullScreenEventName, L.DomEvent.stopPropagation)
			.addListener(document, fullScreenApi.fullScreenEventName, L.DomEvent.preventDefault)
			.addListener(document, fullScreenApi.fullScreenEventName, this._handleFullscreenChange, context);

		return this.link;
	},
	
	toggleFullScreen: function () {
		var map = this._map;
		map._exitFired = false;
		if (map._isFullscreen) {
			if (fullScreenApi.supportsFullScreen && !this.options.forcePseudoFullscreen) {
				fullScreenApi.cancelFullScreen();
			} else {
				L.DomUtil.removeClass(this.options.fullscreenElement ? this.options.fullscreenElement : map._container, 'leaflet-pseudo-fullscreen');
			}
			map.fire('exitFullscreen');
			map._exitFired = true;
			map._isFullscreen = false;
		}
		else {
			if (fullScreenApi.supportsFullScreen && !this.options.forcePseudoFullscreen) {
				fullScreenApi.requestFullScreen(this.options.fullscreenElement ? this.options.fullscreenElement : map._container);
			} else {
				L.DomUtil.addClass(this.options.fullscreenElement ? this.options.fullscreenElement : map._container, 'leaflet-pseudo-fullscreen');
			}
			map.fire('enterFullscreen');
			map._isFullscreen = true;
		}
	},
	
	_toggleTitle: function () {
		this.link.title = this._map._isFullscreen ? this.options.title : this.options.titleCancel;
	},
	
	_handleFullscreenChange: function () {
		var map = this._map;
		map.invalidateSize();
		if (!fullScreenApi.isFullScreen() && !map._exitFired) {
			map.fire('exitFullscreen');
			map._exitFired = true;
			map._isFullscreen = false;
		}
	}
});

L.Map.addInitHook(function () {
	if (this.options.fullscreenControl) {
		this.fullscreenControl = L.control.fullscreen(this.options.fullscreenControlOptions);
		this.addControl(this.fullscreenControl);
	}
});

L.control.fullscreen = function (options) {
	return new L.Control.FullScreen(options);
};

/* 
Native FullScreen JavaScript API
-------------
Assumes Mozilla naming conventions instead of W3C for now

source : http://johndyer.name/native-fullscreen-javascript-api-plus-jquery-plugin/

*/

	var 
		fullScreenApi = { 
			supportsFullScreen: false,
			isFullScreen: function () { return false; }, 
			requestFullScreen: function () {}, 
			cancelFullScreen: function () {},
			fullScreenEventName: '',
			prefix: ''
		},
		browserPrefixes = 'webkit moz o ms khtml'.split(' ');
	
	// check for native support
	if (typeof document.exitFullscreen !== 'undefined') {
		fullScreenApi.supportsFullScreen = true;
	} else {
		// check for fullscreen support by vendor prefix
		for (var i = 0, il = browserPrefixes.length; i < il; i++) {
			fullScreenApi.prefix = browserPrefixes[i];
			if (typeof document[fullScreenApi.prefix + 'CancelFullScreen'] !== 'undefined') {
				fullScreenApi.supportsFullScreen = true;
				break;
			}
		}
		if (typeof document['msExitFullscreen'] !== 'undefined') {
			fullScreenApi.prefix = 'ms';
			fullScreenApi.supportsFullScreen = true;
		}
	}
	
	// update methods to do something useful
	if (fullScreenApi.supportsFullScreen) {
		if (fullScreenApi.prefix === 'ms') {
			fullScreenApi.fullScreenEventName = 'MSFullscreenChange';
		} else {
			fullScreenApi.fullScreenEventName = fullScreenApi.prefix + 'fullscreenchange';
		}
		fullScreenApi.isFullScreen = function () {
			switch (this.prefix) {
				case '':
					return document.fullscreen;
				case 'webkit':
					return document.webkitIsFullScreen;
				case 'ms':
					return document.msFullscreenElement;
				default:
					return document[this.prefix + 'FullScreen'];
			}
		};
		fullScreenApi.requestFullScreen = function (el) {
			switch (this.prefix) {
				case '':
					return el.requestFullscreen();
				case 'ms':
					return el.msRequestFullscreen();
				default:
					return el[this.prefix + 'RequestFullScreen']();
			}
		};
		fullScreenApi.cancelFullScreen = function () {
			switch (this.prefix) {
				case '':
					return document.exitFullscreen();
				case 'ms':
					return document.msExitFullscreen();
				default:
					return document[this.prefix + 'CancelFullScreen']();
			}
		};
	}

	// jQuery plugin
	if (typeof jQuery !== 'undefined') {
		jQuery.fn.requestFullScreen = function () {
			return this.each(function () {
				var el = jQuery(this);
				if (fullScreenApi.supportsFullScreen) {
					fullScreenApi.requestFullScreen(el);
				}
			});
		};
	}

	// export api
	window.fullScreenApi = fullScreenApi;
})();



var mymap;

    var mapTile = new L.tileLayer('//{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png', {
        maxZoom: 17,
        attribution: 'données © <a href="//osm.org/copyright">OpenStreetMap</a>/ODbL - rendu <a href="//openstreetmap.fr">OSM France</a>'
    });

    function onEachFeature(feature, layer) {
        if (feature.properties) {
            var content = '<h2><a href="acteur/?pdb=' + feature.properties.id + '">' + feature.properties.titre + '</a></h2>' +
                '<img src="wp-content/uploads/participants-database/' + feature.properties.image + '" class="logo-popup" alt="Logo"/>';
            if(feature.properties.comptoir == 'Oui') {
                content += '<h4>Comptoir de change</h4>';
                if(feature.properties.message_comptoir != null && feature.properties.message_comptoir.trim() != '') {
                    content += '<p>' + feature.properties.message_comptoir + '</p>';
                }
            }
            content += '<table cellpadding="2">' +
                '<tr>' + '<th>Description</th>' + '<td>' + feature.properties.description_longue + '</td>' + '</tr>';
            if (feature.properties.adresse != null && feature.properties.adresse.trim() != '' || feature.properties.code_postal != null && feature.properties.code_postal.trim() != '' || feature.properties.ville != null && feature.properties.ville.trim() != '' ) {
                content += '<tr>' + '<th>Addresse</th>' + '<td>' + feature.properties.adresse + ' ' + feature.properties.code_postal + ' ' + feature.properties.ville + '</td>' + '</tr>';
            }
            if (feature.properties.site_web != null && feature.properties.site_web.trim() != '') {
                content += '<tr>' + '<th>Site web</th>' + '<td><a target="_blank" href="' + feature.properties.site_web + '" rel="noopener noreferrer">' + feature.properties.site_web + '</a></td>' + '</tr>';
            } 
            if (feature.properties.présence_sur_les_marchés != null && Array.isArray(feature.properties.présence_sur_les_marchés)) {
                content += '<tr>' + '<th>Marchés</th>' + '<td>';
                feature.properties.présence_sur_les_marchés.forEach((item, index, arr) => {
                    if(index != arr.length - 1){
                        content += '<a href="acteur/?pdb=' + item.id + '">' + item.titre + '</a>, ';
                    } else {
                        content += '<a href="acteur/?pdb=' + item.id + '">' + item.titre + '</a>';
                    }
                });
                content += '</td>' + '</tr>';
            } 
            if (feature.properties.categorie == "Marchés" && feature.properties.acteurs_presents != null) {
                content += '<tr>' + '<th>Acteurs présents</th>' + '<td>';
                feature.properties.acteurs_presents.forEach((item, index, arr) => {
                    if(index != arr.length - 1){
                        content += '<a href="acteur/?pdb=' + item.id + '">' + item.titre + '</a>, ';
                    } else {
                        content += '<a href="acteur/?pdb=' + item.id + '">' + item.titre + '</a>';
                    }
                });
                content += '</td>' + '</tr>';
            }
            content += '<table>';        
            layer.bindPopup(content);
        }
    }

    //Fix pour le bug "XML mal formé" sur Firefox
    jQuery.ajaxSetup({beforeSend: function(xhr){
        if (xhr.overrideMimeType)
        {
          xhr.overrideMimeType("application/json");
        }
      }
      });

    


    //Création des layers
    var epiceriesIcon = L.icon({
        iconUrl: 'wp-content/themes/florain/img/epiceries_marker.png',
        iconSize: [34, 52],
        iconAnchor: [14, 42],
        popupAnchor: [0, -35]
    });
    var epiceriesLayer = new L.geoJson(null, {
        pointToLayer: function(feature, latlng) {
            return L.marker(latlng, {
                icon: epiceriesIcon,
                title: feature.properties.titre
            });
        },
        onEachFeature: onEachFeature
    });
    jQuery.getJSON('wp-content/themes/florain/geojson/epiceries.geojson', function(data) {
        epiceriesLayer.addData(data);
    });
    jQuery.getJSON('wp-content/themes/florain/geojson/epiceries-comptoir.geojson', function(data) {
        epiceriesLayer.addData(data);
    });


    var aussiIcon = L.icon({
        iconUrl: 'wp-content/themes/florain/img/aussi_marker.png',
        iconSize: [34, 52],
        iconAnchor: [14, 42],
        popupAnchor: [0, -35]
    });
    var aussiLayer = new L.geoJson(null, {
        pointToLayer: function(feature, latlng) {
            return L.marker(latlng, {
                icon: aussiIcon,
                title: feature.properties.titre
            });
        },
        onEachFeature: onEachFeature
    });
    jQuery.getJSON('wp-content/themes/florain/geojson/et_aussi.geojson', function(data) {
        aussiLayer.addData(data);
    });
    jQuery.getJSON('wp-content/themes/florain/geojson/et_aussi-comptoir.geojson', function(data) {
        aussiLayer.addData(data);
    });

    var boulangersIcon = L.icon({
        iconUrl: 'wp-content/themes/florain/img/boulangers_marker.png',
        iconSize: [34, 52],
        iconAnchor: [14, 42],
        popupAnchor: [0, -35]
    });
    var boulangersLayer = new L.geoJson(null, {
        pointToLayer: function(feature, latlng) {
            return L.marker(latlng, {
                icon: boulangersIcon,
                title: feature.properties.titre
            });
        },
        onEachFeature: onEachFeature
    });
    jQuery.getJSON('wp-content/themes/florain/geojson/paysans_boulangers_et_boulangers.geojson', function(data) {
        boulangersLayer.addData(data);
    });
    jQuery.getJSON('wp-content/themes/florain/geojson/paysans_boulangers_et_boulangers-comptoir.geojson', function(data) {
        boulangersLayer.addData(data);
    });

    var soinIcon = L.icon({
        iconUrl: 'wp-content/themes/florain/img/soin_marker.png',
        iconSize: [34, 52],
        iconAnchor: [14, 42],
        popupAnchor: [0, -35]
    });
    var soinLayer = new L.geoJson(null, {
        pointToLayer: function(feature, latlng) {
            return L.marker(latlng, {
                icon: soinIcon,
                title: feature.properties.titre
            });
        },
        onEachFeature: onEachFeature
    });
    jQuery.getJSON('wp-content/themes/florain/geojson/prendre_soin_de_soi.geojson', function(data) {
        soinLayer.addData(data);
    });
    jQuery.getJSON('wp-content/themes/florain/geojson/prendre_soin_de_soi-comptoir.geojson', function(data) {
        soinLayer.addData(data);
    });

    var producteursIcon = L.icon({
        iconUrl: 'wp-content/themes/florain/img/producteurs_marker.png',
        iconSize: [34, 52],
        iconAnchor: [14, 42],
        popupAnchor: [0, -35]
    });
    var producteursLayer = new L.geoJson(null, {
        pointToLayer: function(feature, latlng) {
            return L.marker(latlng, {
                icon: producteursIcon,
                title: feature.properties.titre
            });
        },
        onEachFeature: onEachFeature
    });
    jQuery.getJSON('wp-content/themes/florain/geojson/producteurs.geojson', function(data) {
        producteursLayer.addData(data);
    });
    jQuery.getJSON('wp-content/themes/florain/geojson/producteurs-comptoir.geojson', function(data) {
        producteursLayer.addData(data);
    });

    var cultureIcon = L.icon({
        iconUrl: 'wp-content/themes/florain/img/culture_marker.png',
        iconSize: [34, 52],
        iconAnchor: [14, 42],
        popupAnchor: [0, -35]
    });
    var cultureLayer = new L.geoJson(null, {
        pointToLayer: function(feature, latlng) {
            return L.marker(latlng, {
                icon: cultureIcon,
                title: feature.properties.titre
            });
        },
        onEachFeature: onEachFeature
    });
    jQuery.getJSON('wp-content/themes/florain/geojson/se_cultiver_se_divertir_se_detendre.geojson', function(data) {
        cultureLayer.addData(data);
    });
    jQuery.getJSON('wp-content/themes/florain/geojson/se_cultiver_se_divertir_se_detendre-comptoir.geojson', function(data) {
        cultureLayer.addData(data);
    });

    var seDeplacerIcon = L.icon({
        iconUrl: 'wp-content/themes/florain/img/velo_marker.png',
        iconSize: [34, 52],
        iconAnchor: [14, 42],
        popupAnchor: [0, -35]
    });
    var seDeplacerLayer = new L.geoJson(null, {
        pointToLayer: function(feature, latlng) {
            return L.marker(latlng, {
                icon: seDeplacerIcon,
                title: feature.properties.titre
            });
        },
        onEachFeature: onEachFeature
    });
    jQuery.getJSON('wp-content/themes/florain/geojson/se_deplacer.geojson', function(data) {
        seDeplacerLayer.addData(data);
    });
    jQuery.getJSON('wp-content/themes/florain/geojson/se_deplacer-comptoir.geojson', function(data) {
        seDeplacerLayer.addData(data);
    });

    var seMeublerIcon = L.icon({
        iconUrl: 'wp-content/themes/florain/img/meuble_marker.png',
        iconSize: [34, 52],
        iconAnchor: [14, 42],
        popupAnchor: [0, -35]
    });
    var seMeublerLayer = new L.geoJson(null, {
        pointToLayer: function(feature, latlng) {
            return L.marker(latlng, {
                icon: seMeublerIcon,
                title: feature.properties.titre
            });
        },
        onEachFeature: onEachFeature
    });
    jQuery.getJSON('wp-content/themes/florain/geojson/se_meubler_decorer_amenager.geojson', function(data) {
        seMeublerLayer.addData(data);
    });
    jQuery.getJSON('wp-content/themes/florain/geojson/se_meubler_decorer_amenager-comptoir.geojson', function(data) {
        seMeublerLayer.addData(data);
    });

    var seRestaurerIcon = L.icon({
        iconUrl: 'wp-content/themes/florain/img/restauration_marker.png',
        iconSize: [34, 52],
        iconAnchor: [14, 42],
        popupAnchor: [0, -35]
    });
    var seRestaurerLayer = new L.geoJson(null, {
        pointToLayer: function(feature, latlng) {
            return L.marker(latlng, {
                icon: seRestaurerIcon,
                title: feature.properties.titre
            });
        },
        onEachFeature: onEachFeature
    });
    jQuery.getJSON('wp-content/themes/florain/geojson/se_restaurer_et_boire_un_verre.geojson', function(data) {
        seRestaurerLayer.addData(data);
    });
    jQuery.getJSON('wp-content/themes/florain/geojson/se_restaurer_et_boire_un_verre-comptoir.geojson', function(data) {
        seRestaurerLayer.addData(data);
    });

    var sengagerIcon = L.icon({
        iconUrl: 'wp-content/themes/florain/img/engagement_marker.png',
        iconSize: [34, 52],
        iconAnchor: [14, 42],
        popupAnchor: [0, -35]
    });
    var sengagerLayer = new L.geoJson(null, {
        pointToLayer: function(feature, latlng) {
            return L.marker(latlng, {
                icon: sengagerIcon,
                title: feature.properties.titre
            });
        },
        onEachFeature: onEachFeature
    });
    jQuery.getJSON('wp-content/themes/florain/geojson/sengager.geojson', function(data) {
        sengagerLayer.addData(data);
    });
    jQuery.getJSON('wp-content/themes/florain/geojson/sengager-comptoir.geojson', function(data) {
        sengagerLayer.addData(data);
    });

    var shabillerIcon = L.icon({
        iconUrl: 'wp-content/themes/florain/img/habiller_marker.png',
        iconSize: [34, 52],
        iconAnchor: [14, 42],
        popupAnchor: [0, -35]
    });
    var shabillerLayer = new L.geoJson(null, {
        pointToLayer: function(feature, latlng) {
            return L.marker(latlng, {
                icon: shabillerIcon,
                title: feature.properties.titre
            });
        },
        onEachFeature: onEachFeature
    });
    jQuery.getJSON('wp-content/themes/florain/geojson/shabiller_sequiper.geojson', function(data) {
        shabillerLayer.addData(data);
    });
    jQuery.getJSON('wp-content/themes/florain/geojson/shabiller_sequiper-comptoir.geojson', function(data) {
        shabillerLayer.addData(data);
    });

    var traiteursIcon = L.icon({
        iconUrl: 'wp-content/themes/florain/img/traiteurs_marker.png',
        iconSize: [34, 52],
        iconAnchor: [14, 42],
        popupAnchor: [0, -35]
    });
    var traiteursLayer = new L.geoJson(null, {
        pointToLayer: function(feature, latlng) {
            return L.marker(latlng, {
                icon: traiteursIcon,
                title: feature.properties.titre
            });
        },
        onEachFeature: onEachFeature
    });
    jQuery.getJSON('wp-content/themes/florain/geojson/traiteurs.geojson', function(data) {
        traiteursLayer.addData(data);
    });
    jQuery.getJSON('wp-content/themes/florain/geojson/traiteurs-comptoir.geojson', function(data) {
        traiteursLayer.addData(data);
    });

	var amapIcon = L.icon({
        iconUrl: 'wp-content/themes/florain/img/amap_marker.png',
        iconSize: [34, 52],
        iconAnchor: [14, 42],
        popupAnchor: [0, -35]
    });
    var amapLayer = new L.geoJson(null, {
        pointToLayer: function(feature, latlng) {
            return L.marker(latlng, {
                icon: amapIcon,
                title: feature.properties.titre
            });
        },
        onEachFeature: onEachFeature
    });
    jQuery.getJSON('wp-content/themes/florain/geojson/amap.geojson', function(data) {
        amapLayer.addData(data);
    });
    jQuery.getJSON('wp-content/themes/florain/geojson/amap-comptoir.geojson', function(data) {
        amapLayer.addData(data);
    });

	var educPopIcon = L.icon({
        iconUrl: 'wp-content/themes/florain/img/educ-pop_marker.png',
        iconSize: [34, 52],
        iconAnchor: [14, 42],
        popupAnchor: [0, -35]
    });
    var educPopLayer = new L.geoJson(null, {
        pointToLayer: function(feature, latlng) {
            return L.marker(latlng, {
                icon: educPopIcon,
                title: feature.properties.titre
            });
        },
        onEachFeature: onEachFeature
    });
    jQuery.getJSON('wp-content/themes/florain/geojson/associations_deducation_populaire.geojson', function(data) {
        educPopLayer.addData(data);
    });
    jQuery.getJSON('wp-content/themes/florain/geojson/associations_deducation_populaire-comptoir.geojson', function(data) {
        educPopLayer.addData(data);
    });

	var tourismeIcon = L.icon({
        iconUrl: 'wp-content/themes/florain/img/tourisme_marker.png',
        iconSize: [34, 52],
        iconAnchor: [14, 42],
        popupAnchor: [0, -35]
    });
    var tourismeLayer = new L.geoJson(null, {
        pointToLayer: function(feature, latlng) {
            return L.marker(latlng, {
                icon: tourismeIcon,
                title: feature.properties.titre
            });
        },
        onEachFeature: onEachFeature
    });
    jQuery.getJSON('wp-content/themes/florain/geojson/tourisme_vacances_we.geojson', function(data) {
        tourismeLayer.addData(data);
    });
    jQuery.getJSON('wp-content/themes/florain/geojson/tourisme_vacances_we-comptoir.geojson', function(data) {
        tourismeLayer.addData(data);
    });

    var brasseriesIcon = L.icon({
        iconUrl: 'wp-content/themes/florain/img/brasseries_marker.png',
        iconSize: [34, 52],
        iconAnchor: [14, 42],
        popupAnchor: [0, -35]
    });
    var brasseriesLayer = new L.geoJson(null, {
        pointToLayer: function(feature, latlng) {
            return L.marker(latlng, {
                icon: brasseriesIcon,
                title: feature.properties.titre
            });
        },
        onEachFeature: onEachFeature
    });
    jQuery.getJSON('wp-content/themes/florain/geojson/brasseries.geojson', function(data) {
        brasseriesLayer.addData(data);
    });
    jQuery.getJSON('wp-content/themes/florain/geojson/brasseries-comptoir.geojson', function(data) {
        brasseriesLayer.addData(data);
    });

    var marchesIcon = L.icon({
        iconUrl: 'wp-content/themes/florain/img/marches_marker.png',
        iconSize: [34, 52],
        iconAnchor: [14, 42],
        popupAnchor: [0, -35]
    });
    var marchesLayer = new L.geoJson(null, {
        pointToLayer: function(feature, latlng) {
            return L.marker(latlng, {
                icon: marchesIcon,
                title: feature.properties.titre
            });
        },
        onEachFeature: onEachFeature
    });
    jQuery.getJSON('wp-content/themes/florain/geojson/marches.geojson', function(data) {
        marchesLayer.addData(data);
    });
    jQuery.getJSON('wp-content/themes/florain/geojson/marches-comptoir.geojson', function(data) {
        marchesLayer.addData(data);
    });

    var seNourrir = L.layerGroup([epiceriesLayer, producteursLayer, boulangersLayer, brasseriesLayer, traiteursLayer, amapLayer]);
    var sortir = L.layerGroup([seRestaurerLayer, cultureLayer, educPopLayer, tourismeLayer]);

	var tousLayer = new L.geoJson(null);

    var epiceriesComptoirLayer = new L.geoJson(null, {
        pointToLayer: function(feature, latlng) {
            return L.marker(latlng, {
                icon: epiceriesIcon,
                title: feature.properties.titre
            });
        },
        onEachFeature: onEachFeature
    });
    jQuery.getJSON('wp-content/themes/florain/geojson/epiceries-comptoir.geojson', function(data) {
        epiceriesComptoirLayer.addData(data);
    });

    var aussiComptoirLayer = new L.geoJson(null, {
        pointToLayer: function(feature, latlng) {
            return L.marker(latlng, {
                icon: aussiIcon,
                title: feature.properties.titre
            });
        },
        onEachFeature: onEachFeature
    });
    jQuery.getJSON('wp-content/themes/florain/geojson/et_aussi-comptoir.geojson', function(data) {
        aussiComptoirLayer.addData(data);
    });

    var boulangersComptoirLayer = new L.geoJson(null, {
        pointToLayer: function(feature, latlng) {
            return L.marker(latlng, {
                icon: boulangersIcon,
                title: feature.properties.titre
            });
        },
        onEachFeature: onEachFeature
    });
    jQuery.getJSON('wp-content/themes/florain/geojson/paysans_boulangers_et_boulangers-comptoir.geojson', function(data) {
        boulangersComptoirLayer.addData(data);
    });

    var soinComptoirLayer = new L.geoJson(null, {
        pointToLayer: function(feature, latlng) {
            return L.marker(latlng, {
                icon: soinIcon,
                title: feature.properties.titre
            });
        },
        onEachFeature: onEachFeature
    });
    jQuery.getJSON('wp-content/themes/florain/geojson/prendre_soin_de_soi-comptoir.geojson', function(data) {
        soinComptoirLayer.addData(data);
    });

    var producteursComptoirLayer = new L.geoJson(null, {
        pointToLayer: function(feature, latlng) {
            return L.marker(latlng, {
                icon: producteursIcon,
                title: feature.properties.titre
            });
        },
        onEachFeature: onEachFeature
    });
    jQuery.getJSON('wp-content/themes/florain/geojson/producteurs-comptoir.geojson', function(data) {
        producteursComptoirLayer.addData(data);
    });

    var cultureComptoirLayer = new L.geoJson(null, {
        pointToLayer: function(feature, latlng) {
            return L.marker(latlng, {
                icon: cultureIcon,
                title: feature.properties.titre
            });
        },
        onEachFeature: onEachFeature
    });
    jQuery.getJSON('wp-content/themes/florain/geojson/se_cultiver_se_divertir_se_detendre-comptoir.geojson', function(data) {
        cultureComptoirLayer.addData(data);
    });

    var seDeplacerComptoirLayer = new L.geoJson(null, {
        pointToLayer: function(feature, latlng) {
            return L.marker(latlng, {
                icon: seDeplacerIcon,
                title: feature.properties.titre
            });
        },
        onEachFeature: onEachFeature
    });
    jQuery.getJSON('wp-content/themes/florain/geojson/se_deplacer-comptoir.geojson', function(data) {
        seDeplacerComptoirLayer.addData(data);
    });

    var seMeublerComptoirLayer = new L.geoJson(null, {
        pointToLayer: function(feature, latlng) {
            return L.marker(latlng, {
                icon: seMeublerIcon,
                title: feature.properties.titre
            });
        },
        onEachFeature: onEachFeature
    });
    jQuery.getJSON('wp-content/themes/florain/geojson/se_meubler_decorer_amenager-comptoir.geojson', function(data) {
        seMeublerComptoirLayer.addData(data);
    });

    var seRestaurerComptoirLayer = new L.geoJson(null, {
        pointToLayer: function(feature, latlng) {
            return L.marker(latlng, {
                icon: seRestaurerIcon,
                title: feature.properties.titre
            });
        },
        onEachFeature: onEachFeature
    });
    jQuery.getJSON('wp-content/themes/florain/geojson/se_restaurer_et_boire_un_verre-comptoir.geojson', function(data) {
        seRestaurerComptoirLayer.addData(data);
    });

    var sengagerComptoirLayer = new L.geoJson(null, {
        pointToLayer: function(feature, latlng) {
            return L.marker(latlng, {
                icon: sengagerIcon,
                title: feature.properties.titre
            });
        },
        onEachFeature: onEachFeature
    });
    jQuery.getJSON('wp-content/themes/florain/geojson/sengager-comptoir.geojson', function(data) {
        sengagerComptoirLayer.addData(data);
    });

    var shabillerComptoirLayer = new L.geoJson(null, {
        pointToLayer: function(feature, latlng) {
            return L.marker(latlng, {
                icon: shabillerIcon,
                title: feature.properties.titre
            });
        },
        onEachFeature: onEachFeature
    });
    jQuery.getJSON('wp-content/themes/florain/geojson/shabiller_sequiper-comptoir.geojson', function(data) {
        shabillerComptoirLayer.addData(data);
    });

    var traiteursComptoirLayer = new L.geoJson(null, {
        pointToLayer: function(feature, latlng) {
            return L.marker(latlng, {
                icon: traiteursIcon,
                title: feature.properties.titre
            });
        },
        onEachFeature: onEachFeature
    });
    jQuery.getJSON('wp-content/themes/florain/geojson/traiteurs-comptoir.geojson', function(data) {
        traiteursComptoirLayer.addData(data);
    });

    var amapComptoirLayer = new L.geoJson(null, {
        pointToLayer: function(feature, latlng) {
            return L.marker(latlng, {
                icon: amapIcon,
                title: feature.properties.titre
            });
        },
        onEachFeature: onEachFeature
    });
    jQuery.getJSON('wp-content/themes/florain/geojson/amap-comptoir.geojson', function(data) {
        amapComptoirLayer.addData(data);
    });

    var educPopComptoirLayer = new L.geoJson(null, {
        pointToLayer: function(feature, latlng) {
            return L.marker(latlng, {
                icon: educPopIcon,
                title: feature.properties.titre
            });
        },
        onEachFeature: onEachFeature
    });
    jQuery.getJSON('wp-content/themes/florain/geojson/associations_deducation_populaire-comptoir.geojson', function(data) {
        educPopComptoirLayer.addData(data);
    });

    var tourismeComptoirLayer = new L.geoJson(null, {
        pointToLayer: function(feature, latlng) {
            return L.marker(latlng, {
                icon: tourismeIcon,
                title: feature.properties.titre
            });
        },
        onEachFeature: onEachFeature
    });
    jQuery.getJSON('wp-content/themes/florain/geojson/tourisme_vacances_we-comptoir.geojson', function(data) {
        tourismeComptoirLayer.addData(data);
    });

    var brasseriesComptoirLayer = new L.geoJson(null, {
        pointToLayer: function(feature, latlng) {
            return L.marker(latlng, {
                icon: brasseriesIcon,
                title: feature.properties.titre
            });
        },
        onEachFeature: onEachFeature
    });
    jQuery.getJSON('wp-content/themes/florain/geojson/brasseries-comptoir.geojson', function(data) {
        brasseriesComptoirLayer.addData(data);
    });

    var marchesComptoirLayer = new L.geoJson(null, {
        pointToLayer: function(feature, latlng) {
            return L.marker(latlng, {
                icon: marchesIcon,
                title: feature.properties.titre
            });
        },
        onEachFeature: onEachFeature
    });
    jQuery.getJSON('wp-content/themes/florain/geojson/marches-comptoir.geojson', function(data) {
        marchesComptoirLayer.addData(data);
    });

    var seNourrirComptoir = L.layerGroup([epiceriesComptoirLayer, producteursComptoirLayer, boulangersComptoirLayer, brasseriesComptoirLayer, traiteursComptoirLayer, amapComptoirLayer]);
    var sortirComptoir = L.layerGroup([seRestaurerComptoirLayer, cultureComptoirLayer, educPopComptoirLayer, tourismeComptoirLayer]);

	var tousComptoirLayer = new L.geoJson(null);

    mymap = new L.map('mapid', {
        layers: [mapTile, tousLayer],
        center: [48.692054, 6.184417],
        zoom: 9,
        doubleClickZoom: false,
        fullscreenControl: true,
        fullscreenControlOptions: {
            position: 'topleft'
        }
    });

	seNourrir.addTo(mymap);
    sortir.addTo(mymap);
    soinLayer.addTo(mymap);
    shabillerLayer.addTo(mymap);
    seDeplacerLayer.addTo(mymap);
    seMeublerLayer.addTo(mymap);
    sengagerLayer.addTo(mymap);
    aussiLayer.addTo(mymap);
    marchesLayer.addTo(mymap);




    var overlays = [{
        groupName: "Tous",
        expanded: true,
        layers: {
            "Tous": tousLayer
        }
    }, {
        groupName: "Se nourrir",
        expanded: true,
        layers: {
            "Epiceries": epiceriesLayer,
            "Producteurs": producteursLayer,
            "Paysans boulangers et boulangers": boulangersLayer,
            "Brasseries": brasseriesLayer,
            "Traiteurs": traiteursLayer,
          	"AMAP": amapLayer
        }
    }, {
        groupName: "Sortir",
        expanded: true,
        layers: {
            "Se restaurer et boire un verre": seRestaurerLayer,
            "Se cultiver, se divertir, se détendre": cultureLayer,
          	"Associations d'éducation populaire": educPopLayer,
          	"Tourisme, vacances, WE": tourismeLayer
        }
    }, {
        groupName: "Prendre soin de soi",
        expanded: true,
        layers: {
            "Prendre soin de soi": soinLayer
        }
    }, {
        groupName: "S'habiller et s'equiper",
        expanded: true,
        layers: {
            "S'habiller et s'équiper": shabillerLayer
        }
    }, {
        groupName: "Se deplacer",
        expanded: true,
        layers: {
            "Se déplacer": seDeplacerLayer
        }
    }, {
        groupName: "Se meubler, decorer, amenager",
        expanded: true,
        layers: {
            "Se meubler, décorer, aménager": seMeublerLayer
        }
    }, {
        groupName: "Et aussi...",
        expanded: true,
        layers: {
            "Et aussi": aussiLayer
        }
    }, {
        groupName: "S'engager",
        expanded: true,
        layers: {
            "S'engager": sengagerLayer
        }
    }, {
        groupName: "Marches",
        expanded: true,
        layers: {
            "Marches": marchesLayer
        }
    }];

    soinLayer.StyledLayerControl = {
        hiddenSubLayers: true
    };

    shabillerLayer.StyledLayerControl = {
        hiddenSubLayers: true
    };

    seDeplacerLayer.StyledLayerControl = {
        hiddenSubLayers: true
    };

    seMeublerLayer.StyledLayerControl = {
        hiddenSubLayers: true
    };

    aussiLayer.StyledLayerControl = {
        hiddenSubLayers: true
    };

    sengagerLayer.StyledLayerControl = {
        hiddenSubLayers: true
    };
    marchesLayer.StyledLayerControl = {
        hiddenSubLayers: true
    };
	tousLayer.StyledLayerControl = {
        hiddenSubLayers: true
    };


    var overlaysComptoir = [{
        groupName: "Tous",
        expanded: true,
        layers: {
            "Tous": tousComptoirLayer
        }
    }, {
        groupName: "Se nourrir",
        expanded: true,
        layers: {
            "Epiceries": epiceriesComptoirLayer,
            "Producteurs": producteursComptoirLayer,
            "Paysans boulangers et boulangers": boulangersComptoirLayer,
            "Brasseries": brasseriesComptoirLayer,
            "Traiteurs": traiteursComptoirLayer,
          	"AMAP": amapComptoirLayer
        }
    }, {
        groupName: "Sortir",
        expanded: true,
        layers: {
            "Se restaurer et boire un verre": seRestaurerComptoirLayer,
            "Se cultiver, se divertir, se détendre": cultureComptoirLayer,
          	"Associations d'éducation populaire": educPopComptoirLayer,
          	"Tourisme, vacances, WE": tourismeComptoirLayer
        }
    }, {
        groupName: "Prendre soin de soi",
        expanded: true,
        layers: {
            "Prendre soin de soi": soinComptoirLayer
        }
    }, {
        groupName: "S'habiller et s'equiper",
        expanded: true,
        layers: {
            "S'habiller et s'équiper": shabillerComptoirLayer
        }
    }, {
        groupName: "Se deplacer",
        expanded: true,
        layers: {
            "Se déplacer": seDeplacerComptoirLayer
        }
    }, {
        groupName: "Se meubler, decorer, amenager",
        expanded: true,
        layers: {
            "Se meubler, décorer, aménager": seMeublerComptoirLayer
        }
    }, {
        groupName: "S'engager",
        expanded: true,
        layers: {
            "S'engager": sengagerComptoirLayer
        }
    }, {
        groupName: "Et aussi...",
        expanded: true,
        layers: {
            "Et aussi": aussiComptoirLayer
        }
    }, {
        groupName: "Marches",
        expanded: true,
        layers: {
            "Marches": marchesComptoirLayer
        }
    }];

    soinComptoirLayer.StyledLayerControl = {
        hiddenSubLayers: true
    };

    shabillerComptoirLayer.StyledLayerControl = {
        hiddenSubLayers: true
    };

    seDeplacerComptoirLayer.StyledLayerControl = {
        hiddenSubLayers: true
    };

    seMeublerComptoirLayer.StyledLayerControl = {
        hiddenSubLayers: true
    };

    aussiComptoirLayer.StyledLayerControl = {
        hiddenSubLayers: true
    };

    sengagerComptoirLayer.StyledLayerControl = {
        hiddenSubLayers: true
    };
    marchesComptoirLayer.StyledLayerControl = {
        hiddenSubLayers: true
    };
	tousComptoirLayer.StyledLayerControl = {
        hiddenSubLayers: true
    };


    var options = {
        //            container_maxHeight : "100%",
        collapsed: true
        /*group_togglers : {show :true}*/
    };

    layersControl = new L.Control.styledLayerControl(null, overlays, options);
    layersComptoirControl = new L.Control.styledLayerControl(null, overlaysComptoir, options);

    mymap.addControl(layersControl);

	jQuery("#leaflet-control-accordion-layers-0").insertBefore("#leaflet-control-accordion-layers-1");
	mymap.on('overlayadd', function(eo){ 
      if (eo.layer === tousLayer ){
        layersControl.selectGroup( "Se nourrir" );
        layersControl.selectGroup( "Sortir" );
        layersControl.selectGroup( "Prendre soin de soi" );
        layersControl.selectGroup( "S'habiller et s'equiper" );
        layersControl.selectGroup( "Se deplacer" );
        layersControl.selectGroup( "Se meubler, decorer, amenager" );
        layersControl.selectGroup( "Et aussi..." );
        layersControl.selectGroup( "S'engager" );
        layersControl.selectGroup( "Marches" );
      } else if (eo.layer === tousComptoirLayer) {
        layersComptoirControl.selectGroup( "Se nourrir" );
        layersComptoirControl.selectGroup( "Sortir" );
        layersComptoirControl.selectGroup( "Prendre soin de soi" );
        layersComptoirControl.selectGroup( "S'habiller et s'equiper" );
        layersComptoirControl.selectGroup( "Se deplacer" );
        layersComptoirControl.selectGroup( "Se meubler, decorer, amenager" );
        layersComptoirControl.selectGroup( "Et aussi..." );
        layersComptoirControl.selectGroup( "S'engager" );
        layersComptoirControl.selectGroup( "Marches" );
      }
    });
	mymap.on('overlayremove', function(eo){ 
      if (eo.layer === tousLayer){
        layersControl.unSelectGroup( "Se nourrir" );
        layersControl.unSelectGroup( "Sortir" );
        layersControl.unSelectGroup( "Prendre soin de soi" );
        layersControl.unSelectGroup( "S'habiller et s'equiper" );
        layersControl.unSelectGroup( "Se deplacer" );
        layersControl.unSelectGroup( "Se meubler, decorer, amenager" );
        layersControl.unSelectGroup( "Et aussi..." );
        layersControl.unSelectGroup( "S'engager" );
        layersControl.unSelectGroup( "Marches" );
      } else if (eo.layer === tousComptoirLayer) {
        layersComptoirControl.unSelectGroup( "Se nourrir" );
        layersComptoirControl.unSelectGroup( "Sortir" );
        layersComptoirControl.unSelectGroup( "Prendre soin de soi" );
        layersComptoirControl.unSelectGroup( "S'habiller et s'equiper" );
        layersComptoirControl.unSelectGroup( "Se deplacer" );
        layersComptoirControl.unSelectGroup( "Se meubler, decorer, amenager" );
        layersComptoirControl.unSelectGroup( "Et aussi..." );
        layersComptoirControl.unSelectGroup( "S'engager" );
        layersComptoirControl.unSelectGroup( "Marches" );
      }
    });

	const elementToObserve = document.querySelector(".leaflet-control-container");
	const observer = new MutationObserver(function() {
      if(jQuery('div').index(jQuery('#leaflet-control-accordion-layers-0')) > jQuery('div').index(jQuery('#leaflet-control-accordion-layers-1'))){
   		jQuery("#leaflet-control-accordion-layers-0").insertBefore("#leaflet-control-accordion-layers-1");
	}
	});
	observer.observe(elementToObserve, {subtree: true, childList: true});

    jQuery('[type=radio][name=map-choice]').change(function() {
        if (this.value == 'comptoir') {
            
            mymap.removeLayer(seNourrir);
            mymap.removeLayer(sortir);
            mymap.removeLayer(soinLayer);
            mymap.removeLayer(shabillerLayer);
            mymap.removeLayer(seDeplacerLayer);
            mymap.removeLayer(seMeublerLayer);
            mymap.removeLayer(sengagerLayer);
            mymap.removeLayer(aussiLayer);
            mymap.removeLayer(marchesLayer);
          	mymap.removeLayer(tousLayer);
            mymap.removeControl(layersControl);
            mymap.addControl(layersComptoirControl);
            mymap.addLayer(seNourrirComptoir);
            mymap.addLayer(sortirComptoir);
            mymap.addLayer(soinComptoirLayer);
            mymap.addLayer(shabillerComptoirLayer);
            mymap.addLayer(seDeplacerComptoirLayer);
            mymap.addLayer(seMeublerComptoirLayer);
            mymap.addLayer(sengagerComptoirLayer);
            mymap.addLayer(aussiComptoirLayer);
            mymap.addLayer(marchesComptoirLayer);
          	mymap.addLayer(tousComptoirLayer);
        } else if (this.value == 'acteurs') {

            mymap.removeLayer(seNourrirComptoir);
            mymap.removeLayer(sortirComptoir);
            mymap.removeLayer(soinComptoirLayer);
            mymap.removeLayer(shabillerComptoirLayer);
            mymap.removeLayer(seDeplacerComptoirLayer);
            mymap.removeLayer(seMeublerComptoirLayer);
            mymap.removeLayer(sengagerComptoirLayer);
            mymap.removeLayer(aussiComptoirLayer);
            mymap.removeLayer(marchesComptoirLayer);
          	mymap.removeLayer(tousComptoirLayer);
            mymap.removeControl(layersComptoirControl);
            mymap.addControl(layersControl);
             mymap.addLayer(seNourrir);
            mymap.addLayer(sortir);
            mymap.addLayer(soinLayer);
            mymap.addLayer(shabillerLayer);
            mymap.addLayer(seDeplacerLayer);
            mymap.addLayer(seMeublerLayer);
            mymap.addLayer(sengagerLayer);
            mymap.addLayer(aussiLayer);
            mymap.addLayer(marchesLayer);
          	mymap.addLayer(tousLayer);
        }
    });




