/**
 * editPage
 *
 * Class for setup and maintain card's SVG editing environment
 * @author Bobr <bobr@cleverbug.com>
 */
editPage = {};

/**
 * Setup HTML and SVG environment for future editing interactions, initiate SVG and fonts loading
 * @public
 * @param {Object} options  Data with webview settings, product details and other params for proper environment setup
 */
editPage.setupEnvironment = function(options) {
    editPage.ready = false; // flag which shows what SVG environment setted up and ready to interact
    editPage.photos = [];   // main array with photos editing
    editPage.in_photo_editing_mode = false;

    // Save params for later use
    editPage.options = options;
    editPage.card = options.product[options.current_view]; // shortcut for current webview settings

    // Save old and recalc card dimensions according to bleed area
    editPage.card.originalSize = {width: editPage.card.size.width, height: editPage.card.size.height};
    editPage.card.size.width -= (editPage.card.bleed.left + editPage.card.bleed.right);
    editPage.card.size.height -= (editPage.card.bleed.top + editPage.card.bleed.bottom);

    // Setup meta for proper output
    $('meta[name="viewport"]').attr('content', 'width=' + editPage.card.size.width + ', height=' + editPage.card.size.height + ', user-scalable=no');

    // Set sizes
    $('#svg-container-crop, #svg-anim-container').css({width: editPage.card.size.width + 'px', height: editPage.card.size.height + 'px'});

    // Apply bleed offset
    $('#svg-container').css({top: (-editPage.card.bleed.top) + 'px', left: (-editPage.card.bleed.left) + 'px', width: (editPage.card.originalSize.width) + 'px', height: (editPage.card.originalSize.height) + 'px'});

    // Add SVG into it with this method because of domains access restrictions
    $('#svg-container').svg({loadURL: editPage.card.svg, onLoad: editPage.prepareSvg, settings: {}, initPath: ''});

    // Register fonts
    $.each(editPage.options.product.fonts, function(index, font) {
        editPage.registerFont(font);
    });
}

/**
 * Calls after SVG initial load. Continue setting up environment: add styles, editable fields, photo interactions
 * @private
 */
editPage.prepareSvg = function() {
    var border_width = 2; // border width around editable fields

    // Get jquery.svg object
    var svg = $('#svg-container').svg('get');
    editPage.svg = svg;

    // Remove viewBox because of interaction and other matrixes bugs
    svg.root().removeAttribute('viewBox');

    // Append our styles
    $(svg.root()).after('<style>body, input, textarea {background: transparent; margin: 0; padding: 0;}'
        + 'input, textarea {border: ' + border_width + 'px solid rgba(225, 84, 84, 0); border-radius: 0; background: rgba(255, 255, 255, 0) url("./../images/edit_page_pencil_icon.png") no-repeat 1000px 50%; background-size: auto 80%; -webkit-appearance: none; resize: none; white-space: pre; word-wrap: normal; overflow: hidden; padding: 0 0 0 1px}'
        + 'textarea {white-space: pre-wrap;}'
        + 'input:disabled, textarea:disabled {opacity: 1 !important;}'
        + '.photo-editing-icon {opacity: 0; pointer-events: none;}'
        + '</style>');
    // indexes of <text> to gruop <tspan> from same <text>
    var textIndexes = [];
    // Let's find all editable text
    $('text, tspan', svg.root()).filter('.editable').each(function() {
        var el = $(this);

        // Extract the name for input
        var matches = el.attr('class').match(/(__EDITABLE_(\d+)__)/);
        if (!matches) {
            return;
        }
        var name = matches[1];
        var nameIndex = matches[2];

        var text = el.is('tspan') ? el.parent('text') : el;
        // if card has multiline turned on all <tspan> elements in one <text> are treated as multiline
        var isMultiline = editPage.svg.root().getAttribute('multiline') != 'off' && el.is('tspan');

        // Extract matrix coords
        var reg = /([\d\.]+)\s([\d\.]+)\)/;
        var matches = text.attr('transform').match(reg);
        if (!matches) {
            return;
        }

        // Extract font size
        var font_size = Number(el.attr('font-size'));

        // Hide old SVG text tag
        el.css('visibility', 'hidden');

        var foreignObject;
        var editField;
        if (isMultiline) {
            var textIndex = text.index();
            // for multiline edit if not first line
            if (textIndexes.indexOf(textIndex) >= 0) {
                // foreignobject must have been added after <text>
                foreignObject = text.next();
                editField = foreignObject.children('textarea');
                // line append changes
                //var height = editField.data('height') + font_size;
                editField
                    .css({height: 'auto'}) // set to "auto" and control height with "rows"
                    .val( editField.val() + '\n' + el.text().trim())
                    //.data({height: height})
                    .attr('rows', Number(editField.attr('rows')) + 1)
                    .attr('name', editField.attr('name').replace(/__$/, '_' + nameIndex + '__'));

                // if any line is not optional, the whole textarea is not optional
                if (!el.is('.optional')) {
                    editField.removeClass('optional');
                }

                //foreignObject.attr('height', Number(foreignObject.attr('height')) + font_size); // firefox needs that
                return;
            }

            // first line for multiline edit
            textIndexes.push(textIndex);
        }

        // --- code below is only executed if it's not a first  line of  multline edit --- //

        // Extract and calc proper x and y coords for input field
        var x = Number(matches[1]);
        if (el.attr('def-y')) {
            var y = Number(el.attr('def-y')) - border_width - editPage.card.bleed.top; // Best method if def-y defined
        } else if (text.prev().is('rect')) {
            var y = Number(text.prev().attr('y')) + (el.attr('y') ? Number(el.attr('y')) : 0) - border_width; // Some tricky but work method
        } else {
            var y = Number(matches[2]) - (font_size > 35 ? 0 : Number(font_size / 10 * 5)) - border_width; // Mircea site's old method
        }

        // Try to find predefined width
        //var width = Number(el.attr('def-width'));
        var width = 0;

        // If text-align="center" then x coord must be 0
        if (el.attr('text-align') == 'center') {
            width = width ? width + (border_width * 2) : editPage.card.size.width;
            width *= 0.95; // limit maximum width more strictly for more proper PDF generation. Related to PANORAMA-2583
            x = (editPage.card.size.width - width) / 2 - border_width + editPage.card.bleed.left;
        } else {
            x -= border_width; // minus border width
            width = width ? width + (border_width * 2) : editPage.card.size.width - x;
            width *= 0.95; // limit maximum width more strictly for more proper PDF generation. Related to PANORAMA-2583
        }

        // Create foreignObject object for future injecting it into SVG
        // We need to use document.createElementNS, because foreignObject not works if you simply insert it in DOM with jQuery
        foreignObject = document.createElementNS("http://www.w3.org/2000/svg", "foreignObject");
        foreignObject.setAttribute("x", x);
        foreignObject.setAttribute("y", y);
        foreignObject.setAttribute("width", width);
        foreignObject.setAttribute("height", font_size + 20); // <-- there may be bug

        // Create input field inside created foreignObject
        editField = isMultiline ? $('<textarea />') : $('<input />');
        editField.addClass('optional').css({
            position: 'relative',
            width: width - 2*border_width + 'px',
            'font-family': el.attr('font-family'),
            'text-align': el.attr('text-align'),
            'font-size': font_size + 'px',
            'line-height': (font_size * 1.2) + 'px',
            color: el.attr('fill'),
        }).val(el.text())
            .attr('name', name)
            .attr('tabindex', name.match(/(\d+)/)[1])
            .data({x: x, y: y, width: width, height: font_size});

        // no need to add height or rows attribute for <input>
        if (isMultiline) {
            // pencil to be max 2 times font size or 40px
            editField.css({height: font_size + 6, 'background-size': Math.min(40, font_size * 2)})
                .attr('rows', 1).data({height: font_size + 6});
        }

        // by default all fields have optional class that we could remove it if any multiline field hasn't
        if (!el.is('.optional')) {
            editField.removeClass('optional');
        }

        // Create input/textaread field inside created foreignObject
        $(foreignObject).append('<body />').append(editField);

        // Inject foreignObject after proper SVG element
        text.after(foreignObject);
    });
    
    // Remove all trailing empty lines for textareas
    $('textarea').each(function(){
        this.value = this.value.replace(/[\s\n]+$/g, '');
    });

    // Apply limiter plugin to input and textarea
    $('input, textarea').limiter()
        .keydown(function(e){
            // Mark input as already edited
            $(this).addClass('edited');
            
            // Blur input if Enter key pressed
            if (e.which == 13 && $(this).is('input')) {
                e.target.blur();
                return;
            }
        })
        .focus(function(){
        	var that = this;

        	// Hide borders on all editing fields
            editPage.hideBorders();
            var tmp = $(this).stop(true, true);

            // Remember old colors and set new one for clear editing, show bottom border
            tmp.data('prev_font_color', tmp.css('color'));
            tmp.data('prev_border_color', tmp.css('border-color'));
            tmp.css({'border-color': 'transparent transparent black transparent', 'border-style': 'solid'})
                .css('background-position', function() {
                    var vPosition = $(this).is('textarea') ? '100%' : '50%';
                    return '100% ' + vPosition;
                })
                .animate({'color': '#444', 'background-color': 'rgba(255,255,255,1)'}, {duration: 600, queue: false});

            // Zoom to field for best interaction if needed
            var offset = tmp.offset();
            if (editPage.options.viewport_width > editPage.options.viewport_height) { //landscape flow
                if (editPage.options.is_ios && !editPage.options.os_version.match(/^[1-4]\./)) { // doing this only for iOS 5+ (older versions has other issues, not doing zoom for them)
                    // Hacks for "scroll-to-field" behavior
                    setTimeout(function(){$(window).scrollTop(0);}, 500); // for iOS 6+
                    $(window).scrollTop(0); // <-- important part because of default iOS "scroll-to-field" behavior (iOS 5)

                    // Zoom to field
                    editPage.zoomToRect({x: tmp.data('x'), y: tmp.data('y'), width: tmp.data('width'), height: tmp.data('height')});
                }
            } else { // vertical flow
                if (editPage.options.is_ios && !editPage.options.os_version.match(/^[1-4]\./)) { // doing this only for iOS 5+ (older versions has other issues, not doing zoom for them)
                    // Zoom to field only if it "small"
                    if (tmp.height() < editPage.card.size.width / 10) {
                        // Hacks for "scroll-to-field" behavior
                        setTimeout(function(){$(window).scrollTop(0);}, 500); // for iOS 6+
                        $(window).scrollTop(0); // <-- important part because of default iOS "scroll-to-field" behavior (iOS 5)

                        // Zoom to field
                        editPage.zoomToRect({x: tmp.data('x'), y: tmp.data('y') + tmp.data('width') / 2 - tmp.data('height') / 2, width: tmp.data('width'), height: tmp.data('height')});
                    }
                }
            }

            // Notice app about focus action
            if (typeof(Ti) != 'undefined') { // for Safari testing
                Ti.App.fireEvent('EditPage.onTextFieldFocus');
            }
        })
        .blur(function(){
            var tmp = $(this).stop(true, true);

            // Revert back old colors
            tmp.css({'border-color': tmp.data('prev_border_color'), 'border-style': 'solid'})
                .animate({'color': tmp.data('prev_font_color'), 'background-color': 'rgba(255,255,255,0)'}, {duration: 600, queue: false});

            // Hide pencil, if edited
            if (tmp.is('.edited')) {
                tmp.css('background-position', function() {
                    var vPosition = $(this).is('textarea') ? '100%' : '50%';
                    return '1000px ' + vPosition;
                });
            }

            // Zoom out and show borders again
            editPage.zoomToRect();
            editPage.showBorders();

            // Notice app about focus action
            if (typeof(Ti) != 'undefined') { // for Safari testing
                Ti.App.fireEvent('EditPage.onTextFieldBlur');
            }

            // Detect Emoji used (may be moved into EditPage in future)
            if (this.value && editPage.detectEmoji(this.value)) {
                alert("We're sorry but the Emoji icons are not yet fully supported so they will not print as they appear on screen.");
            }
        });
    //end $('input, textarea')

    // Mark SVG as ready to interact (need to do that in this place)
    editPage.ready = true;

    // Let's find integrated photos inside SVG and store them in array
    var tmp = [];
    $('g[id*="PHOTO"]').each(function(){
        var matches = $(this).attr('id').match(/(\d+)/);
        if (!matches.length) return;
        tmp.push(Number(matches[1]));
    });

    // Sort photos ASC and register them
    tmp.sort(function(a,b){return a-b;});
    for (var i = 0; i < tmp.length; i++) {
        editPage.registerPhotoById('PHOTO' + tmp[i]);
    }

    // If this is photomontage card, need to add interaction for other photos from params
    if (editPage.card.plugin) {
        for (var id in editPage.card.plugin.params) {
            editPage.registerPhotoById(id);
        }
    }

    // Deferred insert of photos (if there some)
    if (editPage.photosDeferred) {
        $.each(editPage.photosDeferred, function(index, value){
            editPage.registerPhotoById(value.name, value.url);
        });
    }

    // Update images sizes data (also using this stuff as image preloader)
    editPage.updateImagesSizesData(function(){
        if (typeof(Ti) != 'undefined') { // for Safari testing
            // Told to App what setup is complete
            Ti.App.fireEvent('EditPage.onSvgReady', {'view' : editPage.options.current_view});
        }
    });
};

/**
 * Calls after SVG initial load. Continue setting up environment: add styles, editable fields, photo interactions
 * @public
 * @param {String} name  ID (id attr) of the container where photo must be setted up/inserting
 * @param {String} [url] URL of image inserting. If not present, trying to find proper image inside container
 */
editPage.registerPhotoById = function(name, url) {
    // If SVG not ready yet, store data for deferred photo insert
    if (!editPage.ready) {
        if (!editPage.photosDeferred) {
            editPage.photosDeferred = [];
        }
        editPage.photosDeferred.push({name: name, url: url});
        return;
    }

    // Try to find if this name already initialized by another call
    for (var i = 0; i < editPage.photos.length; i++) {
        if (editPage.photos[i].name == name) {
            return;
        }
    }

    // Trying to find container
    var el = $('#' + name).first();
    if (el.is('g')) {
        el = el.find('rect');
    }
    if (!el.size()) {
        return;
    }

    // Extrat basic dimensions and coord data
    var x = Number(el.attr('x') ? el.attr('x') : 0);
    var y = Number(el.attr('y') ? el.attr('y') : 0);
    var width = Number(el.attr('width'));
    var height = Number(el.attr('height'));

    // Calc icon position based on bounds of rect
    if (Math.min(width, height) <= Math.min(editPage.card.size.width, editPage.card.size.height) / 2) {
        var icon_size = 60;
        //var icon_x = x + width - icon_size / 2;
        //var icon_y = y + height - icon_size / 2;
    } else {
        var icon_size = 120;
    }
    var icon_x = x + (width - icon_size) / 2;
    var icon_y = y + (height - icon_size) / 2;

    if (url) {
        // Create and insert new image
        var image = editPage.svg.image(null, x, y, width, height, url);
        el.after(image);
        image = $(image);
    } else {
        // Trying to find image
        var image = $('#' + name).find('image').first();

        // Create one, if not found
        if (!image.size()) {
            if (typeof(Ti) != 'undefined') { // for Safari testing
                Ti.API.info('no image found for ' + name);
            }
            var image = $(editPage.svg.image(null, x, y, width, height));
            el.after(image);
        }
    }

    // Prepare image if it's photomontage-type card
    if (editPage.card.plugin) {
        image.css({opacity: 0, display: 'none'});

        // Set default image coords and size according to rect size
        image.attr({
            x: x,
            y: y,
            width: width,
            height: height,
        });

        // Reset transform matrix
        image.attr('transform', '');
    }

    /*// Apply clip-path
    if (el.attr('clip-path') && el.parent().is('g') && !el.parent().attr('clip-path')) {
        el.parent().attr('clip-path', el.attr('clip-path'));
        el.attr('clip-path', '');
    }*/

    // Add icon to image for entering in editing mode
    var icon = $(editPage.svg.image(editPage.svg.root(), icon_x, icon_y, icon_size, icon_size,
        './../images/edit_page_camera_icon.png'));
    icon.attr('index', editPage.photos.length).addClass('photo-editing-icon');

    // Add photo click-interactions possibility
    image.click(editPage.editPhoto).attr('index', editPage.photos.length);
    el.click(editPage.editPhoto).attr('index', editPage.photos.length);

    // Fill data about this photo
    var photo = {
        x: x,
        y: y,
        width: width,
        height: height,
        index: editPage.photos.length,
        name: name,
        is_edited: false,
        image: image,
        icon: typeof(icon) != 'undefined' ? icon : null,
    };

    // Calculate cropRect if it's photomontage-type card
    if (editPage.card.plugin) {
        // Getting crop ratio from plugin options
        photo.plugin_ratio = (editPage.card.plugin.params[name] && editPage.card.plugin.params[name].ratio) ?
            editPage.card.plugin.params[name].ratio : editPage.card.plugin.input.ratio;

        // Bound values with maximum possible dimensions (for proper calcs)
        photo.width = Math.min(photo.width, editPage.card.size.width);
        photo.height = Math.min(photo.height, editPage.card.size.height);

        // Calc crop rect coords and dimensions by ratio
        if (photo.width / photo.height > photo.plugin_ratio) {
            var cropRect = {
                width: photo.height * photo.plugin_ratio,
                height: photo.height,
            }
        } else {
            var cropRect = {
                width: photo.width,
                height: photo.width / photo.plugin_ratio,
            }
        }
        cropRect.x = photo.x + (photo.width - cropRect.width) / 2;
        cropRect.y = photo.y + (photo.height - cropRect.height) / 2;

        // Move cropping rect, if it too close to bounds
        cropRect.x = Math.max(cropRect.x, 8);
        cropRect.y = Math.max(cropRect.y, 8);

        if (editPage.card.size.width - (cropRect.x + cropRect.width) < 8) {
            cropRect.x -= 8;
        }
        if (editPage.card.size.height - (cropRect.y + cropRect.height) < 8) {
            cropRect.y -= 8;
        }

        photo.cropRect = cropRect;
    }


    // Add photo to array
    editPage.photos.push(photo);
}

/**
 * Edit photo
 * @private
 */
editPage.editPhoto = function() {
    // If current_photo already setted
    if (editPage.current_photo) return;

    // Enter to photo editing mode
    editPage.enterPhotoEditingMode();

    // Get editing photo from current context (click)
    var photo = editPage.photos[$(this).attr('index')];
    photo.is_edited = true; // mark as edited

    // Fill basic data for zooming rect
    var rect = {
        x: photo.x,
        y: photo.y,
        width: photo.width,
        height: photo.height,
    }

    // Change edit output if it's photomontage
    if (editPage.card.plugin) {

        // Create overlay mask
        var settings = {fill: '#333333', opacity: 0, 'class': 'photo-editing-overlay photo-editing-mask'};
        editPage.svg.rect(editPage.svg.root(), 0, -2, editPage.card.size.width + 20, photo.cropRect.y + 2.5, 0, 0, settings); // top
        editPage.svg.rect(editPage.svg.root(), 0, photo.cropRect.y + photo.cropRect.height - 0.5, editPage.card.size.width + 20, editPage.card.size.height - photo.cropRect.y - photo.cropRect.height + 20, 0, 0, settings); // bottom
        editPage.svg.rect(editPage.svg.root(), 0, photo.cropRect.y, photo.cropRect.x, photo.cropRect.height, 0, 0, settings); // left
        editPage.svg.rect(editPage.svg.root(), photo.cropRect.x + photo.cropRect.width, photo.cropRect.y, editPage.card.size.width, photo.cropRect.height, 0, 0, settings); // right

        // Create dim overlay
        var settings = {fill: '#F1EEE9', opacity: 0, 'class': 'photo-editing-overlay photo-editing-dim'};
        photo.image.before(editPage.svg.rect(null, 0, 0, editPage.card.size.width, editPage.card.size.height, 0, 0, settings));

        // Create white corners
        var length = Math.min(photo.cropRect.width, photo.cropRect.height) / 6;
        var settings = {fill: 'none', stroke: 'white', opacity: 0, 'class': 'photo-editing-overlay photo-editing-corner', strokeWidth: length / 10};
        editPage.svg.polyline(null, [[photo.cropRect.x, photo.cropRect.y + length], [photo.cropRect.x, photo.cropRect.y], [photo.cropRect.x + length, photo.cropRect.y]], settings); // top-left
        editPage.svg.polyline(null, [[photo.cropRect.x + photo.cropRect.width - length, photo.cropRect.y], [photo.cropRect.x + photo.cropRect.width, photo.cropRect.y], [photo.cropRect.x + photo.cropRect.width, photo.cropRect.y + length]], settings); // top-right
        editPage.svg.polyline(null, [[photo.cropRect.x, photo.cropRect.y + photo.cropRect.height - length], [photo.cropRect.x, photo.cropRect.y + photo.cropRect.height], [photo.cropRect.x + length, photo.cropRect.y + photo.cropRect.height]], settings); // bottom-left
        editPage.svg.polyline(null, [[photo.cropRect.x + photo.cropRect.width - length, photo.cropRect.y + photo.cropRect.height], [photo.cropRect.x + photo.cropRect.width, photo.cropRect.y + photo.cropRect.height], [photo.cropRect.x + photo.cropRect.width, photo.cropRect.y + photo.cropRect.height - length]], settings); // bottom-right

        // Show photo, mask, dimmer and corners
        photo.image.stop(true, true).delay(900).css({opacity: 0, display: ''}).animate({'opacity': 1}, 600);
        $('.photo-editing-mask').animate({'opacity': 1}, 600);
        $('.photo-editing-dim').delay(900).animate({'opacity': 0.6}, 600);
        $('.photo-editing-corner').delay(900).animate({'opacity': 1}, 600);
    }

    // Zoom to interaction space
    editPage.zoomToRect(editPage.card.plugin ? photo.cropRect : rect, function(scale_factor){
        // Enable interactions
        var offset = $(this).offset();
        photo.image.svgpan({enableRotate: true, currentZoom: scale_factor, currentOffset: {x: -offset.left / scale_factor, y: -offset.top / scale_factor}});
    });

    // Notice app about photo editing action
    if (typeof(Ti) != 'undefined') { // for Safari testing
        Ti.App.fireEvent('EditPage.onEditPhoto', {index: photo.index, name: photo.name, ratio: photo.width / photo.height});
    }

    editPage.current_photo = photo;
}

/**
 * Enter into photo editing mode
 * @private
 */
editPage.enterPhotoEditingMode = function() {
    if (editPage.in_photo_editing_mode) {
        return;
    }
    editPage.in_photo_editing_mode = true;

    // Disable text editing
    editPage.disableEditing();

    // Save current photo params for purpose of reverting
    for (var i = 0; i < editPage.photos.length; i++) {
        editPage.photos[i].image.data('initial_transform', editPage.photos[i].image.attr('transform'));
        editPage.photos[i].image.data('initial_href', editPage.photos[i].image.attr('xlink:href'));
    }
}

/**
 * Exit from the photo editing mode
 * @public
 * @param {Boolean} [revert=false]  Flag which using for reverting back changes on photo
 */
editPage.exitPhotoEditingMode = function(revert) {
    // Exit if we not in photo editing mode
    if (!editPage.current_photo) return;

    // Remove overlays and interactions from image
    editPage.finishEditPhoto();

    // Enable editing and zoom-out from current space
    editPage.enableEditing();
    editPage.zoomToRect();

    // Apply revert, if needed
    if (revert) {
        for (var i = 0; i < editPage.photos.length; i++) {
            // Reverting matrix
            editPage.photos[i].image.attr('transform', editPage.photos[i].image.data('initial_transform') || '');

            // Reverting photo sources
            if (editPage.photos[i].image.data('initial_href') != editPage.photos[i].image.attr('xlink:href')) {
                editPage.replaceImage(editPage.photos[i].index, editPage.photos[i].image.data('initial_href'));
            }
        }
    }

    editPage.in_photo_editing_mode = false;
}

/**
 * Remove overlays and interactions from currently editing image
 * @public
 * @param {Boolean} [revert=false]  Flag which using for reverting back changes on photo
 */
editPage.finishEditPhoto = function() {
    var photo = editPage.current_photo;

    // Disable image interactions
    photo.image.get(0).svgpanDestroy();
    photo.image.get(0).svgpanDestroy = null;

    // Change edit output if it's photomontage
    if (editPage.card.plugin) {
        // Remove overlays
        $('.photo-editing-overlay').remove();

        // Hide photo
        photo.image.stop(true, true).css({opacity: 0, display: 'none'});
    }

    editPage.current_photo = null;
}

/**
 * Doing step forward/backward and entering into editing mode on next photo in a row
 * @public
 * @param {Number} [step=1]  Step of editing from current photo. Positive is forward.
 */
editPage.editNextPhoto = function(step) {
    if (!editPage.current_photo) return;

    if (!step) {
        step = 1;
    }

    var new_index = editPage.current_photo.index + step;
    if (new_index >= editPage.photos.length) {
        new_index = 0;
    }

    if (new_index < 0) {
        new_index = editPage.photos.length - 1;
    }

    // Finish editing of current photo and begin editing of a new one
    editPage.finishEditPhoto();
    editPage.editPhoto.call(editPage.photos[new_index].image);
}

/**
 * Go to editing previous photo in a row
 * @public
 */
editPage.editPreviousPhoto = function() {
    return editPage.editNextPhoto(-1);
}

/**
 * Replaces BACKGROUND image of the photomontage-type card
 * @public
 * @param {String} link  URL link to the new image. Local links are supported too (using in inserting from device)
 */
editPage.replaceBackground = function(link) {
    // Trying to retrive proper BACKGROUND image
    var el = $('#BACKGROUND');
    if (!el.is('image')) {
        el = el.find('image');
    }
    if (!el.size()) {
        if (typeof(Ti) != 'undefined') { // for Safari testing
            Ti.API.info('BACKGROUND image not found. Check SVG code');
        }
        return;
    }

    // Replace a link with the provided one
    el.attr('xlink:href', link);

    editPage.getImageSize(link, function(size){
        if (typeof(Ti) != 'undefined') { // for Safari testing
            // Told to App what images preloading is complete
            Ti.App.fireEvent('EditPage.onBackgroundLoadingComplete');
        }
    });
}

/**
 * Replaces source of a photo image by its index
 * @public
 * @param {Nimber} index Index of a photo in photo array
 * @param {String} link  URL link to the new image. Local links are supported too (using in inserting from device)
 */
editPage.replaceImage = function(index, link) {
    // Check for existance
    if (!editPage.photos[index]) return;
    var photo = editPage.photos[index];

    // Replace a link with the provided one
    photo.image.attr('xlink:href', link);

    // Need to get new image sizes (also works as preloader for notifications)
    photo.image.data('size', null);
    editPage.updateImagesSizesData(function(){
        // Need to relayout photo after replacing, if it currently editing
        if (editPage.current_photo && editPage.current_photo.index == photo.index) {
            // Exit from editing mode (but not canceling)
            editPage.finishEditPhoto();

            // Reset matrix to initial for non-photomontage cards
            if (!editPage.card.plugin) {
                photo.image.attr('transform', photo.image.data('initial_transform'));
            }

            // Enter into editing mode again
            editPage.editPhoto.call(photo);
        }
    });
}

/**
 * Replaces source of a photo image by its name
 * @public
 * @param {String} name  Name of a photo in photo array
 * @param {String} link  URL link to the new image. Local links are supported too (using in inserting from device)
 */
editPage.replaceImageByName = function(name, link) {
    for (var i = 0; i < editPage.photos.length; i++) {
        if (editPage.photos[i].name == name) {
            editPage.replaceImage(i, link);
            break;
        }
    }
}

/**
 * Replaces source of a currently editing photo image
 * @public
 * @param {String} link  URL link to the new image. Local links are supported too (using in inserting from device)
 */
editPage.replaceCurrentImage = function(link) {
    if (!editPage.current_photo) return;
    editPage.replaceImage(editPage.current_photo.index, link);
}

/**
 * Add to photos array information about API-side links on uploaded photos
 * @public
 * @param {Object} data  URL link to the new image. Local links are supported too (using in inserting from device)
 * @see 2.4 of "Mobile API Documentation" (https://cleverbug.atlassian.net/wiki/display/PANORAMA/Mobile+API+Documentation)
 */
editPage.updateLocalImagesInfo = function(data) {
    for (var i = 0; i < editPage.photos.length; i++) {
        var photo = editPage.photos[i];

        // Update info if this that is local image
        if (photo.image.attr('xlink:href') && photo.image.attr('xlink:href').search('file://') === 0 && data[photo.name]) {
            photo.remote_link = data[photo.name].link;
        }
    }
}

/**
 * Zoom viewport to specified rectangle with animation. Fires callback after complete
 * @private
 * @param {Object} [rect]  Rectangle {x, y, width, height} to which need to zoom viewport. Zoom out if omitted
 * @param {Function} [callback]  Calls after animation completeness. Callback has next form: function(scale_factor) where scale_factor is the scale to which viewport is zoomed
 */
editPage.zoomToRect = function(rect, callback) {
    if (rect) {
        // Calculate transformations based on zooming rect
        var scale_factor = Math.min(editPage.card.size.width / rect.width, editPage.card.size.height / rect.height);
        if (scale_factor > 1.5) {
            if (editPage.card.plugin) {
                scale_factor *= 0.95;
            } else {
                scale_factor *= 0.9;
            }
        }
        scale_factor *= 1 + Math.random() * 0.0001; // Hack for firing webkitTransitionEnd event always, even if no changes happens
        var offset_x = (editPage.card.size.width / 2 - (rect.x + rect.width / 2) + editPage.card.bleed.left) * scale_factor; // Need to multiply by scale_factor because of transformation apply flow
        var offset_y = (editPage.card.size.height / 2 - (rect.y + rect.height / 2) + editPage.card.bleed.top)  * scale_factor;
        var transform = 'translate(' + offset_x + 'px, ' + offset_y + 'px) scale(' + scale_factor + ', ' + scale_factor + ')';
    } else {
        var transform = 'scale(1.0)';
    }

    var container = $('#svg-anim-container');

    // Add end animation callback if needed
    if (callback) {
        container.get(0).addEventListener('webkitTransitionEnd', innerCallback);
    }

    // Apply transformations
    container.css({
        '-webkit-transform': transform
    });

    function innerCallback() {
        this.removeEventListener('webkitTransitionEnd', innerCallback);
        callback.call(this, scale_factor);
    }
};

/**
 * Show borders around editable fields and initialize periodical animation of borders flashing
 * @public
 */
editPage.showBorders = function() {
    // Destroy previous timer
    if (editPage.border_animate_timer) {
        clearInterval(editPage.border_animate_timer);
    }

    // Set variables for easier use later
    var alpha_0 = $.Color({ alpha: 0 });
    var alpha_1 = $.Color({ alpha: 0.7 });
    var animate_0 = {
        borderTopColor: alpha_0,
        borderRightColor: alpha_0,
        borderBottomColor: alpha_0,
        borderLeftColor: alpha_0
    };
    var animate_1 = {
        borderTopColor: alpha_1,
        borderRightColor: alpha_1,
        borderBottomColor: alpha_1,
        borderLeftColor: alpha_1
    };

    // Initial "flash" with borders
    $('input, textarea').animate(animate_1, 500)
        .delay(2000).animate(animate_0, 500)
        .css('background-position', function() {
            var vPosition = $(this).is('textarea') ? '100%' : '50%';
            return '100% ' + vPosition;
        });

    $('.photo-editing-icon').animate({opacity: 1}, 500).delay(2000).animate({opacity: 0}, 500);

    // Initialize periodical animation
    editPage.border_animate_timer = setInterval(function(){
        $('input, textarea')
            .animate(animate_1, 500)
            .delay(2000)
            .animate(animate_0, 500);

        $('.photo-editing-icon')
            .animate({opacity: 1}, 500)
            .delay(2000)
            .animate({opacity: 0}, 500);
    }, 8000);
};

/**
 * Hide borders around editable fields and deinitialize periodical animation of borders flashing
 * @public
 */
editPage.hideBorders = function(instant) {
    // Destroy timer
    if (editPage.border_animate_timer) {
        clearInterval(editPage.border_animate_timer);
    }

    // Set variables for easier use later
    var alpha_0 = $.Color({ alpha: 0 });
    var alpha_1 = $.Color({ alpha: 1 });
    var animate_0 = {
        borderTopColor: alpha_0,
        borderRightColor: alpha_0,
        borderBottomColor: alpha_0,
        borderLeftColor: alpha_0
    };

    // Hide borders
    $('input, textarea').clearQueue().stop(true, true).animate(animate_0, instant ? 0 : 600)
        .css('background-position', function() {
            var vPosition = $(this).is('textarea') ? '100%' : '50%';
            return '1000px ' + vPosition;
        });

    // Hide photo editing icons
    $('.photo-editing-icon').clearQueue().stop(true, true).animate({opacity: 0}, instant ? 0 : 600);
};

/**
 * Disable editing of editable fields
 * @public
 */
editPage.disableEditing = function(instant) {
    // Webkit disabled fields style workaround
    $('input,textarea').prop('disabled', true).each(function(){
        var el = $(this);
        el.css('-webkit-text-fill-color', el.css('color'));
    });

    // Hide editing icons and borders
    editPage.hideBorders(instant);
}

/**
 * Enable editing of editable fields
 * @public
 */
editPage.enableEditing = function() {
    // Webkit disabled fields style workaround
    $('input,textarea').prop('disabled', false).each(function(){
        var el = $(this);
        el.css('-webkit-text-fill-color', '');
    });

    // Show editing icons and borders
    editPage.showBorders();
};

/**
 * Download remote font by adding information about it in <style> tag
 * @public
 */
editPage.registerFont = function(font) {
    $('head').append('<style>@font-face {'
        + 'font-family: "' + font.family + '"; font-style: normal; font-weight: 400;'
        + ' src: url("' + font.ttf + '")'
        + ', url("' + font.eot + '")'
        + ', url("' + font.woff + '")'
        + '}</style>');
};

/**
 * Check to see if at least one textfield has been edited
 */
editPage.isEdited = function() {
	// Check to see if at least one text has been edited
	var required = $('input, textarea').filter('.edited');
	if (required.size()) {
		return true;
	}

	return false;
};

/**
 * Check what required text fields is filled and highlight "errors"
 * @public
 * @return {Boolean}
 */
editPage.validate = function() {
    // Validate inputs
    var required = $('input, textarea').not('.optional, .edited');
    if (required.size()) {
        required.stop(true, true).css('border-color', 'red');
        return false;
    }

    return true;
};

/**
 * Returns FALSE if entered text is out of limits
 * @public
 * @return {Boolean}
 */
editPage.validateTextLimits = function() {
    var isValid = true;
    
    // Validate textareas
    $('textarea').each(function(){
        var el = $(this);
        
        if (el.attr('rows') && this.getAsLines().length > el.attr('rows')) {
            el.stop(true, true).css('border-color', 'red');
            isValid &= false;
        }
    });

    return isValid;
};

/**
 * Get images size of provided image link. Callback is called after image load, size params passed inside callback
 * @public
 * @param {String} link  URL of image to load. Local URL is supported
 * @param {Function} callback  Callback function has next form: function(size), where size is {width, height} object
 */
editPage.getImageSize = function(link, callback) {
    var im = new Image();
    im.onload = function(){
        callback({width: im.width, height: im.height});
    };
    im.onerror = function(){
        callback({width: 600, height: 600}); // for debugging
    };
    im.src = link;
};

/**
 * Preload all registered photo images and update their sizes with real data from images
 * When all images loaded(or failed), callback is fired
 * @public
 * @param {Function} callback
 */
editPage.updateImagesSizesData = function(callback) {
    // Create array with photos which sizes need to know
    var need_to_load = [];
    for (var i = 0; i < editPage.photos.length; i++) {
        if (editPage.photos[i].image.data('size')) {
            continue;
        }
        need_to_load.push(i);
    }

    // Update data for appropriate photos
    var loaded = 0;
    if (need_to_load.length) {
        for (var i = 0; i < need_to_load.length; i++) {
            // Create lambda function for storing current index
            (function() {
                var index = need_to_load[i];
                editPage.getImageSize(editPage.photos[index].image.attr('xlink:href'), function(size){
                    // Store size data and apply initial matrix
                    editPage.photos[index].image.data('size', size);
                    editPage.applyInitialMatrix(editPage.photos[index]);
                    loaded++;

                    // Fire events and callbacks if all images loaded
                    if (loaded == need_to_load.length) {
                        if (typeof(Ti) != 'undefined') { // for Safari testing
                            // Told to App what images preloading is complete
                            Ti.App.fireEvent('EditPage.onImagesLoadingComplete');
                        }
                        if (callback) {
                            callback();
                        }
                    }
                });
            })();
        }
    } else {
        // Fallback if nothing to load
        if (typeof(Ti) != 'undefined') { // for Safari testing
            // Told to App what image preloading is complete
            Ti.App.fireEvent('EditPage.onImagesLoadingComplete');
        }
        if (callback) {
            callback();
        }
    }
};

/**
 * Apply initial matrix to photo image for photomotage-type cards.
 * Need to change image position and dimensions because image must be always "inside" cropping ratio mask
 * @public
 * @param {Object} photo
 */
editPage.applyInitialMatrix = function(photo) {
    if (editPage.card.plugin) {
        var dimensions = photo.image.data('size');

        // Calculate width and height of image for SVG and cropping mask ratio
        if (dimensions.width / dimensions.height < photo.plugin_ratio) {
            var tmp = {
                width: photo.cropRect.width,
                height: photo.cropRect.width / (dimensions.width / dimensions.height)
            }
        } else {
            var tmp = {
                width: photo.cropRect.height * (dimensions.width / dimensions.height),
                height: photo.cropRect.height
            }
        }

        tmp.x = photo.cropRect.x;
        tmp.y = photo.cropRect.y;

        // Apply new image attributes
        photo.image.attr(tmp);

        // Translate the image according to offsets. We must do it with matrix (not with x and y values) because need proper post-processing on API side
        var imageSVG = photo.image.get(0);
        var transform = imageSVG.ownerSVGElement.createSVGTransform();
        transform.setMatrix(editPage.svg.root().createSVGMatrix().translate(-(tmp.width - photo.cropRect.width) / 2, -(tmp.height - photo.cropRect.height) / 2));
        imageSVG.transform.baseVal.initialize(transform);
    }
};

/**
 * Detects Emoji chars into string given
 * @private
 * @return {Boolean}
 */
editPage.detectEmoji = function(value)
{
    return value.search(/([\uE000-\uF8FF]|\u2764|\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDEFF])/g) != -1;
};

/**
 * Returns result editing data with text from editable fields and photo matrixes with other params
 * @public
 * @return {String}  JSON-encoded resulting object with data
 * @see 2.4 of "Mobile API Documentation" (https://cleverbug.atlassian.net/wiki/display/PANORAMA/Mobile+API+Documentation)
 */
editPage.getData = function() {
    // Create result array
    var result = {text: {}, photo: {}};

    // Fill result array with text from editable fields
    $('input, textarea', editPage.svg.root()).each(function() {
        var match = this.name.match(/\d+/g);
        var valueArray = this.getAsLines();
        for (var i in match) {
            result.text['__EDITABLE_' + match[i] + '__'] = valueArray[i] ? valueArray[i] : '';
        }
    });

    // Fill result array with photo editing data
    $.each(editPage.photos, function(index, photo){
        var matrix = photo.image.get(0).getCTM();

        result.photo[photo.name] = {options: {}};

        // Need to recalc matrix's translate values from SVG-space coords to image space (only for photomontage cards)
        if (photo.is_edited && editPage.card.plugin && photo.image.data('size')) {
            //var ratio = photo.image.data('size').width / photo.image.attr('width'); // moved to server side because of PANORAMA-1386
            var scale = Math.sqrt(matrix.a*matrix.a + matrix.b*matrix.b); // calc scale

            // Create and transform top-left cropping mask point with image martix to calculate proper translate values later
            // This transform point needed because of rotation interaction
            var p = editPage.svg.root().createSVGPoint();
            p.x = photo.cropRect.x;
            p.y = photo.cropRect.y;
            p = p.matrixTransform(matrix);

            // Also apply origin offset, because transforms in SVG applyed from origin of the viewport (http://www.w3.org/TR/SVG/coords.html#Introduction)
            matrix.e = ((p.x - photo.cropRect.x * scale) + Number(photo.image.attr('x')) * (scale - 1)); // damn voodoo magic!
            matrix.f = ((p.y - photo.cropRect.y * scale) + Number(photo.image.attr('y')) * (scale - 1));

            // Store image's SVG-space width into result array for future calc
            result.photo[photo.name].options.mobile_width = photo.image.attr('width');
        }

        var link = photo.image.attr('xlink:href');

        // Fill result array with final photo editing data
        result.photo[photo.name].matrix = (photo.is_edited || !editPage.card.plugin) ? matrix.a + "," + matrix.b + "," + matrix.c + "," + matrix.d + "," + matrix.e + "," + matrix.f : '';
        result.photo[photo.name].link = link.search('file://') === 0 ? (photo.remote_link ? photo.remote_link : 'local') : link;
    });

    return JSON.stringify(result);
};
